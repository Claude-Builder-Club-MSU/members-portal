import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Github, Calendar, Users, Briefcase, Crown, Eye, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ProjectModal } from '@/components/modals/ProjectModal';
import type { Database } from '@/integrations/supabase/database.types';

type Project = Database['public']['Tables']['projects']['Row'] & {
  semesters: { code: string; name: string } | null;
};
type ProjectMember = Database['public']['Tables']['project_members']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProjectWithMembers extends Project {
  members: Array<{
    membership: ProjectMember;
    profile: Profile;
  }>;
  memberCount: number;
  userMembership?: ProjectMember;
}

const Projects = () => {
  const { user, role } = useAuth();
  const [projects, setProjects] = useState<ProjectWithMembers[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithMembers | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user && role) {
      fetchProjects();
    }
  }, [user, role]);

  const fetchProjects = async () => {
    if (!user) return;

    setLoading(true);

    // Fetch all projects with semester info
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        semesters (
          code,
          name
        )
      `)
      .order('start_date', { ascending: false });

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      setLoading(false);
      return;
    }

    if (!projectsData) {
      setLoading(false);
      return;
    }

    // Fetch all project members
    const { data: membersData } = await supabase
      .from('project_members')
      .select('*');

    // Fetch all profiles for members
    const memberUserIds = [...new Set(membersData?.map(m => m.user_id) || [])];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', memberUserIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    // Combine data
    const projectsWithMembers: ProjectWithMembers[] = (projectsData as Project[]).map(project => {
      const projectMembers = membersData?.filter(m => m.project_id === project.id) || [];
      const members = projectMembers
        .map(membership => ({
          membership,
          profile: profilesMap.get(membership.user_id)!,
        }))
        .filter(m => m.profile);

      const userMembership = projectMembers.find(m => m.user_id === user.id);

      return {
        ...project,
        members,
        memberCount: members.length,
        userMembership,
      };
    });

    setProjects(projectsWithMembers);
    setLoading(false);
  };

  const getProjectStatus = (project: ProjectWithMembers) => {
    const now = new Date();
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);

    if (startDate > now) return { label: 'Available', color: 'bg-green-500', state: 'available' };
    if (endDate < now) return { label: 'Completed', color: 'bg-gray-500', state: 'completed' };
    return { label: 'In Progress', color: 'bg-blue-500', state: 'in_progress' };
  };

  const handleViewDetails = (project: ProjectWithMembers) => {
    setSelectedProject(project);
    setIsDetailsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleViewTeam = (project: ProjectWithMembers) => {
    setSelectedProject(project);
    setIsTeamModalOpen(true);
  };

  const canManageProjects = role === 'e-board';
  const canSeeAll = role === 'board' || role === 'e-board';

  // Filter and group projects
  const availableProjects = projects.filter(p => {
    const status = getProjectStatus(p);
    return status.state === 'available';
  });

  const inProgressProjects = projects.filter(p => {
    const status = getProjectStatus(p);
    if (status.state !== 'in_progress') return false;
    return canSeeAll || p.userMembership;
  });

  const completedProjects = projects.filter(p => {
    const status = getProjectStatus(p);
    if (status.state !== 'completed') return false;
    return canSeeAll || p.userMembership;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderProjectCard = (project: ProjectWithMembers) => {
    const isMember = !!project.userMembership;
    const isLead = project.userMembership?.role === 'lead';
    const lead = project.members.find(m => m.membership.role === 'lead');
    const status = getProjectStatus(project);

    return (
      <Card key={project.id} className="flex flex-col h-full w-full relative">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex-1">{project.name}</CardTitle>
            <div className="flex flex-row gap-3 items-center">
              {isMember && (
                <Badge variant={isLead ? 'default' : 'secondary'} className="shrink-0 whitespace-nowrap">
                  {isLead ? 'Lead' : 'Member'}
                </Badge>
              )}
              <Badge className={`${status.color} text-white text-xs z-10`}>
                {status.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0">
          <div className="space-y-3 text-sm text-muted-foreground pt-1">
            {/* Semester Info */}
            {project.semesters && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {project.semesters.code} - {project.semesters.name}
              </div>
            )}

            {/* Client Info */}
            {project.client_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-5 pt-1">
                <Briefcase className="h-4 w-4" />
                Client: {project.client_name}
              </div>
            )}

            {/* Team Lead Info */}
            {lead && (
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="text-muted-foreground">Lead:</span>
                <span className="font-medium">{lead.profile.full_name || lead.profile.email}</span>
              </div>
            )}

            {/* Team Members Preview */}
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 cursor-pointer group w-fit">
                <Users className="h-4 w-4 group-hover:text-orange-600 transition-colors duration-400" />
                <span
                  className="underline decoration-transparent group-hover:decoration-orange-600 group-hover:text-orange-600 transition-all duration-400"
                  onClick={() => handleViewTeam(project)}
                >
                  {project.memberCount} {project.memberCount === 1 ? 'team member' : 'team members'}
                </span>
              </div>
              {project.members.length > 0 && (
                <div className="flex -space-x-2 mb-6">
                  {project.members.slice(0, 5).map(({ membership, profile }) => (
                    <Avatar key={membership.id} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={profile.profile_picture_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {profile.full_name ? getInitials(profile.full_name) : profile.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {project.members.length > 5 && (
                    <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
                      +{project.members.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {project.description && (
            <div className="text-sm text-muted-foreground flex-1 space-y-3 break-words pt-3 whitespace-pre-line">
              {project.description}
            </div>
          )}

          <div className="space-y-2 mt-4">
            {canManageProjects ? (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleEditProject(project)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleViewDetails(project)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            )}

            <Button
              variant="default"
              className="w-full"
              onClick={() => window.open(project.github_url, '_blank')}
            >
              <Github className="h-4 w-4 mr-2" />
              View on GitHub
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Projects</h1>
          <p className="text-muted-foreground">Club projects</p>
        </div>
        {canManageProjects && (
          <Button onClick={() => {
            setEditingProject(null);
            setIsModalOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading projects...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6">
          {/* In Progress Projects */}
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
            {inProgressProjects.map(renderProjectCard)}
          </div>

          {/* Available Projects */}
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
            {availableProjects.map(renderProjectCard)}
          </div>


          {/* Completed Projects */}
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
            {completedProjects.map(renderProjectCard)}
          </div>

          {/* Empty State */}
          {availableProjects.length === 0 && inProgressProjects.length === 0 && completedProjects.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No projects at this time.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ProjectModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        onSuccess={fetchProjects}
        existingProject={editingProject}
      />

      {/* Project Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProject?.name}</DialogTitle>
            {selectedProject?.client_name && (
              <DialogDescription>
                Client: {selectedProject.client_name}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-6">
              {selectedProject.description && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProject.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedProject.semesters && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Term</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {selectedProject.semesters.code} - {selectedProject.semesters.name}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Team Size</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {selectedProject.memberCount} {selectedProject.memberCount === 1 ? 'member' : 'members'}
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-2 col-span-2">
                  <h3 className="font-semibold text-sm">Dates</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {selectedProject.start_date
                      ? `Start: ${new Date(selectedProject.start_date).toLocaleDateString()}`
                      : null}
                    {selectedProject.end_date
                      ? ` | End: ${new Date(selectedProject.end_date).toLocaleDateString()}`
                      : null}
                  </div>
                </div>
              </div>

              {/* Teacher */}
              {selectedProject.members?.some(({ membership }) => membership.role === "lead") && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Teacher</h3>
                  {selectedProject.members
                    ?.filter(({ membership }) => membership.role === "lead")
                    .map(({ membership, profile }) => (
                      <div key={membership.id} className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.profile_picture_url || undefined} />
                          <AvatarFallback>
                            {profile.full_name
                              ? getInitials(profile.full_name)
                              : profile.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{profile.full_name || "No name"}</span>
                        <span className="text-xs text-muted-foreground">{profile.email}</span>
                      </div>
                    ))}
                </div>
              )}

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">GitHub Repository</h3>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(selectedProject.github_url, '_blank')}
                >
                  <Github className="h-4 w-4 mr-2" />
                  {selectedProject.github_url}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Team Members Modal */}
      <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProject?.name} - Team Members</DialogTitle>
            <DialogDescription>
              {selectedProject?.memberCount} {selectedProject?.memberCount === 1 ? 'member' : 'members'} on this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {selectedProject?.members.map(({ membership, profile }) => (
              <div
                key={membership.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.profile_picture_url || undefined} />
                  <AvatarFallback>
                    {profile.full_name ? getInitials(profile.full_name) : profile.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {profile.full_name || 'No name'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {profile.email}
                  </p>
                </div>
                <Badge variant={membership.role === 'lead' ? 'default' : 'secondary'} className="capitalize">
                  {membership.role}
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;