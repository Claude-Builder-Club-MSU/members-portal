// supabase/functions/process-application-update/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApplicationUpdatePayload {
    application_id: string
    status: 'accepted' | 'rejected'
    reviewer_id: string
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload: ApplicationUpdatePayload = await req.json()
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Step 0: Load application + user profile
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', payload.application_id)
            .single()

        if (appError || !application) {
            throw new Error(`Application not found: ${appError?.message ?? 'no_row'}`)
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', application.user_id)
            .single()

        if (profileError || !profile) {
            throw new Error(`Profile not found for user ${application.user_id}: ${profileError?.message ?? 'no_row'}`)
        }

        const userEmail = profile.email
        const userName = profile.full_name ?? application.full_name

        // Capture original state so we can manually roll back if any DB step fails
        const originalStatus = application.status
        const originalReviewedBy = application.reviewed_by
        const originalReviewedAt = application.reviewed_at

        const { data: currentRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', application.user_id)
            .single()

        const originalRole = currentRole?.role

        let didUpdateApplication = false
        let didUpgradeRole = false
        let didAddProjectMember = false
        let didEnrollClass = false

        try {
            // Step 1: Update application status + reviewer
            const { error: updateError } = await supabase
                .from('applications')
                .update({
                    status: payload.status,
                    reviewed_by: payload.reviewer_id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', payload.application_id)

            if (updateError) {
                throw new Error(`Failed to update application status: ${updateError.message}`)
            }
            didUpdateApplication = true

            // Step 2: For accepted project/class, check current role and upgrade if prospect
            if (payload.status === 'accepted' && (application.application_type === 'project' || application.application_type === 'class')) {
                if (currentRole?.role === 'prospect') {
                    const { error: roleError } = await supabase
                        .from('user_roles')
                        .update({ role: 'member' })
                        .eq('user_id', application.user_id)

                    if (roleError) throw new Error(`Failed to upgrade role: ${roleError.message}`)
                    didUpgradeRole = true
                }
            }

            // Step 3: For accepted applications, add to project/class if applicable (idempotent)
            if (payload.status === 'accepted' && application.application_type === 'project' && application.project_id) {
                // Check if membership already exists to avoid unique constraint errors
                const { data: existingMember, error: existingMemberError } = await supabase
                    .from('project_members')
                    .select('user_id')
                    .eq('project_id', application.project_id)
                    .eq('user_id', application.user_id)
                    .maybeSingle()

                if (existingMemberError) {
                    throw new Error(`Failed to check existing project membership: ${existingMemberError.message}`)
                }

                if (!existingMember) {
                    const { error: memberError } = await supabase
                        .from('project_members')
                        .insert({
                            project_id: application.project_id,
                            user_id: application.user_id,
                            role: application.project_role || 'member'
                        })

                    if (memberError) throw new Error(`Failed to add to project: ${memberError.message}`)
                    didAddProjectMember = true
                }
            }

            if (payload.status === 'accepted' && application.application_type === 'class' && application.class_id) {
                // Check if enrollment already exists to avoid unique constraint errors
                const { data: existingEnrollment, error: existingEnrollmentError } = await supabase
                    .from('class_enrollments')
                    .select('user_id')
                    .eq('class_id', application.class_id)
                    .eq('user_id', application.user_id)
                    .maybeSingle()

                if (existingEnrollmentError) {
                    throw new Error(`Failed to check existing class enrollment: ${existingEnrollmentError.message}`)
                }

                if (!existingEnrollment) {
                    const { error: enrollError } = await supabase
                        .from('class_enrollments')
                        .insert({
                            class_id: application.class_id,
                            user_id: application.user_id,
                            role: application.class_role || 'student'
                        })

                    if (enrollError) throw new Error(`Failed to enroll in class: ${enrollError.message}`)
                    didEnrollClass = true
                }
            }
        } catch (dbError) {
            console.error('Error during application update flow, attempting manual rollback:', dbError)

            // Best-effort manual rollback of any changes we made
            try {
                if (didAddProjectMember && application.project_id) {
                    await supabase
                        .from('project_members')
                        .delete()
                        .eq('project_id', application.project_id)
                        .eq('user_id', application.user_id)
                }

                if (didEnrollClass && application.class_id) {
                    await supabase
                        .from('class_enrollments')
                        .delete()
                        .eq('class_id', application.class_id)
                        .eq('user_id', application.user_id)
                }

                if (didUpgradeRole && originalRole) {
                    await supabase
                        .from('user_roles')
                        .update({ role: originalRole })
                        .eq('user_id', application.user_id)
                }

                if (didUpdateApplication) {
                    await supabase
                        .from('applications')
                        .update({
                            status: originalStatus,
                            reviewed_by: originalReviewedBy,
                            reviewed_at: originalReviewedAt,
                        })
                        .eq('id', payload.application_id)
                }

                console.warn('Manual rollback completed after failure in application update flow')
            } catch (rollbackError) {
                console.error('Failed to fully roll back changes after application update failure:', rollbackError)
            }

            // Re-throw so the main handler returns an error and we don't send emails
            throw dbError
        }

        // Step 4: For accepted applications, send Slack invitation
        if (payload.status === 'accepted') {
            try {
                const slackResponse = await fetch('https://slack.com/api/admin.users.invite', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        team_id: Deno.env.get('SLACK_TEAM_ID'),
                        email: userEmail,
                        real_name: userName,
                        resend: true
                    })
                })

                const slackData = await slackResponse.json()
                if (!slackData.ok) {
                    console.warn('Slack invitation failed:', slackData.error)
                }
            } catch (slackError) {
                console.warn('Slack invitation error:', slackError)
            }
        }

        // Step 5: Send decision email (accepted or rejected)
        const emailSubject = getEmailSubject(application.application_type, application.board_position, payload.status)
        const emailHtml = getEmailHtml({
            application_type: application.application_type,
            board_position: application.board_position,
            user_name: userName,
            status: payload.status,
        })

        try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'Claude Builder Club <noreply@claudemsu.org>',
                    to: userEmail,
                    subject: emailSubject,
                    html: emailHtml
                })
            })

            if (!emailResponse.ok) {
                console.warn('Email sending failed')
            }
        } catch (emailError) {
            console.warn('Email error:', emailError)
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Application decision processed successfully',
                upgraded_role: payload.status === 'accepted' && currentRole?.role === 'prospect'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error processing application acceptance:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})

