import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Calendar, MapPin, Users, Trophy, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { EventModal } from '@/components/EventModal';
import type { Database } from '@/integrations/supabase/database.types';

type Event = Database['public']['Tables']['events']['Row'];
type EventAttendance = Database['public']['Tables']['event_attendance']['Row'];

interface EventWithAttendance extends Event {
  userAttendance?: EventAttendance;
  attendanceCount: number;
}

const Events = () => {
  const { user, role } = useAuth();
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<EventWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithAttendance | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    if (user && role) {
      fetchEvents();
    }
  }, [user, role]);

  const fetchEvents = async () => {
    if (!user || !role) return;

    // Fetch events that the user's role is allowed to see
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

    // Fetch user's attendance records
    const { data: attendanceData } = await supabase
      .from('event_attendance')
      .select('*')
      .eq('user_id', user.id);

    const attendanceMap = new Map(
      attendanceData?.map(a => [a.event_id, a]) || []
    );

    // Fetch attendance counts for each event
    const eventsWithData = await Promise.all(
      eventsData.map(async (event) => {
        const { count } = await supabase
          .from('event_attendance')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);

        return {
          ...event,
          userAttendance: attendanceMap.get(event.id),
          attendanceCount: count || 0,
        };
      })
    );

    setEvents(eventsWithData);
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

  const handleViewDetails = (event: EventWithAttendance) => {
    setSelectedEvent(event);
    setIsDetailsModalOpen(true);
  };

  const canManageEvents = role === 'board' || role === 'e-board';

  const isEventFull = (event: EventWithAttendance) => {
    return event.rsvp_required && event.attendanceCount >= event.max_attendance;
  };

  const getEventTypeLabel = (event: Event) => {
    // Check if it's open to all roles
    const allRoles: Database['public']['Enums']['app_role'][] = ['prospect', 'member', 'board', 'e-board'];
    const isOpen = allRoles.every(r => event.allowed_roles.includes(r));
    return isOpen ? 'Open Meeting' : 'Closed Meeting';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">Upcoming club events</p>
        </div>
        {canManageEvents && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading events...</p>
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No upcoming events at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const isFull = isEventFull(event);
            const hasRSVPed = !!event.userAttendance;
            const hasAttended = event.userAttendance?.attended || false;

            return (
              <Card key={event.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg flex-1">{event.name}</CardTitle>
                    <Badge variant={event.rsvp_required ? 'default' : 'secondary'} className="shrink-0 whitespace-nowrap">
                      {getEventTypeLabel(event)}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground mt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(event.event_date), 'PPP p')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                    {event.points > 0 && (
                      <div className="flex items-center gap-2 text-primary">
                        <Trophy className="h-4 w-4" />
                        <span>+{event.points} points</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.description && (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  )}

                  {event.rsvp_required && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {event.attendanceCount} / {event.max_attendance} RSVPs
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

                  {event.rsvp_required ? (
                    hasRSVPed ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleCancelRSVP(event.id)}
                        disabled={hasAttended}
                      >
                        {hasAttended ? 'Already Attended' : 'Cancel RSVP'}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleRSVP(event.id)}
                        disabled={isFull}
                      >
                        {isFull ? 'Event Full' : 'RSVP Now'}
                      </Button>
                    )
                  ) : (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleViewDetails(event)}
                    >
                      View Details
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EventModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchEvents}
      />

      {/* Event Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedEvent?.name}</DialogTitle>
            <DialogDescription>
              <Badge variant={selectedEvent?.rsvp_required ? 'default' : 'secondary'} className="mt-2">
                {selectedEvent && getEventTypeLabel(selectedEvent)}
              </Badge>
            </DialogDescription>
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
                    {selectedEvent.attendanceCount} / {selectedEvent.max_attendance} RSVPs
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