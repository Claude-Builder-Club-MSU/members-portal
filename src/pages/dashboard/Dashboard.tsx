import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Trophy,
  Calendar,
  FolderKanban,
  BookOpen,
  ArrowRight,
  UserPlus,
  Crown,
  Users,
  Award,
  MapPin,
  TrendingUp,
  BookMarkedIcon
} from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/database.types';

// --- Types ---
type Event = Database['public']['Tables']['events']['Row'];

type Project = Database['public']['Tables']['projects']['Row'] & {
  semesters: { code: string; name: string; start_date: string; end_date: string } | null;
  project_members: { count: number }[];
};

type Class = Database['public']['Tables']['classes']['Row'] & {
  semesters: { code: string; name: string; start_date: string; end_date: string } | null;
  class_enrollments: { count: number }[];
};

type AdminStats = {
  members: number;
  prospects: number;
  board: number;
  eBoard: number;
};

type DashboardData = {
  events: Event[];
  projects?: Project[];
  classes?: Class[];
  adminStats?: AdminStats;
};

// --- Helper Functions ---
const getProjectStatus = (project: Project) => {
  if (!project.semesters) return { label: 'Unknown', color: 'bg-gray-300' };
  const now = new Date();
  const startDate = new Date(project.semesters.start_date);
  const endDate = new Date(project.semesters.end_date);
  if (startDate > now) return { label: 'Open', color: 'bg-green-500' };
  if (endDate < now) return { label: 'Completed', color: 'bg-gray-500' };
  return { label: 'Active', color: 'bg-blue-500' };
};

const getClassStatus = (cls: Class) => {
  if (!cls.semesters) return { label: 'Unknown', color: 'bg-gray-300' };
  const now = new Date();
  const startDate = new Date(cls.semesters.start_date);
  const endDate = new Date(cls.semesters.end_date);
  if (startDate > now) return { label: 'Open', color: 'bg-green-500' };
  if (endDate < now) return { label: 'Completed', color: 'bg-gray-500' };
  return { label: 'Active', color: 'bg-blue-500' };
};

// --- Data Fetching Functions ---

// E-Board sees: all roles stats + all events + all projects/classes
async function fetchEBoardDashboard(): Promise<DashboardData> {
  const [eventsRes, rolesRes, projectsRes, classesRes] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(10),
    supabase.from('user_roles').select('role'),
    supabase
      .from('projects')
      .select(`*, semesters (code, name, start_date, end_date), project_members(count)`)
      .limit(6),
    supabase
      .from('classes')
      .select(`*, semesters (code, name, start_date, end_date), class_enrollments(count)`)
      .limit(6)
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (rolesRes.error) throw rolesRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (classesRes.error) throw classesRes.error;

  // Sort projects and classes by semester start date (most recent first)
  const sortedProjects = ((projectsRes.data as Project[]) || []).sort((a, b) => {
    const aStart = a.semesters?.start_date ? new Date(a.semesters.start_date) : new Date(0);
    const bStart = b.semesters?.start_date ? new Date(b.semesters.start_date) : new Date(0);
    return bStart.getTime() - aStart.getTime();
  });

  const sortedClasses = ((classesRes.data as Class[]) || []).sort((a, b) => {
    const aStart = a.semesters?.start_date ? new Date(a.semesters.start_date) : new Date(0);
    const bStart = b.semesters?.start_date ? new Date(b.semesters.start_date) : new Date(0);
    return bStart.getTime() - aStart.getTime();
  });

  return {
    events: eventsRes.data || [],
    projects: sortedProjects,
    classes: sortedClasses,
    adminStats: {
      members: rolesRes.data?.filter(r => r.role === 'member').length || 0,
      prospects: rolesRes.data?.filter(r => r.role === 'prospect').length || 0,
      board: rolesRes.data?.filter(r => r.role === 'board').length || 0,
      eBoard: rolesRes.data?.filter(r => r.role === 'e-board').length || 0,
    }
  };
}

