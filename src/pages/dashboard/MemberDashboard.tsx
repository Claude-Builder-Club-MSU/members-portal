import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Trophy, Calendar, FolderKanban, GraduationCap, Award, TrendingUp, Users, BookOpen, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/database.types';

type Event = Database['public']['Tables']['events']['Row'];
type Project = Database['public']['Tables']['projects']['Row'] & {
  semesters: { code: string; name: string } | null;
};
type Class = Database['public']['Tables']['classes']['Row'] & {
  semesters: { code: string; name: string } | null;
};

function MemberDashboard() {
  const { user, profile, role } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [userClasses, setUserClasses] = useState<Class[]>([]);

  useEffect(() => {
    if (!user || !role) return;
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role]);

  async function fetchDashboardData() {
    setLoading(true);

    // Upcoming Events
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .contains('allowed_roles', [role])
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(5);

    if (eventsData) setUpcomingEvents(eventsData);

    // User's Projects with semester info
    const { data: projectMemberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    if (projectMemberships && projectMemberships.length > 0) {
      const projectIds = projectMemberships.map(pm => pm.project_id);
      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          *,
          semesters (
            code,
            name
          )
        `)
        .in('id', projectIds)
        .order('start_date', { ascending: false })
        .limit(5);

      if (projectsData) setUserProjects(projectsData as Project[]);
    }

    // User's Classes with semester info
    const { data: classEnrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('user_id', user.id);

    if (classEnrollments && classEnrollments.length > 0) {
      const classIds = classEnrollments.map(ce => ce.class_id);
      const { data: classesData } = await supabase
        .from('classes')
        .select(`
          *,
          semesters (
            code,
            name
          )
        `)
        .in('id', classIds)
        .order('start_date', { ascending: false });

      if (classesData) setUserClasses(classesData as Class[]);
    }

    setLoading(false);
  }

  function getProjectStatus(project: Project) {
    const now = new Date();
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);

    if (startDate > now) return { label: 'Open for Enrollment', color: 'bg-green-500' };
    if (endDate < now) return { label: 'Completed', color: 'bg-gray-500' };
    return { label: 'In Progress', color: 'bg-blue-500' };
  }

  function getClassStatus(cls: Class) {
    const now = new Date();
    const startDate = new Date(cls.start_date);
    const endDate = new Date(cls.end_date);

    if (startDate > now) return { label: 'Open for Enrollment', color: 'bg-green-500' };
    if (endDate < now) return { label: 'Completed', color: 'bg-gray-500' };
    return { label: 'In Progress', color: 'bg-blue-500' };
  }

  // Header
  function WelcomeCard() {
    return (
      <div className={`relative rounded-xl bg-gradient-to-br border border-primary/20 dark:border-primary/30 overflow-hidden ${isMobile ? 'p-6' : 'p-8'} opacity-80`}
        style={{ backgroundImage: 'linear-gradient(to bottom right, #f4ccc2, #f4c7a8)' }}>
        <div className="absolute inset-0 flex items-center justify-center opacity-10 dark:opacity-5 pointer-events-none">
          {/* Keyboard glyph SVG (as in original) */}
          <svg viewBox="0 0 200 200" className="w-96 h-96 text-primary/60" fill="currentColor">
            <rect x="20" y="60" width="160" height="80" rx="8" fill="none" stroke="currentColor" strokeWidth="4" />
            {/* Top row of keys */}
            <rect x="30" y="70" width="12" height="12" rx="2" />
            <rect x="46" y="70" width="12" height="12" rx="2" />
            <rect x="62" y="70" width="12" height="12" rx="2" />
            <rect x="78" y="70" width="12" height="12" rx="2" />
            <rect x="94" y="70" width="12" height="12" rx="2" />
            <rect x="110" y="70" width="12" height="12" rx="2" />
            <rect x="126" y="70" width="12" height="12" rx="2" />
            <rect x="142" y="70" width="12" height="12" rx="2" />
            <rect x="158" y="70" width="12" height="12" rx="2" />
            {/* Middle row of keys */}
            <rect x="30" y="88" width="12" height="12" rx="2" />
            <rect x="46" y="88" width="12" height="12" rx="2" />
            <rect x="62" y="88" width="12" height="12" rx="2" />
            <rect x="78" y="88" width="12" height="12" rx="2" />
            <rect x="94" y="88" width="12" height="12" rx="2" />
            <rect x="110" y="88" width="12" height="12" rx="2" />
            <rect x="126" y="88" width="12" height="12" rx="2" />
            <rect x="142" y="88" width="12" height="12" rx="2" />
            <rect x="158" y="88" width="12" height="12" rx="2" />
            {/* Bottom row of keys */}
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

  // Stats grid
  function MemberStatsCards() {
    return (
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{profile?.points || 0}</div>
            <p className="text-sm text-muted-foreground">Points</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{userProjects.length}</div>
            <p className="text-sm text-muted-foreground">Active Projects</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-500" />
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{userClasses.length}</div>
            <p className="text-sm text-muted-foreground">Enrolled Classes</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Award className="h-5 w-5 text-green-600 dark:text-green-500" />
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1 capitalize">
              {role?.replace('-', ' ') || 'Prospect'}
            </div>
            <p className="text-sm text-muted-foreground">Status</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Upcoming Events Card
  function MemberUpcomingEvents() {
    return (
      <Card className="hover:shadow-lg transition-shadow h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Upcoming Events</CardTitle>
                <CardDescription>What's next</CardDescription>
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
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No upcoming events</p>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-primary/50 transition-colors">
                  <div className="p-2 bg-primary/10 rounded-md shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm mb-1">{event.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.event_date), 'MMM d, yyyy • h:mm a')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{event.location}</p>
                  </div>
                  {event.points > 0 && (
                    <Badge variant="secondary" className="shrink-0">
                      +{event.points}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Projects Card
  function MemberProjects() {
    return (
      <Card className="hover:shadow-lg transition-shadow h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-xl">Your Projects</CardTitle>
                <CardDescription>Active projects</CardDescription>
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
          ) : userProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No active projects</p>
          ) : (
            <div className="space-y-4">
              {userProjects.slice(0, 5).map((project) => {
                const status = getProjectStatus(project);
                return (
                  <div key={project.id} className="relative flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-primary/50 transition-colors">
                    <Badge className={`absolute top-2 right-2 ${status.color} text-white text-xs`}>
                      {status.label}
                    </Badge>
                    <div className="p-2 bg-blue-500/10 rounded-md shrink-0">
                      <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0 pr-24">
                      <p className="font-medium text-sm mb-1">{project.name}</p>
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {project.description}
                        </p>
                      )}
                      <div className="space-y-1">
                        {project.semesters && (
                          <p className="text-xs text-muted-foreground">
                            {project.semesters.code} - {project.semesters.name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(project.start_date), 'MMM d')} - {format(new Date(project.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Classes Card (Grid)
  function MemberClasses() {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-xl">Your Classes</CardTitle>
                <CardDescription>Currently enrolled</CardDescription>
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
          ) : userClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Not enrolled in any classes</p>
          ) : (
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {userClasses.map((cls) => {
                const status = getClassStatus(cls);
                return (
                  <div key={cls.id} className="relative flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-primary/50 transition-colors">
                    <Badge className={`absolute top-2 right-2 ${status.color} text-white text-xs`}>
                      {status.label}
                    </Badge>
                    <div className="p-2 bg-purple-500/10 rounded-md shrink-0">
                      <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0 pr-20">
                      <p className="font-medium text-sm mb-1">{cls.name}</p>
                      {cls.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {cls.description}
                        </p>
                      )}
                      <div className="space-y-1">
                        {cls.semesters && (
                          <p className="text-xs text-muted-foreground">
                            {cls.semesters.code} - {cls.semesters.name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(cls.start_date), 'MMM d')} - {format(new Date(cls.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`flex flex-col justify-center ${isMobile ? 'min-h-[calc(100vh-56px)] p-4 space-y-6' : 'h-[95vh] p-6 space-y-4'}`}>
      <WelcomeCard />
      <MemberStatsCards />
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        <MemberUpcomingEvents />
        <MemberProjects />
      </div>
      <MemberClasses />
    </div>
  );
}

export default MemberDashboard;