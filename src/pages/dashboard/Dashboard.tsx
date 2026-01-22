import { useProfile, type Project, type Class } from '@/contexts/ProfileContext';
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
import { useAuth } from '@/contexts/AuthContext';

// Dashboard uses types from ProfileContext and separate queries

type AdminStats = {
  members: number;
  prospects: number;
  board: number;
  eBoard: number;
};


// --- Helper Functions ---
const getProjectStatus = (
  project: Project,
  isBoardOrAbove?: boolean
) => {
  if (!project.semesters) return { label: 'Unknown', color: 'bg-gray-300' };
  const now = new Date();
  const startDate = new Date(project.semesters.start_date);
  const endDate = new Date(project.semesters.end_date);

  if (isBoardOrAbove) {
    if (startDate > now) return { label: 'Open', color: 'bg-green-500' };
    if (endDate < now) return { label: 'Completed', color: 'bg-gray-500' };
    return { label: 'Active', color: 'bg-blue-500' };
  } else {
    // For regular members: use "Available" if not started, "Enrolled" if started and not completed, "Completed" if over
    if (startDate > now) return { label: 'Available', color: 'bg-green-500' };
    if (endDate < now) return { label: 'Completed', color: 'bg-gray-500' };
    return { label: 'Enrolled', color: 'bg-blue-500' };
  }
};

const getClassStatus = (
  cls: Class,
  isBoardOrAbove?: boolean
) => {
  if (!cls.semesters) return { label: 'Unknown', color: 'bg-gray-300' };
  const now = new Date();
  const startDate = new Date(cls.semesters.start_date);
  const endDate = new Date(cls.semesters.end_date);

  if (isBoardOrAbove) {
    if (startDate > now) return { label: 'Open', color: 'bg-green-500' };
    if (endDate < now) return { label: 'Completed', color: 'bg-gray-500' };
    return { label: 'Active', color: 'bg-blue-500' };
  } else {
    // For regular members: use "Available" if not started, "Enrolled" if started and not completed, "Completed" if over
    if (startDate > now) return { label: 'Available', color: 'bg-green-500' };
    if (endDate < now) return { label: 'Completed', color: 'bg-gray-500' };
    return { label: 'Enrolled', color: 'bg-blue-500' };
  }
};

// Dashboard data is now sourced from ProfileContext and separate admin queries

