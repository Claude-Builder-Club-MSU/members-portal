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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/database.types';

type Project = Database['public']['Tables']['projects']['Row'];

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
  const [dueDate, setDueDate] = useState<Date>();

  // Load existing project data when modal opens for editing
  useEffect(() => {
    if (open && existingProject) {
      setName(existingProject.name);
      setDescription(existingProject.description || '');
      setGithubUrl(existingProject.github_url);
      setClientName(existingProject.client_name || '');

      // Convert timestamp to Date object for calendar
      if (existingProject.due_date) {
        setDueDate(new Date(existingProject.due_date));
      } else {
        setDueDate(undefined);
      }
    } else if (open && !existingProject) {
      // Reset form for new project
      setName('');
      setDescription('');
      setGithubUrl('');
      setClientName('');
      setDueDate(undefined);
    }
  }, [open, existingProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Convert date to ISO string at noon UTC to avoid timezone issues
      let dueDateTimestamp = null;
      if (dueDate) {
        const date = new Date(dueDate);
        date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        dueDateTimestamp = date.toISOString();
      }

      if (existingProject) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            name,
            description: description || null,
            github_url: githubUrl,
            client_name: clientName || null,
            due_date: dueDateTimestamp,
          })
          .eq('id', existingProject.id);

        if (error) throw error;

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
          due_date: dueDateTimestamp,
          created_by: user.id,
        };

        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .insert(insertData)
          .select()
          .single();

        if (projectError) throw projectError;

        // Add creator as project lead
        const { error: memberError } = await supabase
          .from('project_members')
          .insert({
            user_id: user.id,
            project_id: projectData.id,
            role: 'lead',
          });

        if (memberError) throw memberError;

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

          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : existingProject ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};