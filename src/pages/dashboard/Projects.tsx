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
import { ProjectModal } from '@/components/ProjectModal';
import type { Database } from '@/integrations/supabase/database.types';

type Project = Database['public']['Tables']['projects']['Row'];
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
  const isMobile = useIsMobile();
  const [projects, setProjects] = useState<ProjectWithMembers[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithMembers | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    if (user && role) {
      fetchProjects();
    }
  }, [user, role]);

  const fetchProjects = async () => {
    if (!user) return;

    setLoading(true);

    // Fetch all projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

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
    const projectsWithMembers: ProjectWithMembers[] = projectsData.map(project => {
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Active club projects</p>
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
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading projects...</p>
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No active projects at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const isMember = !!project.userMembership;
            const isLead = project.userMembership?.role === 'lead';
            const lead = project.members.find(m => m.membership.role === 'lead');

            return (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex-1">{project.name}</CardTitle>
                    {isMember && (
                      <Badge variant={isLead ? 'default' : 'secondary'}>
                        {isLead ? 'Lead' : 'Member'}
                      </Badge>
                    )}
                  </div>
                  {project.client_name && (
                    <CardDescription className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Client: {project.client_name}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {project.due_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Due: {format(new Date(project.due_date), 'MMM d, yyyy')}
                    </div>
                  )}

                  {/* Team Lead Info */}
                  {lead && (
                    <div className="flex items-center gap-2 text-sm">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span className="text-muted-foreground">Lead:</span>
                      <span className="font-medium">{lead.profile.full_name || lead.profile.email}</span>
                    </div>
                  )}

                  {/* Team Members Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{project.memberCount} {project.memberCount === 1 ? 'member' : 'members'}</span>
                      </div>
                      {isMember && project.memberCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTeam(project)}
                          className="h-7 text-xs"
                        >
                          View Team
                        </Button>
                      )}
                    </div>
                    {project.members.length > 0 && (
                      <div className="flex -space-x-2">
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

                  <div className="space-y-2 pt-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(project.github_url, '_blank')}
                    >
                      <Github className="h-4 w-4 mr-2" />
                      View on GitHub
                    </Button>

                    {canManageProjects ? (
                      <Button
                        variant="outline"
                        className="w-full"
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
                {selectedProject.due_date && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Due Date</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(selectedProject.due_date), 'MMMM d, yyyy')}
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
              </div>

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