export default function Dashboard() {
  const { role, loading, isEBoard, isBoardOrAbove, userProjects, userClasses, userEvents } = useProfile();
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Fetch admin stats for E-Board
  const { data: adminStats, isLoading: adminStatsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data: rolesRes } = await supabase.from('user_roles').select('role');

      return {
        members: rolesRes?.filter(r => r.role !== 'prospect').length || 0,
        prospects: rolesRes?.filter(r => r.role === 'prospect').length || 0,
        board: rolesRes?.filter(r => r.role === 'board').length || 0,
        eBoard: rolesRes?.filter(r => r.role === 'e-board').length || 0,
      };
    },
    enabled: isEBoard,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
  });

  // Fetch all projects and classes for board members
  const { data: allProjects, isLoading: allProjectsLoading } = useQuery<Project[]>({
    queryKey: ['all-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`*, semesters (code, name, start_date, end_date), project_members(count)`);

      if (error) throw error;

      // Remove projects with an end_date previous to now
      return (data || [])
        .filter(
          (p) =>
            !p.semesters ||
            !p.semesters.end_date ||
            new Date(p.semesters.end_date) >= new Date()
        )
        .sort(
          (a, b) =>
            new Date(a.semesters?.start_date ?? 0).getTime() -
            new Date(b.semesters?.start_date ?? 0).getTime()
        );
    },
    enabled: isBoardOrAbove,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const { data: allClasses, isLoading: allClassesLoading } = useQuery<Class[]>({
    queryKey: ['all-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(`*, semesters (code, name, start_date, end_date), class_enrollments(count)`)

      if (error) throw error;

      // Remove classes with an end_date previous to now
      return (data || [])
        .filter(
          (p) =>
            !p.semesters ||
            !p.semesters.end_date ||
            new Date(p.semesters.end_date) >= new Date()
        )
        .sort(
          (a, b) =>
            new Date(a.semesters?.start_date ?? 0).getTime() -
            new Date(b.semesters?.start_date ?? 0).getTime()
        );
    },
    enabled: isBoardOrAbove,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const isLoading = loading || (isEBoard && adminStatsLoading) || (isBoardOrAbove && (allProjectsLoading || allClassesLoading));

  // --- Sub-Components ---

  const WelcomeCard = () => (
    <div className={`relative rounded-xl border border-primary/20 dark:border-primary/30 overflow-hidden ${isMobile ? 'p-6' : 'p-8'} opacity-80 hover:opacity-90 dark:opacity-90 dark:hover:opacity-95 transition-all duration-500 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-slate-800 dark:to-slate-900`}>
      <div className="absolute inset-0 flex items-center justify-center opacity-25 dark:opacity-30 pointer-events-none animate-pulse">
        <svg viewBox="0 0 200 200" className="w-96 h-96 text-primary/80 dark:text-primary/60 drop-shadow-lg dark:drop-shadow-2xl animate-pulse" fill="currentColor" style={{
          filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.1))'
        }}>
          <defs>
            <filter id="keyboardGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect x="20" y="60" width="160" height="80" rx="8" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse" filter="url(#keyboardGlow)" />
          <rect x="30" y="70" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '0.1s' }} />
          <rect x="46" y="70" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
          <rect x="62" y="70" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
          <rect x="78" y="70" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
          <rect x="94" y="70" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
          <rect x="110" y="70" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '0.6s' }} />
          <rect x="126" y="70" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '0.7s' }} />
          <rect x="142" y="70" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '0.8s' }} />
          <rect x="158" y="70" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '0.9s' }} />
          <rect x="30" y="88" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '1.0s' }} />
          <rect x="46" y="88" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '1.1s' }} />
          <rect x="62" y="88" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '1.2s' }} />
          <rect x="78" y="88" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '1.3s' }} />
          <rect x="94" y="88" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '1.4s' }} />
          <rect x="110" y="88" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '1.5s' }} />
          <rect x="126" y="88" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '1.6s' }} />
          <rect x="142" y="88" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '1.7s' }} />
          <rect x="158" y="88" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '1.8s' }} />
          <rect x="30" y="106" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '1.9s' }} />
          <rect x="46" y="106" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '2.0s' }} />
          <rect x="62" y="106" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '2.1s' }} />
          <rect x="78" y="106" width="60" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '2.2s' }} />
          <rect x="142" y="106" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '2.3s' }} />
          <rect x="158" y="106" width="12" height="12" rx="2" className="animate-pulse" style={{ animationDelay: '2.4s' }} />
        </svg>
      </div>
      <div className="relative z-10 text-center">
        <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-black text-primary dark:text-primary drop-shadow-lg dark:drop-shadow-2xl tracking-tight hover:scale-105 transition-transform duration-300`}
          style={{ fontFamily: `'Roboto Mono', monospace`, letterSpacing: '0.05em', fontWeight: 800 }}>
          <span className="inline-block">Welcome back,&nbsp;<span className="font-extrabold">{profile?.full_name?.split(' ')[0] || 'User'}</span></span>
        </h1>
      </div>
    </div>
  );

  type StatItemProps = {
    icon: React.ElementType,
    color: string,
    bg: string,
    value: number | string,
    label: string,
    link?: string
  };

  const StatItem = ({ icon: Icon, color, bg, value, label, link }: StatItemProps) => (
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
    if (isEBoard && adminStats) {

      return (
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4 lg:grid-cols-4'}`}>
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
          value={
            userProjects.inProgress.length > 0
              ? userProjects.inProgress.length
              : userProjects.assigned.length || 0
          }
          label={
            userProjects.inProgress.length > 0
              ? (userProjects.inProgress.length === 1 ? "Active Project" : "Active Projects")
              : (userProjects.assigned.length === 1 ? "Assigned Project" : "Assigned Projects")
          }
          link="/dashboard/projects"
        />
        <StatItem
          icon={BookOpen}
          color="text-purple-600 dark:text-purple-500"
          bg="bg-purple-500/10"
          value={
            userClasses.inProgress.length > 0
              ? userClasses.inProgress.length
              : userClasses.enrolled.length || 0
          }
          label={
            userClasses.inProgress.length > 0
              ? (userClasses.inProgress.length === 1 ? "Active Class" : "Active Classes")
              : (userClasses.enrolled.length === 1 ? "Enrolled Class" : "Enrolled Classes")
          }
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
    // Show only attending events for members, all events for admins
    const allEvents = userEvents
      ? (isBoardOrAbove
        ? ((userEvents.attending ?? []).concat(userEvents.notAttending ?? []))
          .slice()
          .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
          .filter(event => new Date(event.event_date) >= new Date()) // Only future events
          .slice(0, 5)
        : (userEvents.attending ?? [])
          .slice()
          .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
          .filter(event => new Date(event.event_date) >= new Date()) // Only future events
          .slice(0, 5))
      : [];

    return (
      <Card className="hover:shadow-lg transition-shadow h-full flex flex-col min-w-[300px]">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Upcoming Events</CardTitle>
                <CardDescription>{`${allEvents.length} event${allEvents.length !== 1 ? 's' : ''}`}</CardDescription>
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
        <CardContent className={`flex overflow-y-auto p-4 flex flex-col justify-flex-start ${isMobile ? 'p-4' : 'p-2'}`}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading...</div>
          ) : allEvents.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Calendar className="h-8 w-8 text-primary opacity-30 mb-2" />
              <p className="text-sm">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allEvents.map((event) => (
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
    let items: (Project | Class)[] = [];
    let title = '';

    if (isBoardOrAbove) {
      items = isProject
        ? (allProjects || [])
        : (allClasses || []);
      title = `All ${type}`;
    } else {
      items = isProject
        ? ([...(userProjects?.inProgress || []), ...(userProjects?.assigned || [])])
        : ([...(userClasses?.inProgress || []), ...(userClasses?.enrolled || [])]);
      title = `Your ${type}`;
    }

    const singularMap: Record<string, string> = { Projects: 'project', Classes: 'class' };
    const desc = `${items.length} ${items.length === 1 ? singularMap[type] : type.toLowerCase()}`;

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
        <CardContent className="flex overflow-y-auto p-4 flex flex-col justify-flex-start">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Icon className={`h-8 w-8 ${colorClass} opacity-30 mb-2`} />
              <p className="text-sm">No active {type.toLowerCase()}</p>
            </div>
          ) : (
            <div className={`grid gap-3 ${isBoardOrAbove && !isMobile ? 'grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : type === 'Classes' && !isMobile && !isBoardOrAbove ? 'grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
              {items.map((item) => {
                const status = 'project_members' in item ? getProjectStatus(item, isBoardOrAbove) : getClassStatus(item, isBoardOrAbove);
                const count = 'project_members' in item ? item.project_members[0].count : item.class_enrollments[0].count;

                return (
                  <Card key={item.id} className="w-full border bg-card hover:bg-primary/5 transition-colors cursor-pointer" onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    navigate(link);
                  }}>
                    <CardHeader className={`${isMobile ? "p-5" : "xl:p-5 lg:p-3 md:p-4"} !pb-0`}>
                      <div className="flex items-center justify-start justify-between gap-2">
                        <div className="flex flex-col items-left gap-1 w-[60%]">
                          <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
                          {item.description && <p className="text-[14px] text-muted-foreground line-clamp-1 max-w-[50%] overflow-hidden">{item.description}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
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
                    <CardContent className={`${isMobile ? "p-5" : "xl:p-5 lg:p-3 md:p-4"} !pt-0 space-y-1`}>
                      <div className="flex items-center justify-between text-[14px] text-muted-foreground mt-1">
                        {'client_name' in item && item.client_name && (
                          <span className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            <span className="capitalize">{item.client_name}</span>
                          </span>
                        )}
                        {'location' in item && item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="capitalize">{item.location}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>
                            {count} {isProject
                              ? (count === 1 ? 'member' : 'members')
                              : (count === 1 ? 'student' : 'students')}
                          </span>
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
  };

  return (
    <div
      className="flex flex-col h-full w-full p-4 gap-4 overflow-y-auto justify-center">
      {/* 1. Header */}
      <div className="shrink-0">
        <WelcomeCard />
      </div>

      {/* 2. Stats */}
      <div className="shrink-0">
        <StatsGrid />
      </div>

      {/* 3. Main Content Grid */}
      <div
        className={`grid flex-1 min-h-0 ${isMobile
          ? 'grid-cols-1 gap-4'
          : 'md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-y-4 xl:gap-y-4'
          }`}
      >
        <div
          className={`${isMobile ? 'h-[250px]' : 'min-h-0'
            } ${isMobile ? '' : 'md:col-span-1 md:row-span-2 xl:col-span-1 xl:row-span-2'}`}
        >
          <EventsCard />
        </div>

        <div
          className={`h-full ${isMobile ? 'h-[250px]' : 'min-h-[250px]'
            } md:col-span-1 xl:col-span-2`}
        >
          <ResourceCard type="Projects" />
        </div>

        <div
          className={`h-full ${isMobile ? 'h-[250px]' : 'min-h-[250px]'
            } md:col-span-1 xl:col-span-2`}
        >
          <ResourceCard type="Classes" />
        </div>
      </div>
    </div>
  );
}