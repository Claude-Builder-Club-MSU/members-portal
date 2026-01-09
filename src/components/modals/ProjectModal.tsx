import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2, AlertTriangle } from 'lucide-react';
import SemesterSelector from '@/components/SemesterSelector';
import type { Database } from '@/integrations/supabase/database.types';

type Project = Database['public']['Tables']['projects']['Row'];
type Semester = Database['public']['Tables']['semesters']['Row'];

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingProject?: Project | null;
}

export const ProjectModal = ({ open, onClose, onSuccess, existingProject }: ProjectModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [projectLeadId, setProjectLeadId] = useState<string>('');
  const [members, setMembers] = useState<Array<{id: string, full_name: string, email: string}>>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load members list when modal opens
  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open]);

  // Load existing project data when modal opens for editing
  useEffect(() => {
    if (open && existingProject) {
      setName(existingProject.name);
      setDescription(existingProject.description || '');
      setGithubUrl(existingProject.github_url);
      setClientName(existingProject.client_name || '');

      // Load semester if exists
      if (existingProject.semester_id) {
        loadSemester(existingProject.semester_id);
      }

      // Load current project lead
      loadProjectLead();
    } else if (open && !existingProject) {
      // Reset form for new project
      setName('');
      setDescription('');
      setGithubUrl('');
      setClientName('');
      setSelectedSemester(null);
      setProjectLeadId('none');
    }
  }, [open, existingProject]);

  const loadSemester = async (semesterId: string) => {
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('id', semesterId)
        .single();

      if (error) throw error;
      setSelectedSemester(data);
    } catch (error) {
      console.error('Error loading semester:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch all user roles to filter for members, board, e-board
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Create a map of user_id to role
      const roleMap = new Map(
        rolesData?.map(r => [r.user_id, r.role]) || []
      );

      // Filter for members, board, and e-board only
      const eligibleMembers = profilesData?.filter(profile => {
        const role = roleMap.get(profile.id) || 'prospect';
        return role === 'member' || role === 'board' || role === 'e-board';
      }) || [];

      setMembers(eligibleMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const loadProjectLead = async () => {
    if (!existingProject) return;

    try {
      const { data: leadData } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', existingProject.id)
        .eq('role', 'lead')
        .single();

      if (leadData) {
        setProjectLeadId(leadData.user_id);
      }
    } catch (error) {
      console.error('Error loading project lead:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedSemester) {
      toast({
        title: 'Error',
        description: 'Please select a term for the project',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (existingProject) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            name,
            description: description || null,
            github_url: githubUrl,
            client_name: clientName || null,
            semester_id: selectedSemester.id,
            start_date: selectedSemester.start_date,
            end_date: selectedSemester.end_date,
          })
          .eq('id', existingProject.id);

        if (error) throw error;

        // Update project lead if changed
        if (projectLeadId && projectLeadId !== 'none') {
          // Remove existing leads
          await supabase
            .from('project_members')
            .delete()
            .eq('project_id', existingProject.id)
            .eq('role', 'lead');

          // Add new lead
          const { error: leadError } = await supabase
            .from('project_members')
            .insert({
              user_id: projectLeadId,
              project_id: existingProject.id,
              role: 'lead',
            });

          if (leadError) throw leadError;
        } else if (projectLeadId === 'none') {
          // Remove existing leads if "no lead assigned" is selected
          await supabase
            .from('project_members')
            .delete()
            .eq('project_id', existingProject.id)
            .eq('role', 'lead');
        }

        toast({
          title: 'Success',
          description: 'Project updated successfully!',
        });
      } else {
        // Create new project
        const insertData: Database['public']['Tables']['projects']['Insert'] = {
          name,
          description: description || null,
          github_url: githubUrl,
          client_name: clientName || null,
          semester_id: selectedSemester.id,
          start_date: selectedSemester.start_date,
          end_date: selectedSemester.end_date,
          created_by: user.id,
        };

        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .insert(insertData)
          .select()
          .single();

        if (projectError) throw projectError;

        // Add project lead if selected
        if (projectLeadId && projectLeadId !== 'none') {
          const { error: memberError } = await supabase
            .from('project_members')
            .insert({
              user_id: projectLeadId,
              project_id: projectData.id,
              role: 'lead',
            });

          if (memberError) throw memberError;
        }

        toast({
          title: 'Success',
          description: 'Project created successfully!',
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingProject) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', existingProject.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Project deleted successfully!',
      });

      onSuccess();
      onClose();
      setShowDeleteConfirm(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-[calc(100vw-2rem)]' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto rounded-xl`}>
        <DialogHeader>
          <DialogTitle>{existingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription>
            {existingProject ? 'Update project details' : 'Add a new project to the club'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="AI Chatbot Project"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Brief description of the project..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="githubUrl">GitHub Repository URL *</Label>
            <Input
              id="githubUrl"
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              required
              placeholder="https://github.com/username/repo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name (Optional)</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Company or organization name"
            />
          </div>

          <SemesterSelector
            value={selectedSemester?.id || ''}
            onSelect={setSelectedSemester}
            required
          />

          <div className="space-y-2">
            <Label>Project Lead (Optional)</Label>
            <Select value={projectLeadId} onValueChange={setProjectLeadId} disabled={!members || members.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={members && members.length > 0 ? "Select a project lead..." : "Loading members..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No lead assigned</SelectItem>
                {members?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            {existingProject && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} className={existingProject ? "flex-1" : "flex-1"}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className={existingProject ? "flex-1" : "flex-1"}>
              {loading ? 'Saving...' : existingProject ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-left">Delete Project</AlertDialogTitle>
                <AlertDialogDescription className="text-left mt-2">
                  Are you sure you want to delete "{existingProject?.name}"? This action cannot be undone and will permanently remove the project and all associated data.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {loading ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};