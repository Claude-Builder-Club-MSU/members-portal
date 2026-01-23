// supabase/functions/process-application-update/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SLACK_JOIN_LINK = Deno.env.get('SLACK_JOIN_LINK')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApplicationUpdatePayload {
    application_id: string
    status: 'accepted' | 'rejected'
    reviewer_id: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function sendDecisionEmail(
    email: string,
    fullName: string,
    applicationType: string,
    boardPosition: string | null,
    status: 'accepted' | 'rejected',
    hasSlackAccount: boolean
): Promise<void> {
    const subject = getEmailSubject(applicationType, boardPosition)
    const html = getEmailHtml(fullName, applicationType, boardPosition, status, hasSlackAccount)

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'Claude Builder Club <noreply@claudemsu.dev>',
            to: email,
            subject: subject,
            html: html
        })
    })

    if (!response.ok) {
        const errorData = await response.text()
        console.warn(`⚠️ Email sending failed for ${email}:`, errorData)
    }
}

function getEmailSubject(
    type: string,
    position: string | null,
): string {
    switch (type) {
        case 'board':
            return `Board Application Update - ${position || 'Board Member'}`
        case 'project':
            return 'Project Application Update'
        case 'class':
            return 'Class Application Update'
        default:
            return 'Application Update'
    }
}

