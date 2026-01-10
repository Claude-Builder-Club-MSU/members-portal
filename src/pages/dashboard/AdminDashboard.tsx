import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Users,
  UserPlus,
  Calendar,
  FolderKanban,
  BookOpen,
  TrendingUp,
  Award,
  Crown,
  ArrowRight,
  MapPin,
  Trophy,
} from 'lucide-react';

import type { Database } from '@/integrations/supabase/database.types';

type Event = Database['public']['Tables']['events']['Row'];
type Project = Database['public']['Tables']['projects']['Row'] & {
  semesters: { code: string; name: string } | null;
};
type Class = Database['public']['Tables']['classes']['Row'] & {
  semesters: { code: string; name: string } | null;
};

const AdminDashboard = () => {
  const isMobile = useIsMobile();

  return (
    <div
      className={`flex flex-col justify-center ${isMobile ? 'min-h-[calc(100vh-56px)] p-4 space-y-6' : 'h-[95vh] p-6 space-y-4'}`}
    >
      <WelcomeCard />
      <AdminStatsCard />
      <div className={`grid gap-6 mt-0 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
        <UpcomingEventsColumn />
        <ProjectsClassesColumn />
      </div>
    </div>
  );
};

// The left column with Upcoming Events
function UpcomingEventsColumn() {
  const isMobile = useIsMobile();
  return (
    <div className={isMobile ? 'order-2' : 'lg:col-span-1'}>
      <UpcomingEventsCard />
    </div>
  );
}

// The right column with Projects & Classes
function ProjectsClassesColumn() {
  const isMobile = useIsMobile();
  return (
    <div className={`${isMobile ? 'order-1' : 'lg:col-span-2'} space-y-6`}>
      <ProjectsCard />
      <ClassesCard />
    </div>
  );
}

function WelcomeCard() {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  return (
    <div
      className={`relative rounded-xl bg-gradient-to-br border border-primary/20 dark:border-primary/30 overflow-hidden ${isMobile ? 'p-6' : 'p-8'} opacity-80`}
      style={{ backgroundImage: 'linear-gradient(to bottom right, #f4ccc2, #f4c7a8)' }}
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-10 dark:opacity-5 pointer-events-none">
        <svg viewBox="0 0 200 200" className="w-96 h-96 text-primary/60" fill="currentColor">
          <rect x="20" y="60" width="160" height="80" rx="8" fill="none" stroke="currentColor" strokeWidth="4" />
          <rect x="30" y="70" width="12" height="12" rx="2" />
          <rect x="46" y="70" width="12" height="12" rx="2" />
          <rect x="62" y="70" width="12" height="12" rx="2" />
          <rect x="78" y="70" width="12" height="12" rx="2" />
          <rect x="94" y="70" width="12" height="12" rx="2" />
          <rect x="110" y="70" width="12" height="12" rx="2" />
          <rect x="126" y="70" width="12" height="12" rx="2" />
          <rect x="142" y="70" width="12" height="12" rx="2" />
          <rect x="158" y="70" width="12" height="12" rx="2" />
          <rect x="30" y="88" width="12" height="12" rx="2" />
          <rect x="46" y="88" width="12" height="12" rx="2" />
          <rect x="62" y="88" width="12" height="12" rx="2" />
          <rect x="78" y="88" width="12" height="12" rx="2" />
          <rect x="94" y="88" width="12" height="12" rx="2" />
          <rect x="110" y="88" width="12" height="12" rx="2" />
          <rect x="126" y="88" width="12" height="12" rx="2" />
          <rect x="142" y="88" width="12" height="12" rx="2" />
          <rect x="158" y="88" width="12" height="12" rx="2" />
          <rect x="30" y="106" width="12" height="12" rx="2" />
          <rect x="46" y="106" width="12" height="12" rx="2" />
          <rect x="62" y="106" width="12" height="12" rx="2" />
          <rect x="78" y="106" width="60" height="12" rx="2" />
          <rect x="142" y="106" width="12" height="12" rx="2" />
          <rect x="158" y="106" width="12" height="12" rx="2" />
        </svg>
      </div>
      <div className="relative z-10 text-center">
        <h1
          className={`${isMobile ? 'text-4xl' : 'text-5xl'} font-black text-primary dark:text-primary/80 drop-shadow-lg tracking-tight`}
          style={{
            fontFamily: `'Roboto Mono', monospace`,
            letterSpacing: '0.05em',
            fontWeight: 800,
          }}
        >
          <span className="inline-block">
            Welcome back,&nbsp;
            <span className="font-extrabold">
              {profile?.full_name?.split(' ')[0] || 'User'}
            </span>
          </span>
        </h1>
      </div>
    </div>
  );
}

function AdminStatsCard() {
  const [memberCount, setMemberCount] = useState(0);
  const [prospectCount, setProspectCount] = useState(0);
  const [boardCount, setBoardCount] = useState(0);
  const [eBoardCount, setEBoardCount] = useState(0);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data: rolesData } = await supabase.from('user_roles').select('role');
      if (rolesData && isMounted) {
        setMemberCount(rolesData.filter(r => r.role === 'member').length);
        setProspectCount(rolesData.filter(r => r.role === 'prospect').length);
        setBoardCount(rolesData.filter(r => r.role === 'board').length);
        setEBoardCount(rolesData.filter(r => r.role === 'e-board').length);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
      <Card className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/members')}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Users className="h-5 w-5 text-green-600 dark:text-green-500" />
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-1">{memberCount}</div>
          <p className="text-sm text-muted-foreground">Active Members</p>
        </CardContent>
      </Card>
      <Card className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/prospects')}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="h-5 w-5 text-primary dark:text-primary/80" />
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-1">{prospectCount}</div>
          <p className="text-sm text-muted-foreground">Prospects</p>
        </CardContent>
      </Card>
      <Card className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/members')}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Award className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-1">{boardCount}</div>
          <p className="text-sm text-muted-foreground">Board Members</p>
        </CardContent>
      </Card>
      <Card className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/members')}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Crown className="h-5 w-5 text-purple-600 dark:text-purple-500" />
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-1">{eBoardCount}</div>
          <p className="text-sm text-muted-foreground">E-Board Members</p>
        </CardContent>
      </Card>
    </div>
  );
}

function UpcomingEventsCard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(10);

      if (mounted && data) setEvents(data);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const getEventTypeLabel = (event: Event) => {
    const allRoles: Database['public']['Enums']['app_role'][] = ['prospect', 'member', 'board', 'e-board'];
    const isOpen = allRoles.every(r => event.allowed_roles.includes(r));
    return isOpen ? 'Open' : 'Closed';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Upcoming Events</CardTitle>
              <CardDescription>{events.length} event{events.length !== 1 && 's'}</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/events')}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[600px]">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-full">
            <p className="text-sm text-muted-foreground text-center">Loading...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full">
            <p className="text-sm text-muted-foreground py-8 text-center">No upcoming events</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Card key={event.id} className="w-full border bg-card hover:bg-cream transition-colors">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold truncate">{event.name}</CardTitle>
                    <Badge
                      variant={event.rsvp_required ? 'default' : 'secondary'}
                      className="ml-2 shrink-0"
                    >
                      {getEventTypeLabel(event)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(event.event_date), 'MMM d, yyyy • h:mm a')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  {event.points > 0 ? (
                    <div className="flex items-center gap-2 text-xs text-primary font-medium">
                      <Trophy className="h-3 w-3" />
                      <span>+{event.points} points</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectsCard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('projects')
        .select(`
          *,
          semesters (
            code,
            name
          )
        `)
        .order('start_date', { ascending: false })
        .limit(6);

      if (data && mounted) setProjects(data as Project[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const getProjectStatus = (project: Project) => {
    const now = new Date();
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);

    if (startDate > now) return { label: 'Open for Enrollment', color: 'bg-green-500' };
    if (endDate < now) return { label: 'Completed', color: 'bg-gray-500' };
    return { label: 'In Progress', color: 'bg-blue-500' };
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Active Projects</CardTitle>
              <CardDescription>
                {projects.length} {projects.length === 1 ? 'project' : 'projects'}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/projects')}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No projects</p>
        ) : (
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {projects.map((project) => {
              const status = getProjectStatus(project);
              return (
                <Card key={project.id} className="w-full border bg-card hover:bg-cream transition-colors">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base font-semibold truncate">{project.name}</CardTitle>
                      <Badge variant="enable" className="ml-2 shrink-0">{status.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-1">
                    {project.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <FolderKanban className="h-3 w-3" />
                      <span>
                        {project.semesters
                          ? `${project.semesters.code} - ${project.semesters.name}`
                          : 'No semester'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(project.start_date), 'MMM d')} - {format(new Date(project.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClassesCard() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('classes')
        .select(`
          *,
          semesters (
            code,
            name
          )
        `)
        .order('start_date', { ascending: false })
        .limit(6);

      if (data && mounted) setClasses(data as Class[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const getClassStatus = (cls: Class) => {
    const now = new Date();
    const startDate = new Date(cls.start_date);
    const endDate = new Date(cls.end_date);

    if (startDate > now) return { label: 'Open for Enrollment', color: 'bg-green-500' };
    if (endDate < now) return { label: 'Completed', color: 'bg-gray-500' };
    return { label: 'In Progress', color: 'bg-blue-500' };
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Active Classes</CardTitle>
              <CardDescription>
                {classes.length} {classes.length === 1 ? 'class' : 'classes'}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/classes')}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
        ) : classes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No classes available</p>
        ) : (
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {classes.map((cls) => {
              const status = getClassStatus(cls);
              return (
                <Card key={cls.id} className="w-full border bg-card hover:bg-cream transition-colors">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base font-semibold truncate">{cls.name}</CardTitle>
                      <Badge variant="enable" className="ml-2 shrink-0">{status.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-1">
                    {cls.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        {cls.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <BookOpen className="h-3 w-3" />
                      <span>
                        {cls.semesters
                          ? `${cls.semesters.code} - ${cls.semesters.name}`
                          : 'No semester'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(cls.start_date), 'MMM d')} - {format(new Date(cls.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminDashboard;