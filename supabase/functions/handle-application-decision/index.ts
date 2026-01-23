// supabase/functions/handle-application-decision/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApplicationDecisionPayload {
    application_id: string
    status: 'accepted' | 'rejected'
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify User (Security Step)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const authClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await authClient.auth.getUser()
        if (userError || !user) throw new Error('Invalid user token')

        // Verify Admin Role
        const { data: roleData, error: roleError } = await authClient
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (
            roleError ||
            !roleData?.role ||
            (roleData.role !== 'board' && roleData.role !== 'e-board')
        ) {
            throw new Error('Unauthorized: Admin access required')
        }

        // 2. Initialize Admin Client for Operations
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const { application_id, status }: ApplicationDecisionPayload = await req.json()
        const reviewed_by = user.id

        // 3. Get application details
        // Note: profiles.id = applications.user_id (both reference auth.users.id)
        // Since there's no direct FK from applications to profiles, we fetch separately
        const { data: application, error: appError } = await supabaseClient
            .from('applications')
            .select(`
        *,
        projects!applications_project_id_fkey (
          id,
          name
        ),
        classes!applications_class_id_fkey (
          id,
          name
        )
      `)
            .eq('id', application_id)
            .single()

        if (appError) {
            console.error('Error fetching application:', appError)
            throw new Error(`Application not found: ${appError.message}`)
        }

        if (!application) {
            throw new Error('Application not found')
        }

        // Fetch profile separately since there's no direct FK relationship
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', application.user_id)
            .single()

        if (profileError) {
            console.error('Error fetching profile:', profileError)
            throw new Error(`Profile not found: ${profileError.message}`)
        }

        // Attach profile to application object for consistency with existing code
        application.profiles = profile

        // 4. Update application status
        const { error: updateError } = await supabaseClient
            .from('applications')
            .update({
                status,
                reviewed_by,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', application_id)

        if (updateError) throw updateError

        // 5. If accepted for project/class, upgrade prospect to member
        if (status === 'accepted' && (application.application_type === 'project' || application.application_type === 'class')) {
            // Get current role
            const { data: roleData } = await supabaseClient
                .from('user_roles')
                .select('role')
                .eq('user_id', application.user_id)
                .single()

            // Only upgrade if they're a prospect
            if (roleData?.role === 'prospect') {
                const { error: roleError } = await supabaseClient
                    .from('user_roles')
                    .update({ role: 'member' })
                    .eq('user_id', application.user_id)

                if (roleError) throw roleError

                // 6. Invite to Slack workspace
                await inviteToSlack(
                    application.profiles.email,
                    application.profiles.full_name,
                    supabaseClient
                )
            }

            // 7. Add to project/class
            if (application.application_type === 'project' && application.project_id) {
                await supabaseClient
                    .from('project_members')
                    .insert({
                        project_id: application.project_id,
                        user_id: application.user_id,
                        role: application.project_role
                    })

                // Assign to project Slack channel
                await assignToProjectChannel(
                    application.user_id,
                    application.project_id,
                    supabaseClient
                )
            } else if (application.application_type === 'class' && application.class_id) {
                await supabaseClient
                    .from('class_enrollments')
                    .insert({
                        class_id: application.class_id,
                        user_id: application.user_id,
                        role: application.class_role
                    })

                // Assign to class Slack channel
                await assignToClassChannel(
                    application.user_id,
                    application.class_id,
                    supabaseClient
                )
            }
        }

        // 8. Send email notification
        await sendDecisionEmail(
            application,
            status,
            supabaseClient
        )

        return new Response(
            JSON.stringify({
                success: true,
                message: `Application ${status} successfully`
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})

async function inviteToSlack(email: string, fullName: string, supabaseClient: any) {
    const slackBotToken = Deno.env.get('SLACK_BOT_TOKEN')

    if (!slackBotToken) {
        console.error('Slack bot token not configured')
        return
    }

    try {
        // Send Slack invite
        const response = await fetch('https://slack.com/api/admin.users.invite', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${slackBotToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                team_id: Deno.env.get('SLACK_WORKSPACE_ID'),
                channel_ids: [Deno.env.get('SLACK_GENERAL_CHANNEL_ID')], // Add to #general
                real_name: fullName
            })
        })

        const data = await response.json()

        if (!data.ok) {
            console.error('Slack invite failed:', data.error)
        }
    } catch (error) {
        console.error('Error inviting to Slack:', error)
    }
}

async function assignToProjectChannel(userId: string, projectId: string, supabaseClient: any) {
    try {
        // Get project Slack channel ID
        const { data: project } = await supabaseClient
            .from('projects')
            .select('slack_channel_id, name')
            .eq('id', projectId)
            .single()

        let channelId = project?.slack_channel_id

        if (!channelId) {
            // Create channel if it doesn't exist
            channelId = await createProjectChannel(project.name)

            // Store channel ID
            await supabaseClient
                .from('projects')
                .update({ slack_channel_id: channelId })
                .eq('id', projectId)
        }

        // Get user's Slack ID
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('slack_user_id, email')
            .eq('id', userId)
            .single()

        if (!profile?.slack_user_id) {
            // Look up Slack user ID by email
            const slackUserId = await getSlackUserByEmail(profile.email)

            // Store Slack user ID
            await supabaseClient
                .from('profiles')
                .update({ slack_user_id: slackUserId })
                .eq('id', userId)
        }

        // Add user to channel
        await addUserToChannel(
            profile.slack_user_id || await getSlackUserByEmail(profile.email),
            channelId
        )
    } catch (error) {
        console.error('Error assigning to project channel:', error)
    }
}

async function assignToClassChannel(userId: string, classId: string, supabaseClient: any) {
    try {
        // Get class Slack channel ID
        const { data: classData } = await supabaseClient
            .from('classes')
            .select('slack_channel_id, name')
            .eq('id', classId)
            .single()

        let channelId = classData?.slack_channel_id

        if (!channelId) {
            // Create channel if it doesn't exist
            channelId = await createClassChannel(classData.name)

            // Store channel ID
            await supabaseClient
                .from('classes')
                .update({ slack_channel_id: channelId })
                .eq('id', classId)
        }

        // Get user's Slack ID
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('slack_user_id, email')
            .eq('id', userId)
            .single()

        if (!profile?.slack_user_id) {
            // Look up Slack user ID by email
            const slackUserId = await getSlackUserByEmail(profile.email)

            // Store Slack user ID
            await supabaseClient
                .from('profiles')
                .update({ slack_user_id: slackUserId })
                .eq('id', userId)
        }

        // Add user to channel
        await addUserToChannel(
            profile.slack_user_id || await getSlackUserByEmail(profile.email),
            channelId
        )
    } catch (error) {
        console.error('Error assigning to class channel:', error)
    }
}

async function createProjectChannel(projectName: string): Promise<string> {
    const slackBotToken = Deno.env.get('SLACK_BOT_TOKEN')

    const response = await fetch('https://slack.com/api/conversations.create', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${slackBotToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: `project-${projectName.toLowerCase().replace(/\s+/g, '-')}`,
            is_private: false
        })
    })

    const data = await response.json()
    return data.channel.id
}