function getEmailHtml(
    fullName: string,
    applicationType: string,
    boardPosition: string | null,
    status: 'accepted' | 'rejected',
    hasSlackAccount: boolean // <--- New Parameter
): string {
    const target = getApplicationTarget(applicationType, boardPosition)
    const accepted = status === 'accepted'

    // Logic for the Slack Section based on if they are already on it
    const slackSection = hasSlackAccount
        ? `<li style="margin: 10px 0;"><strong>Slack:</strong> Look out for an invitation to the specific ${applicationType} channel coming soon!</li>`
        : `<li style="margin: 10px 0;"><strong>Join Slack:</strong> This is where we communicate. Please join using the button below.</li>`

    const slackButton = !hasSlackAccount
        ? `<div style="text-align: center; margin-top: 15px; margin-bottom: 15px;">
             <a href="${SLACK_JOIN_LINK}"
                style="display: inline-block; background: #4A154B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
               Join Slack Workspace
             </a>
           </div>`
        : ''

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, rgb(223, 115, 83) 0%, rgb(223, 115, 83) 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">
      Application Update
    </h1>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${fullName},</p>

    ${accepted
            ? `<p style="font-size: 16px;">
          We're excited to inform you that your application to <strong>${target}</strong> has been accepted!
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: rgb(223, 115, 83);">Next Steps:</h3>
          <ul style="padding-left: 20px;">
            ${slackSection}
            <li style="margin: 10px 0;">Log in to the members portal to access your dashboard</li>
            <li style="margin: 10px 0;">Attend our next meeting to meet the team</li>
          </ul>
        </div>

        ${slackButton}

        <div style="text-align: center; margin-top: 15px;">
          <a href="https://members.claudemsu.dev/dashboard"
             style="display: inline-block; background: rgb(223, 115, 83); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Go to Dashboard
          </a>
        </div>`
            : `<p style="font-size: 16px;">
          Thank you for your application to <strong>${target}</strong>. After careful review, we've decided not to move forward at this time.
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: rgb(223, 115, 83);">Stay Involved:</h3>
          <ul style="padding-left: 20px;">
            <li style="margin: 10px 0;">We encourage you to stay active in Claude Builder Club events</li>
            <li style="margin: 10px 0;">You're welcome to apply again in a future semester</li>
          </ul>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://members.claudemsu.dev/applications"
             style="display: inline-block; background: rgb(223, 115, 83); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Applications
          </a>
        </div>`
        }

    <p style="margin-top: 30px; font-size: 14px; color: #666; border-top: 1px solid #e0e0e0; padding-top: 20px;">
      Questions? Reply to this email or reach out on Slack!<br>
      <strong>Claude Builder Club @ MSU</strong>
    </p>
  </div>
</body>
</html>
  `
}

function getApplicationTarget(type: string, position: string | null): string {
    switch (type) {
        case 'board':
            return position || 'Board Position'
        case 'project':
            return 'the project'
        case 'class':
            return 'the class'
        default:
            return 'Claude Builder Club'
    }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Track what we've changed for rollback
    const rollbackActions: (() => Promise<void>)[] = []

    try {
        const payload: ApplicationUpdatePayload = await req.json()

        // ========================================================================
        // STEP 1: Load application and profile data
        // ========================================================================
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
            .select('email, full_name, slack_user_id') // <--- Added slack_user_id
            .eq('id', application.user_id)
            .single()

        if (profileError || !profile) {
            throw new Error(`Profile not found: ${profileError?.message ?? 'no_row'}`)
        }

        const userEmail = profile.email
        const userName = profile.full_name || application.full_name
        const hasSlackAccount = !!profile.slack_user_id // <--- Check for existence

        // Save original values for rollback
        const originalStatus = application.status
        const originalReviewedBy = application.reviewed_by
        const originalReviewedAt = application.reviewed_at

        // ========================================================================
        // STEP 2: Update application status (CRITICAL - must succeed)
        // ========================================================================
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: payload.status,
                reviewed_by: payload.reviewer_id,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', payload.application_id)

        if (updateError) {
            throw new Error(`Failed to update application: ${updateError.message}`)
        }

        // Add rollback for application status
        rollbackActions.push(async () => {
            await supabase
                .from('applications')
                .update({
                    status: originalStatus,
                    reviewed_by: originalReviewedBy,
                    reviewed_at: originalReviewedAt,
                })
                .eq('id', payload.application_id)
        })

        // ========================================================================
        // STEP 3: For ACCEPTED applications only - upgrade role if needed
        // ========================================================================
        if (payload.status === 'accepted') {
            const { data: currentRole } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', application.user_id)
                .single()

            const isProspect = currentRole?.role === 'prospect'
            const needsRoleUpgrade =
                isProspect &&
                (application.application_type === 'project' || application.application_type === 'class')

            if (needsRoleUpgrade) {
                const { error: roleError } = await supabase
                    .from('user_roles')
                    .update({ role: 'member' })
                    .eq('user_id', application.user_id)

                if (roleError) {
                    throw new Error(`Failed to upgrade role: ${roleError.message}`)
                }

                // Add rollback for role upgrade
                rollbackActions.push(async () => {
                    await supabase
                        .from('user_roles')
                        .update({ role: 'prospect' })
                        .eq('user_id', application.user_id)
                })
            }

            // ======================================================================
            // STEP 4: Add to project/class (CRITICAL - must succeed)
            // ======================================================================
            if (application.application_type === 'project' && application.project_id) {
                // Check if already a member (idempotent)
                const { data: existingMember } = await supabase
                    .from('project_members')
                    .select('id')
                    .eq('project_id', application.project_id)
                    .eq('user_id', application.user_id)
                    .maybeSingle()

                if (!existingMember) {
                    const { error: memberError } = await supabase
                        .from('project_members')
                        .insert({
                            project_id: application.project_id,
                            user_id: application.user_id,
                            role: application.project_role || 'member'
                        })

                    if (memberError) {
                        throw new Error(`Failed to add to project: ${memberError.message}`)
                    }

                    // Add rollback for project membership
                    rollbackActions.push(async () => {
                        await supabase
                            .from('project_members')
                            .delete()
                            .eq('project_id', application.project_id)
                            .eq('user_id', application.user_id)
                    })
                }
            }

            if (application.application_type === 'class' && application.class_id) {
                // Check if already enrolled (idempotent)
                const { data: existingEnrollment } = await supabase
                    .from('class_enrollments')
                    .select('id')
                    .eq('class_id', application.class_id)
                    .eq('user_id', application.user_id)
                    .maybeSingle()

                if (!existingEnrollment) {
                    const { error: enrollError } = await supabase
                        .from('class_enrollments')
                        .insert({
                            class_id: application.class_id,
                            user_id: application.user_id,
                            role: application.class_role || 'student'
                        })

                    if (enrollError) {
                        throw new Error(`Failed to enroll in class: ${enrollError.message}`)
                    }

                    // Add rollback for class enrollment
                    rollbackActions.push(async () => {
                        await supabase
                            .from('class_enrollments')
                            .delete()
                            .eq('class_id', application.class_id)
                            .eq('user_id', application.user_id)
                    })
                }
            }
        }

        // ========================================================================
        // STEP 5: Send decision email (non-critical - don't throw on failure)
        // ========================================================================
        try {
            await sendDecisionEmail(
                userEmail,
                userName,
                application.application_type,
                application.board_position,
                payload.status,
                hasSlackAccount
            )
        } catch (emailError) {
            console.warn('⚠️ Email sending failed:', emailError)
        }

        // ========================================================================
        // SUCCESS - Clear rollback actions
        // ========================================================================

        return new Response(
            JSON.stringify({
                success: true,
                message: `Application ${payload.status} successfully`,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        // ========================================================================
        // ERROR - Execute all rollback actions
        // ========================================================================
        console.error('❌ Error during application update:', error)
        console.log(`Executing ${rollbackActions.length} rollback actions...`)

        for (const rollback of rollbackActions.reverse()) {
            try {
                await rollback()
            } catch (rollbackError) {
                console.error('Failed to execute rollback:', rollbackError)
            }
        }

        return new Response(
            JSON.stringify({
                error: error.message || 'Failed to process application update'
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})