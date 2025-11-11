import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EventModal = ({ open, onClose, onSuccess }: EventModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_date: '',
    location: '',
    rsvp_required: false,
    allowed_roles: ['prospect', 'member', 'board', 'e-board'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { error } = await supabase.from('events').insert([{
      name: formData.name,
      description: formData.description,
      event_date: formData.event_date,
      location: formData.location,
      rsvp_required: formData.rsvp_required,
      allowed_roles: formData.allowed_roles as any,
      created_by: user.id,
    }]);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Event created successfully',
      });
      onSuccess();
      onClose();
      resetForm();
    }

    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      event_date: '',
      location: '',
      rsvp_required: false,
      allowed_roles: ['prospect', 'member', 'board', 'e-board'],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="event_date">Date & Time</Label>
            <Input
              id="event_date"
              type="datetime-local"
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="rsvp_required"
              checked={formData.rsvp_required}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, rsvp_required: checked as boolean })
              }
            />
            <Label htmlFor="rsvp_required" className="font-normal cursor-pointer">
              RSVP Required
            </Label>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
