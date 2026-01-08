import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, FolderKanban, GraduationCap, Award, TrendingUp, Users, BookOpen, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/database.types';

type Event = Database['public']['Tables']['events']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];
type Class = Database['public']['Tables']['classes']['Row'];

const Dashboard = () => {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [userClasses, setUserClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && role) {
      fetchDashboardData();
    }
  }, [user, role]);

  const fetchDashboardData = async () => {
    if (!user || !role) return;

    // Fetch upcoming events (next 5 events user is allowed to see)
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .contains('allowed_roles', [role])
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(5);

    if (eventsData) setUpcomingEvents(eventsData);

    // Fetch user's projects
    const { data: projectMemberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    if (projectMemberships && projectMemberships.length > 0) {
      const projectIds = projectMemberships.map(pm => pm.project_id);
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('created_at', { ascending: false });

      if (projectsData) setUserProjects(projectsData);
    }

    // Fetch user's classes
    const { data: classEnrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('user_id', user.id);

    if (classEnrollments && classEnrollments.length > 0) {
      const classIds = classEnrollments.map(ce => ce.class_id);
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .in('id', classIds)
        .order('name', { ascending: true });

      if (classesData) setUserClasses(classesData);
    }

    setLoading(false);
  };

  const getRoleBadgeColor = (roleValue: string) => {
    switch (roleValue) {
      case 'e-board':
        return 'default';
      case 'board':
        return 'secondary';
      case 'member':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleGradient = (roleValue: string) => {
    switch (roleValue) {
      case 'e-board':
        return 'from-yellow-500/10 to-orange-500/10';
      case 'board':
        return 'from-blue-500/10 to-purple-500/10';
      case 'member':
        return 'from-green-500/10 to-emerald-500/10';
      default:
        return 'from-gray-500/10 to-slate-500/10';
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Welcome Header with Claude Keyboard Glyph */}
      <div className="relative rounded-xl p-8 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border border-orange-200 dark:border-orange-800 overflow-hidden">
        {/* Keyboard Glyph Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 dark:opacity-5 pointer-events-none">
          <svg
            viewBox="0 0 200 200"
            className="w-96 h-96 text-orange-400"
            fill="currentColor"
          >
            {/* Keyboard glyph - simplified Claude icon style */}
            <rect x="20" y="60" width="160" height="80" rx="8" fill="none" stroke="currentColor" strokeWidth="4"/>

            {/* Top row of keys */}
            <rect x="30" y="70" width="12" height="12" rx="2"/>
            <rect x="46" y="70" width="12" height="12" rx="2"/>
            <rect x="62" y="70" width="12" height="12" rx="2"/>
            <rect x="78" y="70" width="12" height="12" rx="2"/>
            <rect x="94" y="70" width="12" height="12" rx="2"/>
            <rect x="110" y="70" width="12" height="12" rx="2"/>
            <rect x="126" y="70" width="12" height="12" rx="2"/>
            <rect x="142" y="70" width="12" height="12" rx="2"/>
            <rect x="158" y="70" width="12" height="12" rx="2"/>

            {/* Middle row of keys */}
            <rect x="30" y="88" width="12" height="12" rx="2"/>
            <rect x="46" y="88" width="12" height="12" rx="2"/>
            <rect x="62" y="88" width="12" height="12" rx="2"/>
            <rect x="78" y="88" width="12" height="12" rx="2"/>
            <rect x="94" y="88" width="12" height="12" rx="2"/>
            <rect x="110" y="88" width="12" height="12" rx="2"/>
            <rect x="126" y="88" width="12" height="12" rx="2"/>
            <rect x="142" y="88" width="12" height="12" rx="2"/>
            <rect x="158" y="88" width="12" height="12" rx="2"/>

            {/* Bottom row of keys */}
            <rect x="30" y="106" width="12" height="12" rx="2"/>
            <rect x="46" y="106" width="12" height="12" rx="2"/>
            <rect x="62" y="106" width="12" height="12" rx="2"/>
            <rect x="78" y="106" width="60" height="12" rx="2"/>
            <rect x="142" y="106" width="12" height="12" rx="2"/>
            <rect x="158" y="106" width="12" height="12" rx="2"/>
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center">
          <h1
            className="text-5xl mb-2 font-black text-orange-600 dark:text-orange-400 drop-shadow-lg tracking-tight"
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <p className="text-sm text-muted-foreground">Club Points</p>
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
            <p className="text-sm text-muted-foreground">Club Status</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Upcoming Events</CardTitle>
                  <CardDescription>Next club events</CardDescription>
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
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
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

        {/* Active Projects */}
        <Card className="hover:shadow-lg transition-shadow">
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
                {userProjects.slice(0, 5).map((project) => (
                  <div key={project.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="p-2 bg-blue-500/10 rounded-md shrink-0">
                      <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm mb-1">{project.name}</p>
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {project.description}
                        </p>
                      )}
                      {project.due_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {format(new Date(project.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Classes Section */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userClasses.map((cls) => (
                <div key={cls.id} className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="p-2 bg-purple-500/10 rounded-md shrink-0">
                    <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm mb-1">{cls.name}</p>
                    {cls.schedule && (
                      <p className="text-xs text-muted-foreground">{cls.schedule}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;