import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Plus, Calendar as CalendarIcon, MapPin, Users, Trophy, Eye, Edit, QrCode, Clock, MailCheck, X, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import QRCodeLib from 'qrcode';
import type { Database } from '@/integrations/supabase/database.types';

type AppRole = Database['public']['Enums']['app_role'];
type Event = Database['public']['Tables']['events']['Row'];

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
  const { role, isBoardOrAbove, userEvents, eventsLoading, refreshEvents } = useProfile();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  // Combine and sort all events with grace period
  // Include events from the past 12 hours (grace period) plus future events
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const events = ((userEvents?.attending ?? []).concat(userEvents?.notAttending ?? []))
    .slice()
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .filter(event => new Date(event.event_date) >= twelveHoursAgo); // Events from past 12 hours + future
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  // Recurring event state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'after' | 'on'>('after');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date>();
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(5);
  const [recurrenceEndCalendarOpen, setRecurrenceEndCalendarOpen] = useState(false);

  const modalState = useModalState<Event>();

  // Query for attendance data for current user
  const { data: userAttendanceData } = useQuery({
    queryKey: ['user-event-attendance', user?.id],
    queryFn: async () => {
      if (!user || !userEvents) return {};

      const allEventIds = [
        ...(userEvents.attending?.map(e => e.id) || []),
        ...(userEvents.notAttending?.map(e => e.id) || [])
      ];

      if (allEventIds.length === 0) return {};

      const { data, error } = await supabase
        .from('event_attendance')
        .select('event_id, rsvped_at, attended_at')
        .eq('user_id', user.id)
        .in('event_id', allEventIds);

      if (error) throw error;

      // Create a map of event_id -> attendance data
      const attendanceMap: Record<string, { rsvped_at: string | null; attended_at: string | null }> = {};
      data?.forEach(attendance => {
        attendanceMap[attendance.event_id] = {
          rsvped_at: attendance.rsvped_at,
          attended_at: attendance.attended_at
        };
      });

      return attendanceMap;
    },
    enabled: !!userEvents && !!user,
    staleTime: 1000 * 60 * 1, // 1 minute - more frequent updates for user actions
    gcTime: 1000 * 60 * 5,
  });

  // Query for attendance counts for all visible events
  const { data: attendanceCounts } = useQuery({
    queryKey: ['event-attendance-counts', user?.id, role],
    queryFn: async () => {
      if (!userEvents || (!userEvents.attending?.length && !userEvents.notAttending?.length)) return {};

      const allEventIds = [
        ...(userEvents.attending?.map(e => e.id) || []),
        ...(userEvents.notAttending?.map(e => e.id) || [])
      ];

      if (allEventIds.length === 0) return {};

      const { data, error } = await supabase
        .from('event_attendance')
        .select('event_id')
        .in('event_id', allEventIds)
        .not('rsvped_at', 'is', null);

      if (error) throw error;

      // Count RSVPs per event
      const counts: Record<string, number> = {};
      data?.forEach(attendance => {
        counts[attendance.event_id] = (counts[attendance.event_id] || 0) + 1;
      });

      return counts;
    },
    enabled: !!userEvents && !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,
  });

  // Events are now loaded via ProfileContext

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
      // Reset recurring event fields when editing (recurring options are hidden)
      setIsRecurring(false);
      setRecurrenceFrequency('weekly');
      setRecurrenceInterval(1);
      setRecurrenceEndType('after');
      setRecurrenceEndDate(undefined);
      setRecurrenceOccurrences(5);
    } else if (isCreateModalOpen) {
      // Reset form for creating new event
      setName('');
      setDescription('');
      setLocation('');
      setDate(undefined);
      setEventTime('');
      setPoints(0);
      setMaxAttendance(50);
      setRsvpRequired(false);
      setInviteProspects(false);
      // Reset recurring event fields
      setIsRecurring(false);
      setRecurrenceFrequency('weekly');
      setRecurrenceInterval(1);
      setRecurrenceEndType('after');
      setRecurrenceEndDate(undefined);
      setRecurrenceOccurrences(5);
    }
  }, [modalState.modalType, modalState.selectedItem, isCreateModalOpen]);


  const getAllowedRoles = (): AppRole[] => {
    if (rsvpRequired) return ['member', 'board', 'e-board'];
    if (inviteProspects) return ['prospect', 'member', 'board', 'e-board'];
    return ['member', 'board', 'e-board'];
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate required fields
    if (!name.trim()) {
      toast({
        title: 'Required Field Missing',
        description: 'Please enter an event name',
        variant: 'destructive',
      });
      return;
    }

    if (!date) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select a date',
        variant: 'destructive',
      });
      return;
    }

    if (!eventTime) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select a time',
        variant: 'destructive',
      });
      return;
    }

    if (!location.trim()) {
      toast({
        title: 'Required Field Missing',
        description: 'Please enter a location',
        variant: 'destructive',
      });
      return;
    }

    if (points < 0) {
      toast({
        title: 'Invalid Value',
        description: 'Points cannot be negative',
        variant: 'destructive',
      });
      return;
    }

    if (rsvpRequired && maxAttendance < 1) {
      toast({
        title: 'Invalid Value',
        description: 'Max attendance must be at least 1 when RSVP is required',
        variant: 'destructive',
      });
      return;
    }

    setSaveLoading(true);

    try {
      const [hours, minutes] = eventTime.split(':');
      const baseEventDateTime = new Date(date);
      baseEventDateTime.setHours(parseInt(hours), parseInt(minutes));

      const baseEventData = {
        name,
        description: description || null,
        location: location || null,
        points,
        max_attendance: maxAttendance,
        rsvp_required: rsvpRequired,
        allowed_roles: getAllowedRoles(),
        created_by: user.id,
      };

      if (modalState.selectedItem) {
        // Update the event itself
        const eventData = {
          ...baseEventData,
          event_date: baseEventDateTime.toISOString(),
        };

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
        if (isRecurring) {
          // Create multiple recurring events
          const eventsToCreate = [];
          let currentDate = new Date(baseEventDateTime);
          let occurrencesCreated = 0;
          const maxOccurrences = recurrenceEndType === 'after' ? recurrenceOccurrences : 100; // Reasonable limit

          while (occurrencesCreated < maxOccurrences) {
            // Check if we've exceeded the end date
            if (recurrenceEndType === 'on' && recurrenceEndDate && currentDate > recurrenceEndDate) {
              break;
            }

            const eventData = {
              ...baseEventData,
              event_date: currentDate.toISOString(),
            };

            eventsToCreate.push(eventData);

            // Calculate next occurrence
            const nextDate = new Date(currentDate);
            if (recurrenceFrequency === 'daily') {
              nextDate.setDate(nextDate.getDate() + (recurrenceInterval * 1));
            } else if (recurrenceFrequency === 'weekly') {
              nextDate.setDate(nextDate.getDate() + (recurrenceInterval * 7));
            } else if (recurrenceFrequency === 'monthly') {
              nextDate.setMonth(nextDate.getMonth() + recurrenceInterval);
            }

            currentDate = nextDate;
            occurrencesCreated++;

            // Safety check to prevent infinite loops
            if (occurrencesCreated > 100) break;
          }

          const { error } = await supabase
            .from('events')
            .insert(eventsToCreate);

          if (error) throw error;

          toast({
            title: 'Success',
            description: `${eventsToCreate.length} recurring events created!`
          });
        } else {
          // Create single event
          const eventData = {
            ...baseEventData,
            event_date: baseEventDateTime.toISOString(),
          };

          const { error } = await supabase
            .from('events')
            .insert(eventData);
          if (error) throw error;
          toast({ title: 'Success', description: 'Event created!' });
        }
      }

      await refreshEvents();
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
      .from('events')
      .delete()
      .eq('id', modalState.selectedItem.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      throw error;
    }

    toast({ title: 'Success', description: 'Event deleted!' });
    await refreshEvents();
    modalState.close();
  };

  const handleRSVP = async (eventId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('event_attendance')
      .insert({
        user_id: user.id,
        event_id: eventId,
        rsvped_at: new Date().toISOString(),
      });

    if (error) return;

    await refreshEvents();
    // Invalidate attendance counts and user attendance data to refresh the UI
    queryClient.invalidateQueries({ queryKey: ['event-attendance-counts', user?.id, role] });
    queryClient.invalidateQueries({ queryKey: ['user-event-attendance', user?.id] });
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

    await refreshEvents();
    // Invalidate attendance counts and user attendance data to refresh the UI
    queryClient.invalidateQueries({ queryKey: ['event-attendance-counts', user?.id, role] });
    queryClient.invalidateQueries({ queryKey: ['user-event-attendance', user?.id] });
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
      // Use environment variable for base URL, fallback to current origin for development
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const qrUrl = `${baseUrl}/checkin/${token}`;

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
    } catch (error) {
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
    const count = attendanceCounts?.[event.id] || 0;
    return event.rsvp_required && count >= event.max_attendance;
  };

  const getEventTypeLabel = (event: Event) => {
    const now = new Date();
    const eventDate = new Date(event.event_date);
    if (eventDate <= now) return 'In Progress';

    const isOpenToProspects = event.allowed_roles.includes('prospect');
    if (isOpenToProspects) return 'Open Meeting';
    if (event.rsvp_required) return 'Closed Meeting';
    return 'Internal Meeting';
  };

  const renderEventCard = (event: Event) => {
    const isFull = isEventFull(event);
    const userAttendance = userAttendanceData?.[event.id];
    const hasRSVPed = userAttendance?.rsvped_at !== null;
    const hasAttended = userAttendance?.attended_at !== null;
    const attendanceCount = attendanceCounts?.[event.id] || 0;
    const eventHasStarted = new Date(event.event_date) <= new Date();
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

    if (!isBoardOrAbove && event.rsvp_required && role !== 'prospect' && !eventHasStarted) {
      if (hasAttended) {
        // User has already attended - show attended status
        actions.push({
          label: 'Attended',
          icon: <CheckCircle className="h-4 w-4 mr-2" />,
          onClick: () => {}, // No action needed
          variant: 'secondary' as const,
          disabled: true,
        });
      } else if (hasRSVPed) {
        // User has RSVPed but not attended - allow cancellation
        actions.push({
          label: isMobile ? 'Cancel' : 'Cancel RSVP',
          icon: <X className="h-4 w-4 mr-2" />,
          onClick: () => handleCancelRSVP(event.id),
          variant: 'destructive' as const,
          disabled: false,
        });
      } else {
        // User hasn't RSVPed - allow RSVPing
        actions.push({
          label: isFull ? 'Full' : 'RSVP',
          icon: <MailCheck className="h-4 w-4 mr-2" />,
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
    <div className="p-6 w-full">
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

      {eventsLoading ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading events...</p>
          </CardContent>
        </Card>
      ) : (events.length === 0) ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No upcoming events at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8 mt-6">
          {/* Event Cards */}
          {events.length > 0 && (
            <div>
              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
                {events.map((event) => renderEventCard(event))}
              </div>
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
        title={modalState.selectedItem ? 'Edit Event' : 'Create New Event'}
        description={modalState.selectedItem ? 'Update event details' : 'Add a new event to the calendar'}
        onSubmit={handleSubmit}
        onDelete={modalState.selectedItem ? handleDelete : undefined}
        loading={saveLoading}
        deleteItemName={modalState.selectedItem?.name}
        submitLabel={modalState.selectedItem ? 'Update Event' : 'Create Event'}
      >
        <div className="space-y-2">
          <Label htmlFor="name" required>Event Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            <Label required>Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className={cn(
                    'w-full justify-center text-left font-normal',
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
                  onSelect={(selectedDate) => {
                    setDate(selectedDate);
                    setCalendarOpen(false);
                  }}
                  className='dark:text-white'
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label required>Time</Label>
            <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className={cn(
                    'w-full justify-center text-left font-normal',
                    !eventTime && 'text-muted-foreground'
                  )}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {eventTime
                    ? TIME_OPTIONS.find((opt) => opt.value === eventTime)?.label
                    : <span>Select time</span>}
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
                      className={
                        `w-full justify-start font-normal border-2-background mb-1` +
                        (eventTime !== option.value && ' hover:bg-background hover:text-primary')
                      }
                      onClick={() => {
                        setEventTime(option.value);
                        setTimePickerOpen(false);
                      }}
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
            <Label htmlFor="location" required>Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="STEM 3202"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="points" required>Points</Label>
            <Input
              id="points"
              type="number"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>

          {rsvpRequired && (
            <div className="space-y-2">
              <Label htmlFor="maxAttendance" required>Max Attendance</Label>
              <Input
                id="maxAttendance"
                type="number"
                value={maxAttendance}
                onChange={(e) => setMaxAttendance(parseInt(e.target.value) || 50)}
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

        {!modalState.selectedItem && (
          <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
            <Label className="text-base">Recurring Event</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <label htmlFor="recurring" className="text-sm cursor-pointer">
                Make this a recurring event
              </label>
            </div>

            {isRecurring && (
              <div className="space-y-4 ml-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <select
                      id="frequency"
                      value={recurrenceFrequency}
                      onChange={(e) => setRecurrenceFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interval">Every</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="interval"
                        type="number"
                        min={1}
                        max={30}
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">
                        {recurrenceFrequency === 'daily' ? 'day(s)' :
                          recurrenceFrequency === 'weekly' ? 'week(s)' : 'month(s)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>End Recurrence</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="endAfter"
                        name="endType"
                        checked={recurrenceEndType === 'after'}
                        onChange={() => setRecurrenceEndType('after')}
                      />
                      <label htmlFor="endAfter" className="text-sm cursor-pointer">After</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="endOn"
                        name="endType"
                        checked={recurrenceEndType === 'on'}
                        onChange={() => setRecurrenceEndType('on')}
                      />
                      <label htmlFor="endOn" className="text-sm cursor-pointer">On</label>
                    </div>
                  </div>

                  {recurrenceEndType === 'after' ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={recurrenceOccurrences}
                        onChange={(e) => setRecurrenceOccurrences(parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">occurrences</span>
                    </div>
                  ) : (
                    <Popover open={recurrenceEndCalendarOpen} onOpenChange={setRecurrenceEndCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="secondary"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !recurrenceEndDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {recurrenceEndDate ? format(recurrenceEndDate, 'PPP') : <span>Pick end date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="center">
                        <Calendar
                          mode="single"
                          selected={recurrenceEndDate}
                          onSelect={(selectedDate) => {
                            setRecurrenceEndDate(selectedDate);
                            setRecurrenceEndCalendarOpen(false);
                          }}
                          disabled={(date) => date < date || date < (date || new Date())}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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
                  content: `${attendanceCounts?.[modalState.selectedItem.id] || 0} / ${modalState.selectedItem.max_attendance} RSVPs`,
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