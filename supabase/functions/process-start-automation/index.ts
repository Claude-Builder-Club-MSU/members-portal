// supabase/functions/process-start-automation/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const GITHUB_ORG_PAT = Deno.env.get('GITHUB_ORG_PAT')!
const GITHUB_ORG = Deno.env.get('GITHUB_ORG')!
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// GITHUB HELPERS
// ============================================================================

async function ensureGitHubTeam(name: string, description: string): Promise<string> {
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  // 1. Try to create
  const res = await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/teams`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_ORG_PAT}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name,
      description: description,
      privacy: 'closed', // visible to org members
    })
  })

  const data = await res.json()

  if (res.ok) return data.slug

  // 2. If exists, return slug
  if (data.errors?.some((e) => e.code === 'already_exists')) {
    console.log(`GitHub Team ${slug} already exists`)
    return slug
  }

  throw new Error(`Failed to create GitHub Team: ${JSON.stringify(data)}`)
}

async function addGitHubTeamMember(teamSlug: string, username: string, role: 'member' | 'maintainer') {
  await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/teams/${teamSlug}/memberships/${username}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_ORG_PAT}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role })
  })
}

async function ensureGitHubRepo(name: string, description: string, teamSlug: string): Promise<string> {
  // 1. Create Repo
  const res = await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_ORG_PAT}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name,
      description: description,
      private: true,
      auto_init: true, // Creates README
    })
  })

  const data = await res.json()

  // Ignore error if it exists, otherwise throw
  if (!res.ok && !data.errors?.some((e) => e.message === 'name already exists on this account')) {
    throw new Error(`Failed to create Repo: ${JSON.stringify(data)}`)
  }

  // 2. Add Team Permission (Push access)
  await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/teams/${teamSlug}/repos/${GITHUB_ORG}/${name}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_ORG_PAT}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ permission: 'push' })
  })

  // 3. Protect Main Branch
  await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${name}/branches/main/protection`, {
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
      restrictions: null // Or restrict to team/maintainers if needed
    })
  })

  return `https://github.com/${GITHUB_ORG}/${name}`
}

// ============================================================================
// SLACK HELPERS
// ============================================================================

async function createSlackChannel(name: string): Promise<{ id: string, created: boolean }> {
  const channelName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 80)

  const res = await fetch('https://slack.com/api/conversations.create', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: channelName, is_private: false })
  })

  const data = await res.json()

  if (data.ok) return { id: data.channel.id, created: true }

  throw new Error(`Slack Create Channel Error: ${data.error}`)
}

