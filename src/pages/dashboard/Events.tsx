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
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useModalState } from '@/hooks/use-modal';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DetailModal } from '@/components/modals/DetailModal';
import { EditModal } from '@/components/modals/EditModal';
import { ItemCard } from '@/components/ItemCard';
import { Plus, Calendar as CalendarIcon, MapPin, Users, Trophy, Eye, Edit, QrCode, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import QRCodeLib from 'qrcode';
import type { Database } from '@/integrations/supabase/database.types';

type Event = Database['public']['Tables']['events']['Row'];
type EventAttendance = Database['public']['Tables']['event_attendance']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute}`,
    label: `${displayHour}:${minute} ${period}`,
  };
});

const Events = () => {
  const { user } = useAuth();
  const { role, isBoardOrAbove } = useProfile();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<Event[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, EventAttendance>>(new Map());
  const [attendanceCounts, setAttendanceCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState<Date>();
  const [eventTime, setEventTime] = useState('');
  const [points, setPoints] = useState(0);
  const [maxAttendance, setMaxAttendance] = useState(50);
  const [rsvpRequired, setRsvpRequired] = useState(false);
  const [inviteProspects, setInviteProspects] = useState(false);

  const modalState = useModalState<Event>();

  useEffect(() => {
    if (user && role) {
      fetchEvents();
    }
  }, [user, role]);

  // Load form data when editing
  useEffect(() => {
    if (modalState.modalType === 'edit' && modalState.selectedItem) {
      const event = modalState.selectedItem;
      setName(event.name);
      setDescription(event.description || '');
      setLocation(event.location || '');
      const eventDateTime = new Date(event.event_date);
      setDate(eventDateTime);
      setEventTime(eventDateTime.toTimeString().slice(0, 5));
      setPoints(event.points);
      setMaxAttendance(event.max_attendance);
      setRsvpRequired(event.rsvp_required);
      setInviteProspects(event.allowed_roles.includes('prospect'));
    } else if (isCreateModalOpen) {
      // Reset form
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
  }, [modalState.modalType, modalState.selectedItem, isCreateModalOpen]);

  const fetchEvents = async () => {
    if (!user || !role) return;

    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .contains('allowed_roles', [role])
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    if (eventsError || !eventsData) {
      setLoading(false);
      return;
    }

    const { data: attendanceData } = await supabase
      .from('event_attendance')
      .select('*')
      .eq('user_id', user.id);

    const newAttendanceMap = new Map(attendanceData?.map(a => [a.event_id, a]) || []);

    const counts = new Map<string, number>();
    await Promise.all(
      eventsData.map(async (event) => {
        const { count } = await supabase
          .from('event_attendance')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);
        counts.set(event.id, count || 0);
      })
    );

    setEvents(eventsData);
    setAttendanceMap(newAttendanceMap);
    setAttendanceCounts(counts);
    setLoading(false);
  };

  const getAllowedRoles = (): AppRole[] => {
    if (rsvpRequired) return ['member', 'board', 'e-board'];
    if (inviteProspects) return ['prospect', 'member', 'board', 'e-board'];
    return ['member', 'board', 'e-board'];
  };

  const handleSubmit = async () => {
    if (!user || !date || !eventTime) return;
    setSaveLoading(true);

    try {
      const [hours, minutes] = eventTime.split(':');
      const eventDateTime = new Date(date);
      eventDateTime.setHours(parseInt(hours), parseInt(minutes));

      const eventData = {
        name,
        description: description || null,
        location: location || null,
        event_date: eventDateTime.toISOString(),
        points,
        max_attendance: maxAttendance,
        rsvp_required: rsvpRequired,
        allowed_roles: getAllowedRoles(),
      };

      if (modalState.selectedItem) {
        // Update the event itself
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', modalState.selectedItem.id);
        if (error) throw error;

        await supabase
          .from('event_qr_codes')
          .update({ points: eventData.points })
          .eq('event_id', modalState.selectedItem.id);
        // No error handling here: you can add further checks if required

        toast({ title: 'Success', description: 'Event updated!' });
      } else {
        const { error } = await supabase
          .from('events')
          .insert({ ...eventData, created_by: user.id });
        if (error) throw error;
        toast({ title: 'Success', description: 'Event created!' });
      }

      await fetchEvents();
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
      .from('events')
      .delete()
      .eq('id', modalState.selectedItem.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      throw error;
    }

    toast({ title: 'Success', description: 'Event deleted!' });
    await fetchEvents();
    modalState.close();
  };

  const handleRSVP = async (eventId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('event_attendance')
      .insert({
        user_id: user.id,
        event_id: eventId,
        attended: false,
      });

    if (error) return;

    await fetchEvents();
    toast({ title: 'Success', description: 'Your RSVP is confirmed.' });
  };

  const handleCancelRSVP = async (eventId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('event_attendance')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId);

    if (error) return;

    await fetchEvents();
    toast({ title: 'Success', description: 'Your RSVP has been cancelled.' });
  };

  const handleGenerateQR = async (event: Event) => {
    setGeneratingQR(event.id);

    try {
      const { data: existingQR } = await supabase
        .from('event_qr_codes')
        .select('qr_code_url, token')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingQR?.qr_code_url) {
        if (isMobile) {
          // On mobile, navigate to the URL instead of opening in new tab
          window.location.href = existingQR.qr_code_url;
        } else {
          window.open(existingQR.qr_code_url, '_blank');
        }
        setGeneratingQR(null);
        return;
      }

      const token = crypto.randomUUID();
      const qrUrl = `${window.location.origin}/checkin/${token}`;

      const qrCodeDataUrl = await QRCodeLib.toDataURL(qrUrl, {
        width: 512,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      const response = await fetch(qrCodeDataUrl);
      const blob = await response.blob();

      const fileName = `${event.id}_${token}.png`;
      const filePath = `qr-codes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('events')
        .getPublicUrl(filePath);

      const { error: qrError } = await supabase
        .from('event_qr_codes')
        .insert({
          event_id: event.id,
          token,
          points: event.points,
          qr_code_url: publicUrl,
        });

      if (qrError) throw qrError;

      toast({ title: 'Success', description: 'QR code generated successfully!' });
      if (isMobile) {
        // On mobile, navigate to the URL instead of opening in new tab
        window.location.href = publicUrl;
      } else {
        window.open(publicUrl, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate QR code',
        variant: 'destructive',
      });
    } finally {
      setGeneratingQR(null);
    }
  };

  const generateCalendarLinks = (event: Event) => {
    const startDate = new Date(event.event_date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const googleParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.name,
      dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
      details: event.description || '',
      location: event.location || '',
    });

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${event.name}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location || ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    return {
      google: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
      apple: () => {
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${event.name}.ics`;
        link.click();
        URL.revokeObjectURL(url);
      },
    };
  };

  const isEventFull = (event: Event) => {
    const count = attendanceCounts.get(event.id) || 0;
    return event.rsvp_required && count >= event.max_attendance;
  };

  const getEventTypeLabel = (event: Event) => {
    const isOpenToProspects = event.allowed_roles.includes('prospect');
    if (isOpenToProspects) return 'Open Meeting';
    if (event.rsvp_required) return 'Closed Meeting';
    return 'Internal Meeting';
  };

  const renderEventCard = (event: Event) => {
    const isFull = isEventFull(event);
    const userAttendance = attendanceMap.get(event.id);
    const hasRSVPed = !!userAttendance;
    const hasAttended = userAttendance?.attended || false;
    const attendanceCount = attendanceCounts.get(event.id) || 0;
    const calendarLinks = generateCalendarLinks(event);

    const badges = [
      <Badge
        key="type"
        variant={event.rsvp_required ? 'default' : 'secondary'}
        className="shrink-0 whitespace-nowrap"
      >
        {getEventTypeLabel(event)}
      </Badge>,
    ];

    const metadata = [
      {
        icon: <CalendarIcon className="h-4 w-4 group-hover:text-orange-600 transition-colors" />,
        text: format(new Date(event.event_date), isMobile ? 'MMM d, h:mm a' : 'PPP p'),
        interactive: true,
        onClick: () => { },
        render: () => (
          <Popover key="calendar-popover">
            <PopoverTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer group w-fit">
                <CalendarIcon className="h-4 w-4 group-hover:text-orange-600 transition-colors" />
                <span className="underline decoration-transparent group-hover:decoration-orange-600 group-hover:text-orange-600 transition-all">
                  {format(new Date(event.event_date), isMobile ? 'MMM d, h:mm a' : 'PPP p')}
                </span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 hover:bg-orange-50 dark:hover:bg-orange-950 hover:text-orange-600 transition-colors"
                  onClick={() => window.open(calendarLinks.google, '_blank')}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
                  </svg>
                  <span className="text-sm">Add to Google</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 hover:bg-orange-50 dark:hover:bg-orange-950 hover:text-orange-600 transition-colors"
                  onClick={() => calendarLinks.apple()}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span className="text-sm">Add to Apple</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ),
      },
      {
        icon: <MapPin className="h-4 w-4" />,
        text: event.location,
      },
    ];

    if (event.points > 0) {
      metadata.push({
        icon: <Trophy className="h-4 w-4" />,
        text: `+${event.points} points`,
      });
    }

    if (event.rsvp_required) {
      metadata.push({
        icon: <Users className="h-4 w-4" />,
        text: `${attendanceCount} / ${event.max_attendance} RSVPs`,
      });
    }

    const actions = [];

    if (!isBoardOrAbove && event.rsvp_required && role !== 'prospect') {
      if (hasRSVPed) {
        actions.push({
          label: hasAttended ? 'Attended' : (isMobile ? 'Cancel' : 'Cancel RSVP'),
          onClick: () => handleCancelRSVP(event.id),
          variant: 'destructive' as const,
          disabled: hasAttended,
        });
      } else {
        actions.push({
          label: isFull ? 'Full' : 'RSVP',
          onClick: () => handleRSVP(event.id),
          variant: 'outline' as const,
          disabled: isFull,
        });
      }
    }

    if (isBoardOrAbove) {
      actions.push({
        label: isMobile ? 'Edit' : 'Edit Details',
        onClick: () => modalState.openEdit(event),
        icon: <Edit className="h-4 w-4 mr-2" />,
        variant: 'outline' as const,
      });

      actions.push({
        label: generatingQR === event.id ? 'Generating...' : (isMobile ? 'QR Code' : 'Generate QR Code'),
        onClick: () => handleGenerateQR(event),
        icon: <QrCode className="h-4 w-4 mr-2" />,
        variant: 'default' as const,
        loading: generatingQR === event.id,
      });
    }

    if (!isBoardOrAbove) {
      actions.push({
        label: isMobile ? 'Details' : 'View Details',
        onClick: () => modalState.openDetails(event),
        icon: <Eye className="h-4 w-4 mr-2" />,
        variant: 'default' as const,
      });
    }

    return (
      <div key={event.id}>
        <ItemCard
          title={event.name}
          badges={badges}
          metadata={metadata}
          description={!isMobile ? event.description || undefined : undefined}
          actions={actions}
        />
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Events</h1>
          <p className="text-muted-foreground">Upcoming events</p>
        </div>
        {isBoardOrAbove && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading events...</p>
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No upcoming events at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))] mt-6">
          {events.map(renderEventCard)}
        </div>
      )}

      {/* EDIT MODAL */}
      <EditModal
        open={isCreateModalOpen || modalState.modalType === 'edit'}
        onClose={() => {
          setIsCreateModalOpen(false);
          modalState.close();
        }}
        title={modalState.selectedItem ? 'Edit Event' : 'Create New Event'}
        description={modalState.selectedItem ? 'Update event details' : 'Add a new event to the calendar'}
        onSubmit={handleSubmit}
        onDelete={modalState.selectedItem ? handleDelete : undefined}
        loading={saveLoading}
        deleteItemName={modalState.selectedItem?.name}
        submitLabel={modalState.selectedItem ? 'Update Event' : 'Create Event'}
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
            placeholder="Brief description..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
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
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
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
                  {eventTime
                    ? TIME_OPTIONS.find((opt) => opt.value === eventTime)?.label
                    : <span>Select time</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="center">
                <div className="p-1 h-[300px] overflow-y-scroll">
                  {TIME_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={eventTime === option.value ? 'default' : 'ghost'}
                      className="w-full justify-start font-normal mb-1"
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
                if (checked) setInviteProspects(false);
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
            Open to:{' '}
            {rsvpRequired
              ? 'members, board, and e-board only'
              : inviteProspects
                ? 'all members including prospects'
                : 'members, board, and e-board'}
          </p>
        </div>
      </EditModal>

      {/* DETAIL MODAL */}
      {modalState.selectedItem && modalState.modalType === 'details' && (
        <DetailModal
          open={modalState.isOpen}
          onClose={modalState.close}
          title={modalState.selectedItem.name}
          badges={[
            <Badge
              key="type"
              variant={modalState.selectedItem.rsvp_required ? 'default' : 'secondary'}
            >
              {getEventTypeLabel(modalState.selectedItem)}
            </Badge>,
          ]}
          sections={[
            {
              title: 'Time',
              icon: <CalendarIcon className="h-4 w-4" />,
              content: format(new Date(modalState.selectedItem.event_date), 'p'),
            },
            {
              title: 'Date',
              icon: <CalendarIcon className="h-4 w-4" />,
              content: format(new Date(modalState.selectedItem.event_date), 'PPP'),
            },
            {
              title: 'Location',
              icon: <MapPin className="h-4 w-4" />,
              content: modalState.selectedItem.location,
            },
            ...(modalState.selectedItem.points > 0
              ? [
                {
                  title: 'Points Reward',
                  icon: <Trophy className="h-4 w-4" />,
                  content: (
                    <span className="font-semibold text-primary">
                      +{modalState.selectedItem.points} points
                    </span>
                  ),
                },
              ]
              : []),
            ...(modalState.selectedItem.description
              ? [
                {
                  title: 'Description',
                  content: modalState.selectedItem.description,
                },
              ]
              : []),
            {
              title: 'Event Type',
              content: modalState.selectedItem.rsvp_required
                ? `This is a closed meeting with limited capacity (${modalState.selectedItem.max_attendance} attendees). RSVP is required.`
                : 'This is an open meeting. Members and prospects are welcome to attend.',
            },
            ...(modalState.selectedItem.rsvp_required
              ? [
                {
                  title: 'Attendance',
                  icon: <Users className="h-4 w-4" />,
                  content: `${attendanceCounts.get(modalState.selectedItem.id) || 0} / ${modalState.selectedItem.max_attendance
                    } RSVPs`,
                },
              ]
              : []),
          ]}
        />
      )}
    </div>
  );
};

export default Events;