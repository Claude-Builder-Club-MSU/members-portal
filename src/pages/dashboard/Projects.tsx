import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useModalState, useItemStatus, useFilteredItems } from '@/hooks/use-modal';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DetailModal } from '@/components/modals/DetailModal';
import { EditModal } from '@/components/modals/EditModal';
import { MembersListModal } from '@/components/modals/MembersListModal';
import { ItemCard } from '@/components/ItemCard';
import SemesterSelector from '@/components/SemesterSelector';
import { Plus, Github, Calendar as CalendarIcon, Users, Briefcase, Crown, Eye, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/database.types';
import type { MembershipInfo, ItemWithMembers } from '@/types/modal.types';

type Project = Database['public']['Tables']['projects']['Row'] & {
  semesters: { code: string; name: string } | null;
};
type Semester = Database['public']['Tables']['semesters']['Row'];

type ProjectWithMembers = ItemWithMembers<Project>;

const Projects = () => {
  const { user } = useAuth();
  const { role, isEBoard, isBoardOrAbove } = useProfile();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [projects, setProjects] = useState<ProjectWithMembers[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [repositoryName, setRepositoryName] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const modalState = useModalState<ProjectWithMembers>();

  useEffect(() => {
    if (user && role) {
      fetchProjects();
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
      const repoUrl = project.repository_url;
      const repoName = repoUrl.split('/').pop() || '';
      setRepositoryName(repoName);
      setSelectedSemester(project.semester_id ? { id: project.semester_id } as Semester : null);
      setStartDate(project.start_date ? new Date(project.start_date) : undefined);
      setEndDate(project.end_date ? new Date(project.end_date) : undefined);
    } else if (isCreateModalOpen) {
      // Reset form
      setName('');
      setDescription('');
      setClientName('');
      setRepositoryName('');
      setSelectedSemester(null);
      setStartDate(undefined);
      setEndDate(undefined);
    }
  }, [modalState.modalType, modalState.selectedItem, isCreateModalOpen]);

  const fetchProjects = async () => {
    if (!user) return;

    setLoading(true);

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

    if (projectsError || !projectsData) {
      setLoading(false);
      return;
    }

    const { data: membersData } = await supabase
      .from('project_members')
      .select('*');

    const memberUserIds = [...new Set(membersData?.map(m => m.user_id) || [])];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', memberUserIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

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

      const userMembership = members.find(m => m.user_id === user.id);

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

  const { available, inProgress, completed } = useFilteredItems(
    projects,
    (project, status) => {
      if (status.state === 'available') return true;
      return isBoardOrAbove || !!project.userMembership;
    }
  );

  const handleSubmit = async () => {
    if (!user) return;
    setSaveLoading(true);

    try {
      const fullRepositoryUrl = `https://github.com/Claude-Builder-Club-MSU/${repositoryName}`;

      const projectData = {
        name,
        description: description || null,
        client_name: clientName || null,
        repository_url: fullRepositoryUrl,
        semester_id: selectedSemester?.id || null,
        start_date: startDate?.toISOString() || null,
        end_date: endDate?.toISOString() || null,
      };

      if (modalState.selectedItem) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', modalState.selectedItem.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Project updated!' });
      } else {
        const { error } = await supabase
          .from('projects')
          .insert({ ...projectData, created_by: user.id });
        if (error) throw error;
        toast({ title: 'Success', description: 'Project created!' });
      }

      await fetchProjects();
      modalState.close();
      setIsCreateModalOpen(false);
    } catch (error: any) {
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
    await fetchProjects();
    modalState.close();
  };

  const renderProjectCard = (project: ProjectWithMembers) => {
    const isMember = !!project.userMembership;
    const isLead = project.userMembership?.role === 'lead';
    const lead = project.members.find(m => m.role === 'lead');
    const status = useItemStatus(project);

    if (!status) return null;

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

    if (isEBoard) {
      actions.push({
        label: 'Edit Details',
        onClick: () => modalState.openEdit(project),
        icon: <Edit className="h-4 w-4 mr-2" />,
        variant: 'outline' as const,
      });
    }

    actions.push({
      label: 'View on GitHub',
      onClick: () => window.open(project.repository_url, '_blank'),
      icon: <Github className="h-4 w-4 mr-2" />,
      variant: isEBoard ? 'default' : 'outline',
    });

    if (!isEBoard) {
      actions.push({
        label: 'View Details',
        onClick: () => modalState.openDetails(project),
        icon: <Eye className="h-4 w-4 mr-2" />,
        variant: 'default' as const,
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
    <div className="p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Projects</h1>
          <p className="text-muted-foreground">Club projects</p>
        </div>
        {isEBoard && (
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
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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
              placeholder="Acme Corp"
            />
          </div>

          <SemesterSelector
            value={selectedSemester?.id || ''}
            onSelect={setSelectedSemester}
            required={false}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="repositoryName">GitHub Repository Name *</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              github.com/Claude-Builder-Club-MSU/
            </span>
            <Input
              id="repositoryName"
              value={repositoryName}
              onChange={(e) => setRepositoryName(e.target.value)}
              required
              placeholder="project-name"
              className="flex-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
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
            {
              title: 'Dates',
              icon: <CalendarIcon className="h-4 w-4" />,
              content: `${modalState.selectedItem.start_date
                  ? `Start: ${new Date(modalState.selectedItem.start_date).toLocaleDateString()}`
                  : ''
                }${modalState.selectedItem.end_date
                  ? ` | End: ${new Date(modalState.selectedItem.end_date).toLocaleDateString()}`
                  : ''
                }`,
            },
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
            {
              title: 'GitHub Repository',
              content: (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(modalState.selectedItem!.repository_url, '_blank')}
                >
                  <Github className="h-4 w-4 mr-2" />
                  {modalState.selectedItem.repository_url}
                </Button>
              ),
            },
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