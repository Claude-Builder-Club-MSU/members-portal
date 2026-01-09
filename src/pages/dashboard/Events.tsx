import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Calendar, MapPin, Users, Trophy, CheckCircle, Eye, Edit, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { EventModal } from '@/components/modals/EventModal';
import QRCodeLib from 'qrcode';
import type { Database } from '@/integrations/supabase/database.types';

type Event = Database['public']['Tables']['events']['Row'];
type EventAttendance = Database['public']['Tables']['event_attendance']['Row'];

const Events = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<Event[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, EventAttendance>>(new Map());
  const [attendanceCounts, setAttendanceCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);

  useEffect(() => {
    if (user && role) {
      fetchEvents();
    }
  }, [user, role]);

  const fetchEvents = async () => {
    if (!user || !role) return;

    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .contains('allowed_roles', [role])
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      setLoading(false);
      return;
    }

    if (!eventsData) {
      setLoading(false);
      return;
    }

    const { data: attendanceData } = await supabase
      .from('event_attendance')
      .select('*')
      .eq('user_id', user.id);

    const newAttendanceMap = new Map(
      attendanceData?.map(a => [a.event_id, a]) || []
    );

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

  const handleRSVP = async (eventId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('event_attendance')
      .insert({
        user_id: user.id,
        event_id: eventId,
        attended: false,
      });

    if (error) {
      console.error('Error RSVPing to event:', error);
      return;
    }

    fetchEvents();
  };

  const handleCancelRSVP = async (eventId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('event_attendance')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error canceling RSVP:', error);
      return;
    }

    fetchEvents();
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailsModalOpen(true);
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
        window.open(existingQR.qr_code_url, '_blank');
        setGeneratingQR(null);
        return;
      }

      const token = crypto.randomUUID();
      const qrUrl = `${window.location.origin}/checkin/${token}`;

      const qrCodeDataUrl = await QRCodeLib.toDataURL(qrUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
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

      toast({
        title: 'Success',
        description: 'QR code generated successfully!',
      });

      window.open(publicUrl, '_blank');
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate QR code',
        variant: 'destructive',
      });
    } finally {
      setGeneratingQR(null);
    }
  };

  const generateGoogleCalendarLink = (event: Event) => {
    const startDate = new Date(event.event_date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.name,
      dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
      details: event.description || '',
      location: event.location || '',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const generateAppleCalendarLink = (event: Event) => {
    const startDate = new Date(event.event_date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

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

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    return URL.createObjectURL(blob);
  };

  const handleAddToAppleCalendar = (event: Event) => {
    const icsUrl = generateAppleCalendarLink(event);
    const link = document.createElement('a');
    link.href = icsUrl;
    link.download = `${event.name}.ics`;
    link.click();
    URL.revokeObjectURL(icsUrl);
  };

  const canManageEvents = role === 'board' || role === 'e-board';

  const isEventFull = (event: Event) => {
    const count = attendanceCounts.get(event.id) || 0;
    return event.rsvp_required && count >= event.max_attendance;
  };

  const getEventTypeLabel = (event: Event) => {
    const isOpenToProspects = event.allowed_roles.includes('prospect');

    if (isOpenToProspects) {
      return 'Open Meeting';
    } else if (event.rsvp_required) {
      return 'Closed Meeting';
    } else {
      return 'Internal Meeting';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Events</h1>
          <p className="text-muted-foreground">Upcoming events</p>
        </div>
        {canManageEvents && (
          <Button onClick={() => {
            setEditingEvent(null);
            setIsModalOpen(true);
          }}>
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
            <p className="text-center text-muted-foreground">
              No upcoming events at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,400px))] mt-6">
          {events.map((event) => {
            const isFull = isEventFull(event);
            const userAttendance = attendanceMap.get(event.id);
            const hasRSVPed = !!userAttendance;
            const hasAttended = userAttendance?.attended || false;
            const attendanceCount = attendanceCounts.get(event.id) || 0;

            return (
              <Card key={event.id} className="flex flex-col h-full w-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-lg flex-1">{event.name}</CardTitle>
                    <Badge variant={event.rsvp_required ? 'default' : 'secondary'} className="shrink-0 whitespace-nowrap">
                      {getEventTypeLabel(event)}
                    </Badge>
                  </div>
                  <div className="space-y-3 text-sm text-muted-foreground mt-5 pt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer group w-fit">
                          <Calendar className="h-4 w-4 group-hover:text-orange-600 transition-colors" />
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
                            onClick={() => window.open(generateGoogleCalendarLink(event), '_blank')}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
                            </svg>
                            <span className="text-sm">Add to Google</span>
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2 hover:bg-orange-50 dark:hover:bg-orange-950 hover:text-orange-600 transition-colors"
                            onClick={() => handleAddToAppleCalendar(event)}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                            </svg>
                            <span className="text-sm">Add to Apple</span>
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className={isMobile ? 'text-xs' : ''}>{event.location}</span>
                    </div>
                    {event.points > 0 && (
                      <div className="flex items-center gap-2 text-primary">
                        <Trophy className="h-4 w-4" />
                        <span>+{event.points} points</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 space-y-3">
                    {event.description && !isMobile && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                    )}

                    {event.rsvp_required && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {attendanceCount} / {event.max_attendance} RSVPs
                        </div>
                        {isFull && !hasRSVPed && (
                          <Badge variant="destructive">Full</Badge>
                        )}
                      </div>
                    )}

                    {hasRSVPed && (
                      <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                        <CheckCircle className="h-4 w-4" />
                        {hasAttended ? 'Attended' : 'RSVP Confirmed'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mt-4">
                    {!canManageEvents && (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleViewDetails(event)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {isMobile ? 'Details' : 'View Details'}
                      </Button>
                    )}

                    {!canManageEvents && event.rsvp_required && role !== 'prospect' && (
                      hasRSVPed ? (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => handleCancelRSVP(event.id)}
                          disabled={hasAttended}
                        >
                          {hasAttended ? 'Attended' : isMobile ? 'Cancel' : 'Cancel RSVP'}
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleRSVP(event.id)}
                          disabled={isFull}
                        >
                          {isFull ? 'Full' : 'RSVP'}
                        </Button>
                      )
                    )}

                    {canManageEvents && (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleEditEvent(event)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {isMobile ? 'Edit' : 'Edit Details'}
                      </Button>
                    )}

                    {canManageEvents && (
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => handleGenerateQR(event)}
                        disabled={generatingQR === event.id}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        {generatingQR === event.id ? 'Generating...' : isMobile ? 'QR Code' : 'Generate QR Code'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EventModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        onSuccess={fetchEvents}
        existingEvent={editingEvent}
      />

      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedEvent?.name}</DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={selectedEvent?.rsvp_required ? 'default' : 'secondary'}>
                {selectedEvent && getEventTypeLabel(selectedEvent)}
              </Badge>
            </div>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Date & Time</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedEvent.event_date), 'PPP p')}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Location</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {selectedEvent.location}
                  </div>
                </div>
              </div>

              {selectedEvent.points > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Points Reward</p>
                  <div className="flex items-center gap-2 text-primary">
                    <Trophy className="h-4 w-4" />
                    <span className="font-semibold">+{selectedEvent.points} points</span>
                  </div>
                </div>
              )}

              {selectedEvent.description && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Event Type</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.rsvp_required
                    ? `This is a closed meeting with limited capacity (${selectedEvent.max_attendance} attendees). RSVP is required.`
                    : 'This is an open meeting. All members are welcome to attend without RSVP.'}
                </p>
              </div>

              {selectedEvent.rsvp_required && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Attendance</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {attendanceCounts.get(selectedEvent.id) || 0} / {selectedEvent.max_attendance} RSVPs
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Events;