import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { EventModal } from '@/components/EventModal';

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  location: string;
  rsvp_required: boolean;
}

const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [userRole, setUserRole] = useState<string>('prospect');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchEvents();
    }
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .order('role', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setUserRole(data.role);
    }
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const canManageEvents = userRole === 'board' || userRole === 'e-board';

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
        <p>Loading events...</p>
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
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle>{event.name}</CardTitle>
                <CardDescription className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(event.event_date), 'PPP p')}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {event.description && (
                  <p className="text-sm text-muted-foreground mb-4">{event.description}</p>
                )}
                {event.rsvp_required && (
                  <Badge variant="secondary">RSVP Required</Badge>
                )}
                <Button className="w-full mt-4" variant="outline">
                  {event.rsvp_required ? 'RSVP' : 'View Details'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EventModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchEvents}
      />
    </div>
  );
};

export default Events;