// Board sees: all events + all projects/classes (stats from ProfileContext)
async function fetchBoardDashboard(): Promise<DashboardData> {
  const [eventsRes, projectsRes, classesRes] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(10),
    supabase
      .from('projects')
      .select(`*, semesters (code, name, start_date, end_date), project_members(count)`)
      .limit(6),
    supabase
      .from('classes')
      .select(`*, semesters (code, name, start_date, end_date), class_enrollments(count)`)
      .limit(6)
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (classesRes.error) throw classesRes.error;

  // Sort projects and classes by semester start date (most recent first)
  const sortedProjects = ((projectsRes.data as Project[]) || []).sort((a, b) => {
    const aStart = a.semesters?.start_date ? new Date(a.semesters.start_date) : new Date(0);
    const bStart = b.semesters?.start_date ? new Date(b.semesters.start_date) : new Date(0);
    return bStart.getTime() - aStart.getTime();
  });

  const sortedClasses = ((classesRes.data as Class[]) || []).sort((a, b) => {
    const aStart = a.semesters?.start_date ? new Date(a.semesters.start_date) : new Date(0);
    const bStart = b.semesters?.start_date ? new Date(b.semesters.start_date) : new Date(0);
    return bStart.getTime() - aStart.getTime();
  });

  return {
    events: eventsRes.data || [],
    projects: sortedProjects,
    classes: sortedClasses,
  };
}

