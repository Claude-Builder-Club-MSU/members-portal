import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, type Project } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useModalState, useItemStatus, useFilteredItems } from '@/hooks/use-modal';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DetailModal } from '@/components/modals/DetailModal';
import { EditModal } from '@/components/modals/EditModal';
import { MembersListModal } from '@/components/modals/MembersListModal';
import { ItemCard } from '@/components/ItemCard';
import SemesterSelector from '@/components/SemesterSelector';
import { Plus, Github, Calendar as CalendarIcon, Users, Briefcase, Crown, Eye, Edit, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/database.types';
import type { MembershipInfo, ItemWithMembers } from '@/types/modal.types';

type Semester = Database['public']['Tables']['semesters']['Row'];

type ProjectWithMembers = ItemWithMembers<Project>;

const Projects = () => {
  const { user } = useAuth();
  const { role, isBoardOrAbove, userProjects, projectsLoading, refreshProjects } = useProfile();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [repositoryName, setRepositoryName] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [selectedLead, setSelectedLead] = useState<string>('');
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [availableLeads, setAvailableLeads] = useState<Database['public']['Tables']['profiles']['Row'][]>([]);

  const modalState = useModalState<ProjectWithMembers>();

  // Query for admin users to fetch all projects with member data
  const { data: allProjectsWithMembers, isLoading: allProjectsLoading } = useQuery({
    queryKey: ['all-projects-with-members'],
    queryFn: async () => {
      // Fetch all projects with semester data
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          semesters (
            code,
            name,
            start_date,
            end_date
          )
        `);

      if (projectsError || !projectsData) {
        throw projectsError || new Error('Failed to fetch projects');
      }

      // Fetch all project members
      const { data: membersData } = await supabase
        .from('project_members')
        .select('*');

      // Get unique user IDs from members
      const memberUserIds = [...new Set(membersData?.map(m => m.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberUserIds);

      // Filter out banned users
      const activeProfilesData = profilesData?.filter(p => !p.is_banned) || [];
      const profilesMap = new Map(activeProfilesData.map(p => [p.id, p]));

      // Transform into ProjectWithMembers
      const projectsWithMembers: ProjectWithMembers[] = (projectsData as Project[]).map(project => {
        const projectMembers = membersData?.filter(m => m.project_id === project.id) || [];
        const members: MembershipInfo[] = projectMembers
          .map(membership => ({
            id: membership.id,
            user_id: membership.user_id,
            role: membership.role,
            profile: profilesMap.get(membership.user_id)!,
          }))
          .filter(m => m.profile);

        const userMembership = members.find(m => m.user_id === user!.id);

        return {
          ...project,
          members,
          memberCount: members.length,
          userMembership,
        };
      })
        .sort((a, b) => {
          // Sort by semester start date (most recent first)
          const aStart = a.semesters?.start_date ? new Date(a.semesters.start_date) : new Date(0);
          const bStart = b.semesters?.start_date ? new Date(b.semesters.start_date) : new Date(0);
          return bStart.getTime() - aStart.getTime();
        });

      return projectsWithMembers;
    },
    enabled: !!user && !!role && isBoardOrAbove,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,
  });

  // Query to fetch member data for user's projects
  const { data: userProjectsWithMembers, isLoading: userProjectsMembersLoading } = useQuery({
    queryKey: ['user-projects-members', user?.id],
    queryFn: async () => {
      if (!userProjects) return null;

      // Get all project IDs from userProjects
      const allProjectIds = [
        ...(userProjects.inProgress || []).map(p => p.id),
        ...(userProjects.assigned || []).map(p => p.id),
        ...(userProjects.completed || []).map(p => p.id),
        ...(userProjects.available || []).map(p => p.id),
      ];

      if (allProjectIds.length === 0) return null;

      // Fetch full project data with semester info for these projects
      const { data: fullProjectsData } = await supabase
        .from('projects')
        .select(`
          *,
          semesters (
            code,
            name,
            start_date,
            end_date
          )
        `)
        .in('id', allProjectIds);

      // Fetch member data for these projects
      const { data: membersData } = await supabase
        .from('project_members')
        .select('*')
        .in('project_id', allProjectIds);

      // Get unique user IDs from members
      const memberUserIds = [...new Set(membersData?.map(m => m.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberUserIds);

      // Filter out banned users
      const activeProfilesData = profilesData?.filter(p => !p.is_banned) || [];
      const profilesMap = new Map(activeProfilesData.map(p => [p.id, p]));

      // Create a map of full project data
      const fullProjectsMap = new Map(fullProjectsData?.map(p => [p.id, p]) || []);

      // Transform userProjects into ProjectWithMembers
      const transformProjects = (projects: typeof userProjects.inProgress) => {
        return projects.map(project => {
          const fullProject = fullProjectsMap.get(project.id);
          if (!fullProject) return null;

          const projectMembers = membersData?.filter(m => m.project_id === project.id) || [];
          const members: MembershipInfo[] = projectMembers
            .map(membership => ({
              id: membership.id,
              user_id: membership.user_id,
              role: membership.role,
              profile: profilesMap.get(membership.user_id)!,
            }))
            .filter(m => m.profile);

          const userMembership = members.find(m => m.user_id === user!.id);

          return {
            ...fullProject,
            members,
            memberCount: members.length,
            userMembership,
          };
        }).filter(Boolean) as ProjectWithMembers[];
      };

      return {
        inProgress: transformProjects(userProjects.inProgress || []),
        assigned: transformProjects(userProjects.assigned || []),
        completed: transformProjects(userProjects.completed || []),
        available: transformProjects(userProjects.available || []),
      };
    },
    enabled: !!user && !!role && !isBoardOrAbove && !!userProjects,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (user && role) {
      fetchAvailableLeads();
    }
  }, [user, role]);

  // Load form data when editing
  useEffect(() => {
    if (modalState.modalType === 'edit' && modalState.selectedItem) {
      const project = modalState.selectedItem;
      setName(project.name);
      setDescription(project.description || '');
      setClientName(project.client_name || '');
      // Extract repository name from full URL
      const repoName = project.repository_name
      setRepositoryName(repoName);
      setSelectedSemester(project.semester_id ? { id: project.semester_id } as Semester : null);
      const lead = project.members.find(m => m.role === 'lead');
      setSelectedLead(lead ? lead.user_id : '');
    } else if (isCreateModalOpen) {
      // Reset form
      setName('');
      setDescription('');
      setClientName('');
      setRepositoryName('');
      setSelectedSemester(null);
      setSelectedLead('');
    }
  }, [modalState.modalType, modalState.selectedItem, isCreateModalOpen]);


  const fetchAvailableLeads = async () => {
    const { data: leadsData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_banned', false)
      .order('full_name');

    if (!error && leadsData) {
      setAvailableLeads(leadsData);
    }
  };

  // Determine which projects data to use
  const projectsData = isBoardOrAbove
    ? allProjectsWithMembers || []
    : userProjectsWithMembers
      ? [
        ...userProjectsWithMembers.inProgress,
        ...userProjectsWithMembers.assigned,
        ...userProjectsWithMembers.completed,
        ...userProjectsWithMembers.available,
      ]
      : [];

  const loading = isBoardOrAbove ? allProjectsLoading : (projectsLoading || userProjectsMembersLoading);

  const { available, inProgress, completed } = useFilteredItems(
    projectsData,
    (project, status) => {
      if (status.state === 'available') return true;
      return isBoardOrAbove || !!project.userMembership;
    }
  );

  const handleSubmit = async () => {
    if (!user) return;

    // Validate required fields
    if (!name.trim()) {
      toast({
        title: 'Required Field Missing',
        description: 'Please enter a project name',
        variant: 'destructive',
      });
      return;
    }

    if (!repositoryName.trim()) {
      toast({
        title: 'Required Field Missing',
        description: 'Please enter a GitHub repository name',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedSemester) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select a term',
        variant: 'destructive',
      });
      return;
    }

    setSaveLoading(true);

    try {
      const projectData = {
        name,
        description: description || null,
        client_name: clientName || null,
        repository_name: repositoryName,
        semester_id: selectedSemester?.id || null,
      };

      let projectId = modalState.selectedItem?.id;

      if (modalState.selectedItem) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', modalState.selectedItem.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Project updated!' });
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert({ ...projectData, created_by: user.id })
          .select('id')
          .single();
        if (error) throw error;
        projectId = data.id;
        toast({ title: 'Success', description: 'Project created!' });
      }

      // Handle lead assignment
      if (projectId) {
        // Remove existing lead if any
        await supabase
          .from('project_members')
          .delete()
          .eq('project_id', projectId)
          .eq('role', 'lead');

        // Add new lead if selected
        if (selectedLead) {
          const { error: leadError } = await supabase
            .from('project_members')
            .insert({
              project_id: projectId,
              user_id: selectedLead,
              role: 'lead'
            });
          if (leadError) throw leadError;
        }
      }

      await refreshProjects();

      // Invalidate admin projects queries if user is admin
      if (isBoardOrAbove) {
        queryClient.invalidateQueries({ queryKey: ['all-projects-with-members'] });
        queryClient.invalidateQueries({ queryKey: ['all-projects'] });
      }

      modalState.close();
      setIsCreateModalOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!modalState.selectedItem) return;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', modalState.selectedItem.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      throw error;
    }

    toast({ title: 'Success', description: 'Project deleted!' });
    await refreshProjects();

    // Invalidate admin projects queries if user is admin
    if (isBoardOrAbove) {
      queryClient.invalidateQueries({ queryKey: ['all-projects-with-members'] });
      queryClient.invalidateQueries({ queryKey: ['all-projects'] });
    }

    modalState.close();
  };

  const renderProjectCard = (project: ProjectWithMembers) => {
    const isMember = !!project.userMembership;
    const isLead = project.userMembership?.role === 'lead';
    const lead = project.members.find(m => m.role === 'lead');
    const status = useItemStatus(project);

    if (!status) return null;

    // Check if project has started (semester start date is in the past)
    const projectHasStarted = project.semesters?.start_date
      ? new Date(project.semesters.start_date) <= new Date()
      : false;

    const badges = [];
    if (isMember) {
      badges.push(
        <Badge key="member" variant={isLead ? 'default' : 'secondary'} className="shrink-0 whitespace-nowrap">
          {isLead ? 'Lead' : 'Member'}
        </Badge>
      );
    }
    badges.push(
      <Badge key="status" variant={status.variant}>
        {status.label}
      </Badge>
    );

    const metadata = [];

    if (project.semesters) {
      metadata.push({
        icon: <CalendarIcon className="h-4 w-4" />,
        text: `${project.semesters.code} - ${project.semesters.name}`,
      });
    }

    if (project.client_name) {
      metadata.push({
        icon: <Briefcase className="h-4 w-4" />,
        text: `Client: ${project.client_name}`,
      });
    }

    if (lead) {
      metadata.push({
        icon: <Crown className="h-4 w-4 text-yellow-500" />,
        text: `Lead: ${lead.profile.full_name || lead.profile.email}`,
      });
    }

    metadata.push({
      icon: <Users className="h-4 w-4 group-hover:text-orange-600 transition-colors duration-400" />,
      text: `${project.memberCount} ${project.memberCount === 1 ? 'member' : 'members'}`,
      interactive: true,
      onClick: () => modalState.openMembers(project),
    });

    const actions = [];

    if (isBoardOrAbove) {
      actions.push({
        label: 'Edit Details',
        onClick: () => modalState.openEdit(project),
        icon: <Edit className="h-4 w-4 mr-2" />,
        variant: 'outline',
      });
    }

    // Only show GitHub button if project has started
    if (projectHasStarted) {
      actions.push({
        label: 'View on GitHub',
        onClick: () => window.open(`https://github.com/Claude-Builder-Club-MSU/${project.repository_name}`, '_blank'),
        icon: <Github className="h-4 w-4 mr-2" />,
        variant: isBoardOrAbove ? 'default' : 'outline',
      });
    }

    if (!isBoardOrAbove) {
      actions.push({
        label: 'View Details',
        onClick: () => modalState.openDetails(project),
        icon: <Eye className="h-4 w-4 mr-2" />,
        variant: 'default',
      });
    }

    return (
      <ItemCard
        key={project.id}
        title={project.name}
        badges={badges}
        metadata={metadata}
        description={project.description || undefined}
        members={{
          data: project.members,
          onViewAll: () => modalState.openMembers(project),
          maxDisplay: 5,
        }}
        actions={actions}
      />
    );
  };

  return (
    <div className="p-6 w-full h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Projects</h1>
          <p className="text-muted-foreground">Club projects</p>
        </div>
        {isBoardOrAbove && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
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
      ) : available.length === 0 && inProgress.length === 0 && completed.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No projects at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-6">
          {inProgress.length > 0 && (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
              {inProgress.map(renderProjectCard)}
            </div>
          )}

          {available.length > 0 && (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
              {available.map(renderProjectCard)}
            </div>
          )}

          {completed.length > 0 && (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
              {completed.map(renderProjectCard)}
            </div>
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      <EditModal
        open={isCreateModalOpen || modalState.modalType === 'edit'}
        onClose={() => {
          setIsCreateModalOpen(false);
          modalState.close();
        }}
        title={modalState.selectedItem ? 'Edit Project' : 'Create New Project'}
        description={modalState.selectedItem ? 'Update project details' : 'Add a new project'}
        onSubmit={handleSubmit}
        onDelete={modalState.selectedItem ? handleDelete : undefined}
        loading={saveLoading}
        deleteItemName={modalState.selectedItem?.name}
        submitLabel={modalState.selectedItem ? 'Update Project' : 'Create Project'}
      >
        <div className="space-y-2">
          <Label htmlFor="name" required>Project Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="AI Chatbot"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Project description..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Claude.ai"
            />
          </div>

          <SemesterSelector
            value={selectedSemester?.id || ''}
            onSelect={setSelectedSemester}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="repositoryName" required>GitHub Repository Name</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {isMobile ? (
                "Claude-Builder-Club-MSU/"
              ) : (
                "github.com/Claude-Builder-Club-MSU/"
              )}
            </span>
            <Input
              id="repositoryName"
              value={repositoryName}
              onChange={(e) => setRepositoryName(e.target.value)}
              placeholder="project-name"
              className={isMobile ? "pl-[210px]" : "pl-[300px]"}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Project Lead</Label>
          <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                role="combobox"
                aria-expanded={leadSearchOpen}
                className="w-full justify-between"
              >
                {selectedLead
                  ? availableLeads.find((lead) => lead.id === selectedLead)?.full_name ||
                  availableLeads.find((lead) => lead.id === selectedLead)?.email ||
                  'Select lead...'
                  : 'Select lead...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-96 p-0"
              align="center"
              onOpenAutoFocus={e => e.preventDefault()}
            >
              <div
                className="p-1"
                style={{
                  height: '300px',
                  overflowY: 'scroll',
                  overflowX: 'hidden',
                  position: 'relative',
                  WebkitOverflowScrolling: 'touch'
                }}
                onWheel={e => {
                  e.stopPropagation();
                }}
                onTouchMove={e => {
                  e.stopPropagation();
                }}
              >
                <Command>
                  <CommandInput placeholder="Search leads..." />
                  <CommandList>
                    <CommandEmpty>No leads found.</CommandEmpty>
                    <CommandGroup>
                      {availableLeads.map((lead) => (
                        <CommandItem
                          key={lead.id}
                          value={`${lead.full_name || ''} ${lead.email}`}
                          onSelect={() => {
                            setSelectedLead(selectedLead === lead.id ? '' : lead.id);
                            setLeadSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedLead === lead.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{lead.full_name || 'No name'}</span>
                            <span className="text-xs">{lead.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </EditModal>

      {/* DETAIL MODAL */}
      {modalState.selectedItem && modalState.modalType === 'details' && (
        <DetailModal
          open={modalState.isOpen}
          onClose={modalState.close}
          title={modalState.selectedItem.name}
          subtitle={modalState.selectedItem.client_name ? `Client: ${modalState.selectedItem.client_name}` : undefined}
          sections={[
            ...(modalState.selectedItem.description
              ? [
                {
                  title: 'Description',
                  content: modalState.selectedItem.description,
                },
              ]
              : []),
            ...(modalState.selectedItem.semesters
              ? [
                {
                  title: 'Term',
                  icon: <CalendarIcon className="h-4 w-4" />,
                  content: `${modalState.selectedItem.semesters.code} - ${modalState.selectedItem.semesters.name}`,
                },
              ]
              : []),
            {
              title: 'Team Size',
              icon: <Users className="h-4 w-4" />,
              content: `${modalState.selectedItem.memberCount} ${modalState.selectedItem.memberCount === 1 ? 'member' : 'members'
                }`,
            },
            ...(modalState.selectedItem.semesters
              ? [
                {
                  title: 'Dates',
                  icon: <CalendarIcon className="h-4 w-4" />,
                  content: `${modalState.selectedItem.semesters.start_date
                    ? `Start: ${new Date(modalState.selectedItem.semesters.start_date).toLocaleDateString()}`
                    : ''
                    }${modalState.selectedItem.semesters.end_date
                      ? ` | End: ${new Date(modalState.selectedItem.semesters.end_date).toLocaleDateString()}`
                      : ''
                    }`,
                },
              ]
              : []),
            ...(modalState.selectedItem.members.some(m => m.role === 'lead')
              ? [
                {
                  title: 'Project Lead',
                  content: (
                    <div className="flex items-center gap-2">
                      {modalState.selectedItem.members
                        .filter(m => m.role === 'lead')
                        .map(m => (
                          <div key={m.id} className="flex items-center gap-2">
                            <span className="font-semibold">{m.profile.full_name || 'No name'}</span>
                            <span className="text-xs text-muted-foreground">{m.profile.email}</span>
                          </div>
                        ))}
                    </div>
                  ),
                },
              ]
              : []),
            ...(() => {
              // Check if project has started for GitHub access
              const projectHasStarted = modalState.selectedItem!.semesters?.start_date
                ? new Date(modalState.selectedItem!.semesters.start_date) <= new Date()
                : false;

              return projectHasStarted ? [{
                title: 'GitHub Repository',
                content: (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() =>
                      window.open(
                        `https://github.com/Claude-Builder-Club-MSU/${modalState.selectedItem!.repository_name}`,
                        '_blank'
                      )
                    }
                  >
                    <Github className="h-4 w-4 mr-2" />
                    {`Claude-Builder-Club-MSU/${modalState.selectedItem!.repository_name}`}
                  </Button>
                ),
              }] : [];
            })(),
          ]}
        />
      )}

      {/* MEMBERS MODAL */}
      {modalState.selectedItem && modalState.modalType === 'members' && (
        <MembersListModal
          open={modalState.isOpen}
          onClose={modalState.close}
          title={`${modalState.selectedItem.name} - Team Members`}
          members={modalState.selectedItem.members}
          showRole={true}
        />
      )}
    </div>
  );
};

export default Projects;