async function createClassChannel(className: string): Promise<string> {
    const slackBotToken = Deno.env.get('SLACK_BOT_TOKEN')

    const response = await fetch('https://slack.com/api/conversations.create', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${slackBotToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: `class-${className.toLowerCase().replace(/\s+/g, '-')}`,
            is_private: false
        })
    })

    const data = await response.json()
    return data.channel.id
}

async function getSlackUserByEmail(email: string): Promise<string> {
    const slackBotToken = Deno.env.get('SLACK_BOT_TOKEN')

    const response = await fetch(`https://slack.com/api/users.lookupByEmail?email=${email}`, {
        headers: {
            'Authorization': `Bearer ${slackBotToken}`
        }
    })

    const data = await response.json()
    return data.user.id
}

async function addUserToChannel(userId: string, channelId: string) {
    const slackBotToken = Deno.env.get('SLACK_BOT_TOKEN')

    await fetch('https://slack.com/api/conversations.invite', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${slackBotToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            channel: channelId,
            users: userId
        })
    })
}

async function sendDecisionEmail(application: any, status: string, supabaseClient: any) {
    const isAccepted = status === 'accepted'
    const applicantEmail = application.profiles.email
    const applicantName = application.profiles.full_name

    let subject = ''
    let body = ''

    if (application.application_type === 'board') {
        subject = `Board Application ${isAccepted ? 'Accepted' : 'Declined'} - Claude Builder Club`
        body = isAccepted
            ? `Congratulations ${applicantName}!\n\nYour application for ${application.board_position} has been accepted. Welcome to the board!\n\nBest regards,\nClaude Builder Club @ MSU`
            : `Dear ${applicantName},\n\nThank you for your interest in ${application.board_position}. After careful consideration, we have decided not to move forward with your application at this time.\n\nWe encourage you to stay involved with the club and consider applying again in the future.\n\nBest regards,\nClaude Builder Club @ MSU`
    } else if (application.application_type === 'project') {
        const projectName = application.projects?.name || 'the project'
        subject = `Project Application Update - Claude Builder Club`
        body = isAccepted
            ? `Congratulations ${applicantName}!\n\nYou have been accepted to ${projectName} as a ${application.project_role}. You'll receive an invitation to join our Slack workspace and the project channel shortly.\n\nBest regards,\nClaude Builder Club @ MSU`
            : `Dear ${applicantName},\n\nThank you for your interest in ${projectName}. After reviewing applications, we have decided not to move forward with your application at this time.\n\nWe encourage you to apply for other projects and classes in the future.\n\nBest regards,\nClaude Builder Club @ MSU`
    } else if (application.application_type === 'class') {
        const className = application.classes?.name || 'the class'
        subject = `Class Application Update - Claude Builder Club`
        body = isAccepted
            ? `Congratulations ${applicantName}!\n\nYou have been accepted to ${className} as a ${application.class_role}. You'll receive an invitation to join our Slack workspace and the class channel shortly.\n\nBest regards,\nClaude Builder Club @ MSU`
            : `Dear ${applicantName},\n\nThank you for your interest in ${className}. After reviewing applications, we have decided not to move forward with your application at this time.\n\nWe encourage you to apply for other classes and projects in the future.\n\nBest regards,\nClaude Builder Club @ MSU`
    }

    // Send email using Resend
    try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: 'Claude Builder Club <no-reply@claudemsu.dev>',
                to: [applicantEmail],
                subject,
                text: body,
            }),
        });
    } catch (error) {
        console.error('Error sending email with Resend:', error);
    }
}