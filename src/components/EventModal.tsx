import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/database.types';

type AppRole = Database['public']['Enums']['app_role'];

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EventModal = ({ open, onClose, onSuccess }: EventModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [points, setPoints] = useState(0);
  const [meetingType, setMeetingType] = useState<'open' | 'closed'>('open');
  const [rsvpRequired, setRsvpRequired] = useState(false);
  const [maxAttendance, setMaxAttendance] = useState(9999);
  const [allowedRoles, setAllowedRoles] = useState<AppRole[]>([
    'prospect',
    'member',
    'board',
    'e-board',
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Combine date and time
      const eventDateTime = new Date(`${eventDate}T${eventTime}`).toISOString();

      const { error } = await supabase.from('events').insert({
        name,
        description: description || null,
        event_date: eventDateTime,
        location,
        points,
        rsvp_required: rsvpRequired,
        max_attendance: rsvpRequired ? maxAttendance : 9999,
        allowed_roles: allowedRoles,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Event created successfully!',
      });

      onSuccess();
      onClose();
      resetForm();
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

  const resetForm = () => {
    setName('');
    setDescription('');
    setEventDate('');
    setEventTime('');
    setLocation('');
    setPoints(0);
    setMeetingType('open');
    setRsvpRequired(false);
    setMaxAttendance(9999);
    setAllowedRoles(['prospect', 'member', 'board', 'e-board']);
  };

  const handleMeetingTypeChange = (value: 'open' | 'closed') => {
    setMeetingType(value);
    if (value === 'open') {
      setAllowedRoles(['prospect', 'member', 'board', 'e-board']);
      setRsvpRequired(false);
    } else {
      setAllowedRoles(['member', 'board', 'e-board']);
    }
  };

  const toggleRole = (role: AppRole) => {
    setAllowedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-[calc(100vw-2rem)]' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto rounded-xl`}>
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>Fill in the event details</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventDate">Date *</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventTime">Time *</Label>
              <Input
                id="eventTime"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">Points (for attendance)</Label>
            <Input
              id="points"
              type="number"
              min="0"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Meeting Type</Label>
            <RadioGroup value={meetingType} onValueChange={handleMeetingTypeChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="open" id="open" />
                <Label htmlFor="open" className="font-normal cursor-pointer">
                  Open Meeting (All roles can attend, no RSVP)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="closed" id="closed" />
                <Label htmlFor="closed" className="font-normal cursor-pointer">
                  Closed Meeting (Select who can attend)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {meetingType === 'closed' && (
            <>
              <div className="space-y-2">
                <Label>Allowed Roles</Label>
                <div className="space-y-2 pl-2">
                  {(['prospect', 'member', 'board', 'e-board'] as AppRole[]).map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={role}
                        checked={allowedRoles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                      />
                      <Label htmlFor={role} className="font-normal capitalize cursor-pointer">
                        {role.replace('-', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rsvpRequired"
                  checked={rsvpRequired}
                  onCheckedChange={(checked) => setRsvpRequired(checked as boolean)}
                />
                <Label htmlFor="rsvpRequired" className="font-normal cursor-pointer">
                  Require RSVP
                </Label>
              </div>

              {rsvpRequired && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="maxAttendance">Max Attendees</Label>
                  <Input
                    id="maxAttendance"
                    type="number"
                    min="1"
                    value={maxAttendance}
                    onChange={(e) => setMaxAttendance(Number(e.target.value))}
                  />
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
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