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
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/database.types';

type Class = Database['public']['Tables']['classes']['Row'];

interface ClassModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingClass?: Class | null;
}

export const ClassModal = ({ open, onClose, onSuccess, existingClass }: ClassModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [schedule, setSchedule] = useState('');

  // Load existing class data when modal opens for editing
  useEffect(() => {
    if (open && existingClass) {
      setName(existingClass.name);
      setDescription(existingClass.description || '');
      setLocation(existingClass.location || '');
      setSchedule(existingClass.schedule || '');
    } else if (open && !existingClass) {
      // Reset form for new class
      setName('');
      setDescription('');
      setLocation('');
      setSchedule('');
    }
  }, [open, existingClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      if (existingClass) {
        // Update existing class
        const { error } = await supabase
          .from('classes')
          .update({
            name,
            description: description || null,
            location: location || null,
            schedule: schedule || null,
          })
          .eq('id', existingClass.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Class updated successfully!',
        });
      } else {
        // Create new class
        const insertData: Database['public']['Tables']['classes']['Insert'] = {
          name,
          description: description || null,
          location: location || null,
          schedule: schedule || null,
          created_by: user.id,
        };

        const { error } = await supabase
          .from('classes')
          .insert(insertData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Class created successfully!',
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
      <DialogContent className={`${isMobile ? 'max-w-[calc(100vw-2rem)]' : 'max-w-2xl'} rounded-xl`}>
        <DialogHeader>
          <DialogTitle>{existingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
          <DialogDescription>
            {existingClass ? 'Update class details' : 'Add a new class to the club'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Class Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Introduction to Machine Learning"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Brief description of the class..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Engineering Building Room 101"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule</Label>
            <Input
              id="schedule"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="Tuesdays & Thursdays 6:00 PM - 7:30 PM"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : existingClass ? 'Update Class' : 'Create Class'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};