function getEmailSubject(type: string, position: string | null, status: 'accepted' | 'rejected'): string {
    const base = 'Claude Builder Club';

    if (status === 'accepted') {
        switch (type) {
            case 'board':
                return `Board Application Accepted - ${position || 'Board Member'} | ${base}`;
            case 'project':
                return `Project Application Accepted | ${base}`;
            case 'class':
                return `Class Application Accepted | ${base}`;
            default:
                return `Application Accepted | ${base}`;
        }
    } else {
        switch (type) {
            case 'board':
                return `Board Application Update | ${base}`;
            case 'project':
                return `Project Application Update | ${base}`;
            case 'class':
                return `Class Application Update | ${base}`;
            default:
                return `Application Update | ${base}`;
        }
    }
}

type EmailPayload = {
    application_type: 'board' | 'project' | 'class'
    board_position: string | null
    user_name: string
    status: 'accepted' | 'rejected'
}

function getEmailHtml(payload: EmailPayload): string {
    const accepted = payload.status === 'accepted';
    const target = getApplicationTarget({
        application_type: payload.application_type,
        board_position: payload.board_position ?? undefined,
    } as any)

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application ${accepted ? 'Accepted' : 'Update'}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">
      ${accepted ? '🎉 Congratulations!' : 'Application Update'}
    </h1>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${payload.user_name},</p>

    ${accepted
            ? `<p style="font-size: 16px;">
      We're excited to inform you that your application to
      <strong>${target}</strong>
      has been accepted!
    </p>`
            : `<p style="font-size: 16px;">
      Thank you for your application to <strong>${target}</strong>. After careful review, we've decided
      not to move forward at this time.
    </p>`
        }

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
      ${accepted
            ? `<h3 style="margin-top: 0; color: #FF6B35;">Next Steps:</h3>
      <ul style="padding-left: 20px;">
        <li style="margin: 10px 0;">Check your email for a Slack invitation to join our community</li>
        <li style="margin: 10px 0;">Log in to the members portal to access your dashboard</li>
        <li style="margin: 10px 0;">Attend our next meeting to meet the team</li>
        ${payload.application_type === 'project' || payload.application_type === 'class'
                ? '<li style="margin: 10px 0;">You\'ll be added to the project/class channel when it starts</li>'
                : ''
            }
      </ul>`
            : `<h3 style="margin-top: 0; color: #FF6B35;">Stay Involved:</h3>
      <ul style="padding-left: 20px;">
        <li style="margin: 10px 0;">We encourage you to stay active in Claude Builder Club events</li>
        <li style="margin: 10px 0;">You're welcome to apply again in a future semester</li>
      </ul>`
        }
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="https://members.claudemsu.dev/applications"
         style="display: inline-block; background: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Go to Applications
      </a>
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #666; border-top: 1px solid #e0e0e0; padding-top: 20px;">
      Questions? Reply to this email or reach out on Slack!<br>
      <strong>Claude Builder Club @ MSU</strong>
    </p>
  </div>
</body>
</html>
  `
}

function getApplicationTarget(payload: { application_type: 'board' | 'project' | 'class'; board_position?: string | null }): string {
    switch (payload.application_type) {
        case 'board':
            return payload.board_position || 'Board Position'
        case 'project':
            return 'the project'
        case 'class':
            return 'the class'
        default:
            return 'Claude Builder Club'
    }
}