async function getSlackUserIds(emails: string[]): Promise<string[]> {
  const ids: string[] = []
  for (const email of emails) {
    try {
      const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
        headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}` }
      })
      const data = await res.json()
      if (data.ok && data.user?.id) ids.push(data.user.id)
    } catch (e) { console.error(`Slack lookup failed for ${email}`, e) }
  }
  return ids
}

async function inviteToSlackChannel(channelId: string, userIds: string[]) {
  if (!channelId || userIds.length === 0) return

  await fetch('https://slack.com/api/conversations.invite', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: channelId, users: userIds.join(',') })
  })
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const today = new Date().toISOString().split('T')[0]
    interface AutomationResult {
      type: 'project' | 'class'
      name: string
      error?: string
      [key: string]: unknown
    }
    const results: AutomationResult[] = []

    // 1. Fetch Projects starting today (or past/missed) that haven't been set up
    // Note: You might want to add a flag 'is_setup' to your tables to avoid re-querying forever.
    // For now we assume the date check is sufficient.
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
                id, name, repository_name, slack_channel_id,
                semesters!inner(code, start_date)
            `)
      .lte('semesters.start_date', today)
    // .is('slack_channel_id', null) // Uncomment if you want to only process ones not set up

    if (projectsError) throw projectsError

    // 2. Fetch Classes
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
                id, name, slack_channel_id,
                semesters!inner(code, start_date)
            `)
      .lte('semesters.start_date', today)
    // .is('slack_channel_id', null)

    if (classesError) throw classesError

    // ========================================================================
    // PROCESS PROJECTS
    // ========================================================================
    for (const project of projects || []) {
      try {
        console.log(`Processing Project: ${project.name}`)
        const { data: members } = await supabase
          .from('project_members')
          .select('user_id, role, profiles!inner(github_username, email, full_name)')
          .eq('project_id', project.id)

        if (!members?.length) {
          results.push({ type: 'project', name: project.name, error: 'No members' })
          continue
        }

        const lead = members.find(m => m.role === 'lead')
        if (!lead?.profiles.github_username) {
          results.push({ type: 'project', name: project.name, error: 'No Lead/GitHub' })
          continue
        }

        // A. GitHub Setup
        const teamSlug = await ensureGitHubTeam(
          `${project.name}-${project.semesters.code}`,
          `Team for ${project.name}`
        )

        // Add Lead
        await addGitHubTeamMember(teamSlug, lead.profiles.github_username, 'maintainer')

        // Add Members
        for (const m of members) {
          if (m.user_id !== lead.user_id && m.profiles.github_username) {
            await addGitHubTeamMember(teamSlug, m.profiles.github_username, 'member')
          }
        }

        // Create Repo & Protect
        const repoUrl = await ensureGitHubRepo(project.repository_name, project.name, teamSlug)

        // B. Slack Setup
        let channelId = project.slack_channel_id
        if (!channelId) {
          const ch = await createSlackChannel(`project-${project.name}`)
          channelId = ch.id
          // Save ID to DB
          await supabase.from('projects')
            .update({ slack_channel_id: channelId, repository_url: repoUrl })
            .eq('id', project.id)
        }

        // Invite Members to Slack
        if (channelId) {
          const emails = members.map(m => m.profiles.email)
          const slackIds = await getSlackUserIds(emails)
          await inviteToSlackChannel(channelId, slackIds)

          // Welcome Message
          await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: channelId,
              text: `🚀 Welcome to ${project.name}!\n\nGitHub: ${repoUrl}\n\nLet's build! 💪`
            })
          })
        }

        results.push({ type: 'project', name: project.name, status: 'success' })

      } catch (err) {
        console.error(`Error project ${project.name}:`, err)
        results.push({ type: 'project', name: project.name, error: err.message })
      }
    }

    // ========================================================================
    // PROCESS CLASSES
    // ========================================================================
    for (const cls of classes || []) {
      try {
        console.log(`Processing Class: ${cls.name}`)
        const { data: members } = await supabase
          .from('class_enrollments')
          .select('user_id, role, profiles!inner(email, full_name)')
          .eq('class_id', cls.id)

        if (!members?.length) continue

        // A. Slack Setup
        let channelId = cls.slack_channel_id
        if (!channelId) {
          const ch = await createSlackChannel(`class-${cls.name}-${projects.semesters.code}`)
          channelId = ch.id
          // Save ID to DB
          await supabase.from('classes')
            .update({ slack_channel_id: channelId })
            .eq('id', cls.id)
        }

        // B. Invite & Welcome
        if (channelId) {
          const emails = members.map(m => m.profiles.email)
          const slackIds = await getSlackUserIds(emails)
          await inviteToSlackChannel(channelId, slackIds)

          const teacher = members.find(m => m.role === 'teacher')
          await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: channelId,
              text: `📚 Welcome to ${cls.name}!\n\n${teacher ? `Instructor: ${teacher.profiles.full_name}` : ''}`
            })
          })
        }

        results.push({ type: 'class', name: cls.name, status: 'success' })

      } catch (err) {
        console.error(`Error class ${cls.name}:`, err)
        results.push({ type: 'class', name: cls.name, error: err.message })
      }
    }

    return new Response(JSON.stringify({ processed: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})