// Members see: role-filtered events + their projects/classes (from ProfileContext)
async function fetchMemberDashboard(userRole: string): Promise<DashboardData> {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .contains('allowed_roles', [userRole])
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(5);

  if (error) throw error;

  return {
    events: events || [],
  };
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { role, isEBoard, isBoardOrAbove, stats, projects, classes } = useProfile();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Fetch dashboard-specific data (events + admin views)
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard-data', role],
    queryFn: async () => {
      if (!role) throw new Error('No role');

      if (role === 'e-board') {
        return fetchEBoardDashboard();
      } else if (role === 'board') {
        return fetchBoardDashboard();
      } else {
        return fetchMemberDashboard(role);
      }
    },
    enabled: !!role,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,
    // Provide default empty structure to prevent undefined errors
    placeholderData: {
      events: [],
    },
  });

  // --- Sub-Components ---

  const WelcomeCard = () => (
    <div className={`relative rounded-xl bg-gradient-to-br border border-primary/20 dark:border-primary/30 overflow-hidden ${isMobile ? 'p-6' : 'p-8'} opacity-80`}
      style={{ backgroundImage: 'linear-gradient(to bottom right, #f4ccc2, #f4c7a8)' }}>
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
        <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-black text-primary dark:text-primary/80 drop-shadow-lg tracking-tight`}
          style={{ fontFamily: `'Roboto Mono', monospace`, letterSpacing: '0.05em', fontWeight: 800 }}>
          <span className="inline-block">Welcome back,&nbsp;<span className="font-extrabold">{profile?.full_name?.split(' ')[0] || 'User'}</span></span>
        </h1>
      </div>
    </div>
  );

  const StatItem = ({ icon: Icon, color, bg, value, label, link }: any) => (
    <Card
      className={`relative overflow-hidden hover:shadow-lg transition-all group${link ? ' cursor-pointer' : ''}`}
      onClick={() => link && navigate(link)}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 ${bg} rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110`} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={`p-2 ${bg} rounded-lg`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold mb-1 ${typeof value === 'string' ? 'capitalize' : ''}`}>{value}</div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );

  const StatsGrid = () => {
    // E-Board shows admin stats
    if (isEBoard && dashboardData?.adminStats) {
      const adminStats = dashboardData.adminStats;

      return (
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          <StatItem
            icon={Users}
            color="text-green-600 dark:text-green-500"
            bg="bg-green-500/10"
            value={adminStats.members}
            label={adminStats.members === 1 ? "Active Member" : "Active Members"}
            link="/dashboard/members"
          />
          <StatItem
            icon={UserPlus}
            color="text-primary dark:text-primary/80"
            bg="bg-primary/10"
            value={adminStats.prospects}
            label={adminStats.prospects === 1 ? "Prospect" : "Prospects"}
            link="/dashboard/prospects"
          />
          <StatItem
            icon={Award}
            color="text-blue-600 dark:text-blue-500"
            bg="bg-blue-500/10"
            value={adminStats.board}
            label={adminStats.board === 1 ? "Board Member" : "Board Members"}
            link="/dashboard/members"
          />
          <StatItem
            icon={Crown}
            color="text-purple-600 dark:text-purple-500"
            bg="bg-purple-500/10"
            value={adminStats.eBoard}
            label={adminStats.eBoard === 1 ? "E-Board Member" : "E-Board Members"}
            link="/dashboard/members"
          />
        </div>
      );
    }

    // Everyone else shows personal stats (from ProfileContext)
    return (
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
        <StatItem
          icon={Trophy}
          color="text-yellow-600 dark:text-yellow-500"
          bg="bg-yellow-500/10"
          value={profile?.points || 0}
          label="Points"
        />
        <StatItem
          icon={FolderKanban}
          color="text-blue-600 dark:text-blue-500"
          bg="bg-blue-500/10"
          value={stats?.totalProjects || 0}
          label={stats?.totalProjects === 1 ? "Active Project" : "Active Projects"}
          link="/dashboard/projects"
        />
        <StatItem
          icon={BookOpen}
          color="text-purple-600 dark:text-purple-500"
          bg="bg-purple-500/10"
          value={stats?.totalClasses || 0}
          label={stats?.totalClasses === 1 ? "Enrolled Class" : "Enrolled Classes"}
          link="/dashboard/classes"
        />
        <StatItem
          icon={Award}
          color="text-green-600 dark:text-green-500"
          bg="bg-green-500/10"
          value={role?.replace('-', ' ') || 'Prospect'}
          label="Status"
        />
      </div>
    );
  };

  const EventsCard = () => {
    const events = dashboardData?.events || [];

    return (
      <Card className="hover:shadow-lg transition-shadow h-full flex flex-col min-w-[300px]">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Upcoming Events</CardTitle>
                <CardDescription>{`${events.length} event${events.length !== 1 ? 's' : ''}`}</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/events')}
              className="hover:bg-primary/10 hover:text-primary"
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`flex-1 flex flex-col overflow-y-auto max-h-[600px] ${isMobile ? 'p-4 justify-center' : 'p-2'}`}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading...</div>
          ) : events.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No upcoming events</div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <Card key={event.id} className="w-full border bg-card hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => navigate('/dashboard/events')}>
                  <CardHeader className="p-3 pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg font-semibold truncate">{event.name}</CardTitle>
                      {event.points > 0 && <Badge variant="secondary" className="scale-90 origin-right">+{event.points}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0.5 space-y-1">
                    <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(event.event_date), 'MMM d, yyyy • h:mm a')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const ResourceCard = ({ type }: { type: 'Projects' | 'Classes' }) => {
    const isProject = type === 'Projects';
    const Icon = isProject ? FolderKanban : BookOpen;
    const colorClass = isProject ? "text-blue-600 dark:text-blue-500" : "text-purple-600 dark:text-purple-500";
    const bgClass = isProject ? "bg-blue-500/10" : "bg-purple-500/10";
    const hoverBtnClass = isProject ? "hover:bg-blue-500/10 hover:text-blue-600" : "hover:bg-purple-500/10 hover:text-purple-600";
    const link = isProject ? '/dashboard/projects' : '/dashboard/classes';

    // For board/e-board: show all projects/classes from dashboard query
    // For members: show their projects/classes from ProfileContext
    let items: any[] = [];  // Use any[] to handle different data shapes
    let title = '';

    if (isBoardOrAbove) {
      items = isProject
        ? (dashboardData?.projects || [])
        : (dashboardData?.classes || []);
      title = `Active ${type}`;
    } else {
      items = isProject
        ? (projects?.projects || [])
        : (classes?.classes || []);
      title = `Your ${type}`;
    }

    const desc = `${items.length} ${items.length === 1 ? type.slice(0, -1).toLowerCase() : type.toLowerCase()}`;

    return (
      <Card className="hover:shadow-lg transition-shadow h-full flex flex-col min-w-[300px]">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${bgClass} rounded-lg`}>
                <Icon className={`h-5 w-5 ${colorClass}`} />
              </div>
              <div>
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(link)}
              className={hoverBtnClass}
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col justify-center">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Icon className={`h-8 w-8 ${colorClass} opacity-30 mb-2`} />
              <p className="text-sm">No active {type.toLowerCase()}</p>
            </div>
          ) : (
            <div className={`grid gap-3 ${isBoardOrAbove && !isMobile ? 'grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl-grid-cols-2' : type === 'Classes' && !isMobile && !isBoardOrAbove ? 'grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl: grid-cols-2' : 'grid-cols-1'}`}>
              {items.map((item: any) => {
                const status = isProject ? getProjectStatus(item) : getClassStatus(item);

                // For dashboard data (board/e-board), count comes from aggregated query
                // For ProfileContext data (members), we don't have the count, so default to 0
                const count = isBoardOrAbove
                  ? (isProject
                      ? (item.project_members?.[0]?.count || 0)
                      : (item.class_enrollments?.[0]?.count || 0))
                  : 0;

                return (
                  <Card key={item.id} className="w-full border bg-card hover:bg-primary/5 transition-colors cursor-pointer" onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    navigate(link);
                  }}>
                    <CardHeader className="p-5 pb-1">
                      <div className="flex items-center justify-start justify-between gap-2">
                        <div className="flex flex-col items-left gap-2 w-[60%]">
                          <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
                          {item.description && <p className="text-[14px] text-muted-foreground line-clamp-1 max-w-[50%] overflow-hidden">{item.description}</p>}
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <Badge variant="outline" className={`${status.color.replace('bg-', 'text-')} border-current scale-90 origin-right`}>{status.label}</Badge>
                          {item.semesters && (
                            <span className="text-[14px] text-muted-foreground flex items-center gap-1 justify-end">
                              <BookMarkedIcon className="inline h-3 w-3 mr-0.5" />
                              {item.semesters.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 space-y-1">
                      <div className="flex items-center justify-between text-[14px] text-muted-foreground mt-1">
                        {type === 'Projects' && item.client_name && (
                          <span className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            <span className="capitalize">{item.client_name}</span>
                          </span>
                        )}
                        {type === 'Classes' && item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="capitalize">{item.location}</span>
                          </span>
                        )}
                        {isBoardOrAbove && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{count} {isProject ? 'members' : 'students'}</span>
                          </span>
                        )}
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
  };

  return (
    <div className={`flex flex-col p-4 gap-4 ${isMobile ? 'min-h-[calc(100vh-5vh)]' : 'xl:h-[95vh] h-auto'} overflow-hidden`}>
      {/* 1. Header */}
      <div className="shrink-0">
        <WelcomeCard />
      </div>

      {/* 2. Stats */}
      <div className="shrink-0">
        <StatsGrid />
      </div>

      {/* 3. Main Content Grid */}
      <div className={`grid gap-4 flex-1 min-h-0 ${isMobile ? 'grid-cols-1 auto-rows-fr' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
        <div className={`h-full ${isMobile ? 'min-h-[100px]' : 'min-h-0'} md:col-span-1 md:row-span-2 xl:col-span-1 xl:row-span-2`}>
          <EventsCard />
        </div>

        <div className={`h-full ${isMobile ? 'min-h-[100px]' : 'min-h-[250px]'} md:col-span-1 xl:col-span-2`}>
          <ResourceCard type="Projects" />
        </div>

        <div className={`h-full ${isMobile ? 'min-h-[100px]' : 'min-h-[250px]'} md:col-span-1 xl:col-span-2`}>
          <ResourceCard type="Classes" />
        </div>
      </div>
    </div>
  );
}