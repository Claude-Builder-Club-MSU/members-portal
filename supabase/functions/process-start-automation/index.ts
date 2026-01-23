// supabase/functions/process-start-automation/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GITHUB_ORG_PAT = Deno.env.get('GITHUB_ORG_PAT')!
const GITHUB_ORG = 'Claude-Builder-Club-MSU'
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const today = new Date().toISOString().split('T')[0]

    // Get all projects/classes whose start_date is today or has passed
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        repository_name,
        semesters!inner(code, name, start_date)
      `)
      .lte('semesters.start_date', today)

    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        semesters!inner(code, name, start_date)
      `)
      .lte('semesters.start_date', today)

    if (projectsError) throw projectsError
    if (classesError) throw classesError

    const results = []

    // Process Projects
    for (const project of projects || []) {
      try {
        console.log(`\n📦 Processing project: ${project.name}`)

        // Get project members with GitHub usernames
        const { data: members } = await supabase
          .from('project_members')
          .select(`
            user_id,
            role,
            profiles!inner(github_username, email, full_name)
          `)
          .eq('project_id', project.id)

        if (!members || members.length === 0) {
          results.push({
            type: 'project',
            name: project.name,
            success: false,
            error: 'No members found'
          })
          continue
        }

        const teamLead = members.find(m => m.role === 'lead')
        if (!teamLead?.profiles.github_username) {
          results.push({
            type: 'project',
            name: project.name,
            success: false,
            error: 'No team lead with GitHub username'
          })
          continue
        }

        // 1. Check if GitHub Team already exists (skip if it does)
        const teamSlug = `${project.name}-${project.semesters.code}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')

        const checkTeamResponse = await fetch(
          `https://api.github.com/orgs/${GITHUB_ORG}/teams/${teamSlug}`,
          {
            headers: {
              'Authorization': `token ${GITHUB_ORG_PAT}`,
              'Accept': 'application/vnd.github.v3+json',
            }
          }
        )

        if (checkTeamResponse.ok) {
          console.log('ℹ️ Project already set up, skipping...')
          results.push({
            type: 'project',
            name: project.name,
            success: true,
            skipped: true,
            reason: 'Already set up'
          })
          continue
        }

        // 2. Create GitHub Team
        const teamMembers = members.filter(m =>
          m.user_id !== teamLead.user_id && m.profiles.github_username
        )

        // 3. Add members to GitHub team
        const teamMembers = members.filter(m =>
          m.user_id !== teamLead.user_id && m.profiles.github_username
        )

        for (const member of teamMembers) {
          await fetch(
            `https://api.github.com/orgs/${GITHUB_ORG}/teams/${team.slug}/memberships/${member.profiles.github_username}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${GITHUB_ORG_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
              },
            }
          )
        }

        // 4. Add team lead as maintainer
        await fetch(
          `https://api.github.com/orgs/${GITHUB_ORG}/teams/${team.slug}/memberships/${teamLead.profiles.github_username}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${GITHUB_ORG_PAT}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'maintainer' })
          }
        )
        console.log('✅ Added team members and lead')

        // 5. Create GitHub repository
        const createRepoResponse = await fetch(
          `https://api.github.com/orgs/${GITHUB_ORG}/repos`,
          {
            method: 'POST',
            headers: {
              'Authorization': `token ${GITHUB_ORG_PAT}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: project.repository_name,
              description: `${project.name} - ${project.semesters.code}`,
              private: true,
              auto_init: true,
              has_issues: true,
              has_projects: true,
              has_wiki: false,
            })
          }
        )

        if (!createRepoResponse.ok && createRepoResponse.status !== 422) {
          throw new Error('Failed to create repository')
        }
        console.log('✅ Created GitHub repository')

        // 6. Give team access to repository
        await fetch(
          `https://api.github.com/orgs/${GITHUB_ORG}/teams/${team.slug}/repos/${GITHUB_ORG}/${project.repository_name}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${GITHUB_ORG_PAT}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ permission: 'push' })
          }
        )

        // 7. Protect main branch
        await fetch(
          `https://api.github.com/repos/${GITHUB_ORG}/${project.repository_name}/branches/main/protection`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${GITHUB_ORG_PAT}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              required_status_checks: null,
              enforce_admins: false,
              required_pull_request_reviews: {
                dismiss_stale_reviews: true,
                required_approving_review_count: 1,
              },
              restrictions: {
                users: [teamLead.profiles.github_username],
                teams: [],
                apps: []
              },
              required_linear_history: false,
              allow_force_pushes: false,
              allow_deletions: false,
            })
          }
        )
        console.log('✅ Protected main branch')

        // 8. Create Slack channel
        const channelName = `proj-${project.name}-${project.semesters.code}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .substring(0, 80)

        const createChannelResponse = await fetch('https://slack.com/api/conversations.create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: channelName,
            is_private: false
          })
        })

        const channelData = await createChannelResponse.json()
        if (!channelData.ok) {
          console.warn('⚠️ Slack channel creation failed:', channelData.error)
        } else {
          // 9. Add members to Slack channel
          const slackUserIds = await getSlackUserIds(members.map(m => m.profiles.email))

          if (slackUserIds.length > 0) {
            await fetch('https://slack.com/api/conversations.invite', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                channel: channelData.channel.id,
                users: slackUserIds.join(',')
              })
            })
            console.log('✅ Created Slack channel and added members')
          }

          // 10. Post welcome message
          await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channel: channelData.channel.id,
              text: `🚀 Welcome to ${project.name}!\n\nYour GitHub repository is ready: https://github.com/${GITHUB_ORG}/${project.repository_name}\n\nLet's build something amazing! 💪`
            })
          })
        }

        results.push({
          type: 'project',
          name: project.name,
          success: true
        })

      } catch (error) {
        console.error(`Error processing project ${project.name}:`, error)
        results.push({
          type: 'project',
          name: project.name,
          success: false,
          error: error.message
        })
      }
    }

    // Process Classes
    for (const classItem of classes || []) {
      try {
        console.log(`\n📚 Processing class: ${classItem.name}`)

        // Get class members
        const { data: members } = await supabase
          .from('class_enrollments')
          .select(`
            user_id,
            role,
            profiles!inner(email, full_name)
          `)
          .eq('class_id', classItem.id)

        if (!members || members.length === 0) {
          results.push({
            type: 'class',
            name: classItem.name,
            success: false,
            error: 'No members found'
          })
          continue
        }

        // Create Slack channel
        const channelName = `class-${classItem.name}-${classItem.semesters.code}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .substring(0, 80)

        const createChannelResponse = await fetch('https://slack.com/api/conversations.create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: channelName,
            is_private: false
          })
        })

        const channelData = await createChannelResponse.json()
        if (!channelData.ok) {
          // Check if channel already exists
          if (channelData.error === 'name_taken') {
            console.log('ℹ️ Class already set up, skipping...')
            results.push({
              type: 'class',
              name: classItem.name,
              success: true,
              skipped: true,
              reason: 'Already set up'
            })
            continue
          }
          throw new Error(`Slack channel creation failed: ${channelData.error}`)
        }

        // Add members to Slack channel
        const slackUserIds = await getSlackUserIds(members.map(m => m.profiles.email))

        if (slackUserIds.length > 0) {
          await fetch('https://slack.com/api/conversations.invite', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channel: channelData.channel.id,
              users: slackUserIds.join(',')
            })
          })
        }

        // Post welcome message
        const teacher = members.find(m => m.role === 'teacher')
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: channelData.channel.id,
            text: `📚 Welcome to ${classItem.name}!\n\n${teacher ? `Your instructor is ${teacher.profiles.full_name}` : 'Class starts soon!'}\n\nLet's learn together! 🎓`
          })
        })

        console.log('✅ Created Slack channel and added members')

        results.push({
          type: 'class',
          name: classItem.name,
          success: true
        })

      } catch (error) {
        console.error(`Error processing class ${classItem.name}:`, error)
        results.push({
          type: 'class',
          name: classItem.name,
          success: false,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Processing complete',
        processed: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Automation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Helper function to get Slack user IDs from emails
async function getSlackUserIds(emails: string[]): Promise<string[]> {
  const userIds: string[] = []

  for (const email of emails) {
    try {
      const response = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SLACK_BOT_TOKEN')}`,
        }
      })

      const data = await response.json()
      if (data.ok && data.user?.id) {
        userIds.push(data.user.id)
      }
    } catch (error) {
      console.warn(`Failed to lookup Slack user for ${email}: ${error}`)
    }
  }

  return userIds
}