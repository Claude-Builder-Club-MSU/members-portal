import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/database.types';

type Event = Database['public']['Tables']['events']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingEvent?: Event | null;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute}`,
    label: `${displayHour}:${minute} ${period}`
  };
});

export const EventModal = ({ open, onClose, onSuccess, existingEvent }: EventModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState<Date>();
  const [eventTime, setEventTime] = useState('');
  const [points, setPoints] = useState(0);
  const [maxAttendance, setMaxAttendance] = useState(50);
  const [rsvpRequired, setRsvpRequired] = useState(false);
  const [inviteProspects, setInviteProspects] = useState(false);

  useEffect(() => {
    if (open && existingEvent) {
      setName(existingEvent.name);
      setDescription(existingEvent.description || '');
      setLocation(existingEvent.location || '');

      const eventDateTime = new Date(existingEvent.event_date);
      setDate(eventDateTime);
      const timeStr = eventDateTime.toTimeString().slice(0, 5);
      setEventTime(timeStr);

      setPoints(existingEvent.points);
      setMaxAttendance(existingEvent.max_attendance);
      setRsvpRequired(existingEvent.rsvp_required);
      setInviteProspects(existingEvent.allowed_roles.includes('prospect'));
    } else if (open && !existingEvent) {
      setName('');
      setDescription('');
      setLocation('');
      setDate(undefined);
      setEventTime('');
      setPoints(0);
      setMaxAttendance(50);
      setRsvpRequired(false);
      setInviteProspects(false);
    }
  }, [open, existingEvent]);

  const getAllowedRoles = (): AppRole[] => {
    if (rsvpRequired) {
      return ['member', 'board', 'e-board'];
    } else if (inviteProspects) {
      return ['prospect', 'member', 'board', 'e-board'];
    } else {
      return ['member', 'board', 'e-board'];
    }
  };

  const getTimeLabel = (timeValue: string) => {
    const option = TIME_OPTIONS.find(opt => opt.value === timeValue);
    return option?.label || 'Select time';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date || !eventTime) return;

    setLoading(true);

    try {
      const [hours, minutes] = eventTime.split(':');
      const eventDateTime = new Date(date);
      eventDateTime.setHours(parseInt(hours), parseInt(minutes));
      const isoDateTime = eventDateTime.toISOString();

      const allowedRoles = getAllowedRoles();

      let eventId: string;

      if (existingEvent) {
        const { error } = await supabase
          .from('events')
          .update({
            name,
            description: description || null,
            location: location || null,
            event_date: isoDateTime,
            points,
            max_attendance: maxAttendance,
            rsvp_required: rsvpRequired,
            allowed_roles: allowedRoles,
          })
          .eq('id', existingEvent.id);

        if (error) throw error;
        eventId = existingEvent.id;

        toast({
          title: 'Success',
          description: 'Event updated successfully!',
        });
      } else {
        const { data: eventData, error } = await supabase
          .from('events')
          .insert({
            name,
            description: description || null,
            location: location || null,
            event_date: isoDateTime,
            points,
            max_attendance: maxAttendance,
            rsvp_required: rsvpRequired,
            allowed_roles: allowedRoles,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (error) throw error;
        eventId = eventData.id;

        toast({
          title: 'Success',
          description: 'Event created successfully!',
        });
      }

      // Handle QR code creation/update
      const qrCodeToken = crypto.randomUUID();

      // Check if QR code already exists for this event
      const { data: existingQrCode } = await supabase
        .from('event_qr_codes')
        .select('id')
        .eq('event_id', eventId)
        .eq('active', true)
        .single();

      if (existingQrCode) {
        // Update existing QR code points
        const { error: qrError } = await supabase
          .from('event_qr_codes')
          .update({ points })
          .eq('id', existingQrCode.id);

        if (qrError) throw qrError;
      } else {
        // Create new QR code
        const { error: qrError } = await supabase
          .from('event_qr_codes')
          .insert({
            event_id: eventId,
            token: qrCodeToken,
            points,
            active: true,
          });

        if (qrError) throw qrError;
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          <DialogDescription>
            {existingEvent ? 'Update event details' : 'Add a new event to the calendar'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Workshop: Intro to AI"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of the event..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !eventTime && 'text-muted-foreground'
                    )}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {eventTime ? getTimeLabel(eventTime) : <span>Select time</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <div className="max-h-64 overflow-y-auto p-1">
                    {TIME_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant={eventTime === option.value ? 'default' : 'ghost'}
                        className="w-full justify-start font-normal"
                        onClick={() => setEventTime(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${rsvpRequired ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="EB 1234"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Points *</Label>
              <Input
                id="points"
                type="number"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                required
                min={0}
              />
            </div>

            {rsvpRequired && (
              <div className="space-y-2">
                <Label htmlFor="maxAttendance">Max Attendance *</Label>
                <Input
                  id="maxAttendance"
                  type="number"
                  value={maxAttendance}
                  onChange={(e) => setMaxAttendance(parseInt(e.target.value) || 50)}
                  required
                  min={1}
                />
              </div>
            )}
          </div>

          <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
            <Label className="text-base">Event Options</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rsvp"
                checked={rsvpRequired}
                onCheckedChange={(checked) => {
                  setRsvpRequired(checked as boolean);
                  if (checked) {
                    setInviteProspects(false);
                  }
                }}
              />
              <label htmlFor="rsvp" className="text-sm cursor-pointer">
                Require RSVP
              </label>
            </div>

            {!rsvpRequired && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inviteProspects"
                  checked={inviteProspects}
                  onCheckedChange={(checked) => setInviteProspects(checked as boolean)}
                />
                <label htmlFor="inviteProspects" className="text-sm cursor-pointer">
                  Invite Prospects
                </label>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              This event will be open to{' '}
              {rsvpRequired
                ? 'members, board, and e-board only.'
                : inviteProspects
                ? 'all members including prospects.'
                : 'members, board, and e-board.'}
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : existingEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};