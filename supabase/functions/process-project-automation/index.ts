import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GITHUB_ORG_PAT = Deno.env.get('GITHUB_ORG_PAT')!
const GITHUB_ORG = 'Claude-Builder-Club-MSU'
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

    // Get all projects whose start_date has been reached
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        semester_id,
        semesters!inner(code, start_date)
        repository_name,
      `)
      .lte('start_date', new Date().toISOString().split('T')[0]) // start_date <= today

    if (fetchError) throw fetchError

    if (!projects || projects.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No projects ready for automation', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    for (const project of projects) {
      try {
        // Check if team already exists in GitHub
        const teamSlug = `${project.name}-${project.semesters.code}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')

        const checkTeamResponse = await fetch(
          `https://api.github.com/orgs/${GITHUB_ORG}/teams/${teamSlug}`,
          {
            headers: {
              'Authorization': `token ${GITHUB_ORG_PAT}`,
              'Accept': 'application/vnd.github.v3+json',
            }
          }
        )

        const teamExists = checkTeamResponse.ok

        // Get project members with GitHub usernames
        const { data: members, error: membersError } = await supabase
          .from('project_members')
          .select(`
            user_id,
            role,
            profiles!inner(github_username)
          `)
          .eq('project_id', project.id)

        if (membersError) throw membersError

        if (!members || members.length === 0) {
          results.push({
            project: project.name,
            success: false,
            error: 'No members with GitHub usernames'
          })
          continue
        }

        // Find team lead
        const teamLead = members.find(m => m.role === 'lead')
        if (!teamLead || !teamLead.profiles.github_username) {
          results.push({
            project: project.name,
            success: false,
            error: 'No team lead with GitHub username'
          })
          continue
        }

        // Remove the team lead from members array so they aren't added twice
        const teamMembers = members.filter(m => m.user_id !== teamLead.user_id);

        let team

        if (!teamExists) {
          // 1. Create GitHub Team
          const teamName = `${project.name} (${project.semesters.code})`

          const createTeamResponse = await fetch(
            `https://api.github.com/orgs/${GITHUB_ORG}/teams`,
            {
              method: 'POST',
              headers: {
                'Authorization': `token ${GITHUB_ORG_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: teamName,
                description: `Project team for ${project.name} - ${project.semesters.code}`,
                privacy: 'closed',
              })
            }
          )

          if (!createTeamResponse.ok) {
            const error = await createTeamResponse.json()
            throw new Error(`Failed to create team: ${error.message}`)
          }

          team = await createTeamResponse.json()
        } else {
          team = await checkTeamResponse.json()
        }

        // 2. Add team members
        for (const member of teamMembers) {
          const username = member.profiles.github_username!

          const addMemberResponse = await fetch(
            `https://api.github.com/orgs/${GITHUB_ORG}/teams/${team.slug}/memberships/${username}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${GITHUB_ORG_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
              },
            }
          )

          if (!addMemberResponse.ok && addMemberResponse.status !== 404) {
            console.error(`Failed to add ${username} to team ${team.name}`)
          }
        }

        // Add the team lead as a maintainer of the team
        const teamLeadUsername = teamLead.profiles.github_username!

        // Add or update membership for team lead as maintainer
        const addTeamLeadResponse = await fetch(
          `https://api.github.com/orgs/${GITHUB_ORG}/teams/${team.slug}/memberships/${teamLeadUsername}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${GITHUB_ORG_PAT}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              role: 'maintainer'
            })
          }
        );

        if (!addTeamLeadResponse.ok && addTeamLeadResponse.status !== 404) {
          console.error(`Failed to add team lead ${teamLeadUsername} as maintainer to team ${team.name}`);
        }

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

        let repoAlreadyExists = false
        if (!createRepoResponse.ok) {
          const error = await createRepoResponse.json()
          if (error.message && error.message.includes('already exists')) {
            repoAlreadyExists = true
          } else {
            throw new Error(`Failed to create repo: ${error.message}`)
          }
        }

        // 4. Give team access to repository
        const addTeamToRepoResponse = await fetch(
          `https://api.github.com/orgs/${GITHUB_ORG}/teams/${team.slug}/repos/${GITHUB_ORG}/${project.repository_name}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${GITHUB_ORG_PAT}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              permission: 'push'
            })
          }
        )

        if (!addTeamToRepoResponse.ok) {
          const error = await addTeamToRepoResponse.json()
          throw new Error(`Failed to add team to repo: ${error.message}`)
        }

        // 5. Protect main branch
        const protectBranchResponse = await fetch(
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
                dismissal_restrictions: {},
                dismiss_stale_reviews: true,
                require_code_owner_reviews: false,
                required_approving_review_count: 1,
                require_last_push_approval: false,
              },
              restrictions: {
                users: [teamLead.profiles.github_username!],
                teams: [],
                apps: []
              },
              required_linear_history: false,
              allow_force_pushes: false,
              allow_deletions: false,
            })
          }
        )

        if (!protectBranchResponse.ok) {
          console.error('Failed to protect main branch, but continuing...')
        }

      } catch (error) {
        console.error(`Error processing project ${project.name}:`, error)
        results.push({
          project: project.name,
          success: false,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Processed projects',
        processed: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Process project automation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})