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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Clock, Trash2, AlertTriangle, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/database.types';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleDelete = async () => {
    if (!existingEvent) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', existingEvent.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Event deleted successfully!',
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
      <DialogContent className={`${isMobile ? 'max-w-[calc(100vw-2rem)] max-h-[90vh]' : 'max-w-2xl'} overflow-y-auto rounded-xl`}>
        <DialogHeader>
          <DialogTitle>{existingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          <DialogDescription>
            {existingEvent ? 'Update event details' : 'Add a new event to the calendar'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className={`space-y-4 ${isMobile ? 'w-[80vw]' : ''}`}
        >
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
                    variant='secondary'
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
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
                    variant="secondary"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !eventTime && 'text-muted-foreground'
                    )}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {eventTime ? getTimeLabel(eventTime) : <span>Select time</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-64 p-0"
                  align="center"
                  onOpenAutoFocus={(e) => e.preventDefault()}
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
                    onWheel={(e) => {
                      e.stopPropagation();
                    }}
                    onTouchMove={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {TIME_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant={eventTime === option.value ? 'default' : 'ghost'}
                        className="w-full justify-start font-normal hover:bg-background hover:text-primary border-0 mb-1"
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
                placeholder="STEM 3202"
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

          <div className="flex gap-2 pt-4 flex-col w-full sm:flex-row">
            {existingEvent && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-0" />
                Delete Event
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} className={existingEvent ? "flex-1" : "flex-1"}>
              <X className="h-4 w-4 mr-0" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className={existingEvent ? "flex-1" : "flex-1"}>
              <Save className="h-4 w-4 mr-0" />
              {loading ? 'Saving...' : existingEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex w-full justify-between items-center">
              <AlertDialogTitle className="text-left">Delete Event</AlertDialogTitle>
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <AlertDialogDescription className="text-left mt-2">
              Are you sure you want to delete "{existingEvent?.name}"? This action cannot be undone and will permanently remove the event and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={`flex !justify-around ${isMobile ? 'space-y-2 flex-col-reverse' : ''}`}>
            <AlertDialogCancel
              variant='outline'
              disabled={loading}
              className={!isMobile ? 'w-[47%]' : ''}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              variant='destructive'
              className={!isMobile ? 'w-[47%]' : ''}
            >
              {loading ? 'Deleting...' : 'Delete Event'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog >
  );
};