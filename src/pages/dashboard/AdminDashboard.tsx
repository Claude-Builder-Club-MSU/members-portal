import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/database.types';

type Event = Database['public']['Tables']['events']['Row'];
type Project = Database['public']['Tables']['projects']['Row'] & {
    semesters: { code: string; name: string } | null;
};
type Class = Database['public']['Tables']['classes']['Row'] & {
    semesters: { code: string; name: string } | null;
};

const AdminDashboard = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [memberCount, setMemberCount] = useState(0);
    const [prospectCount, setProspectCount] = useState(0);
    const [boardCount, setBoardCount] = useState(0);
    const [eBoardCount, setEBoardCount] = useState(0);
    const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        // Fetch role counts
        const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role');

        if (rolesData) {
            const members = rolesData.filter(r => r.role === 'member').length;
            const prospects = rolesData.filter(r => r.role === 'prospect').length;
            const board = rolesData.filter(r => r.role === 'board').length;
            const eBoard = rolesData.filter(r => r.role === 'e-board').length;

            setMemberCount(members);
            setProspectCount(prospects);
            setBoardCount(board);
            setEBoardCount(eBoard);
        }

        // Fetch upcoming events
        const { data: eventsData } = await supabase
            .from('events')
            .select('*')
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true })
            .limit(10);

        if (eventsData) setUpcomingEvents(eventsData);

        // Fetch all projects with semester info
        const { data: projectsData } = await supabase
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

        if (projectsData) setProjects(projectsData as Project[]);

        // Fetch all classes with semester info
        const { data: classesData } = await supabase
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

        if (classesData) setClasses(classesData as Class[]);

        setLoading(false);
    };

    const getEventTypeLabel = (event: Event) => {
        const allRoles: Database['public']['Enums']['app_role'][] = ['prospect', 'member', 'board', 'e-board'];
        const isOpen = allRoles.every(r => event.allowed_roles.includes(r));
        return isOpen ? 'Open' : 'Closed';
    };

    const getProjectStatus = (project: Project) => {
        const now = new Date();
        const startDate = new Date(project.start_date);
        const endDate = new Date(project.end_date);

        if (startDate > now) return { label: 'Open for Enrollment', color: 'bg-green-500' };
        if (endDate < now) return { label: 'Completed', color: 'bg-gray-500' };
        return { label: 'In Progress', color: 'bg-blue-500' };
    };

    const getClassStatus = (cls: Class) => {
        const now = new Date();
        const startDate = new Date(cls.start_date);
        const endDate = new Date(cls.end_date);

        if (startDate > now) return { label: 'Open for Enrollment', color: 'bg-green-500' };
        if (endDate < now) return { label: 'Completed', color: 'bg-gray-500' };
        return { label: 'In Progress', color: 'bg-blue-500' };
    };

    return (
        <div className={`min-h-[calc(100vh-56px)] flex flex-col justify-center ${isMobile ? 'p-4 space-y-6' : 'p-6 space-y-8'}`}>
            {/* Welcome Header with Claude Keyboard Glyph */}
            <div
                className={`relative rounded-xl bg-gradient-to-br border border-primary/20 dark:border-primary/30 overflow-hidden ${isMobile ? 'p-6' : 'p-8'} opacity-80`}
                style={{
                    backgroundImage: 'linear-gradient(to bottom right, #f4ccc2, #f4c7a8)',
                }}
            >
                {/* Keyboard Glyph Background */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 dark:opacity-5 pointer-events-none">
                    <svg
                        viewBox="0 0 200 200"
                        className="w-96 h-96 text-primary/60"
                        fill="currentColor"
                    >
                        {/* Keyboard glyph - simplified Claude icon style */}
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

                {/* Content */}
                <div className="relative z-10 text-center">
                    <h1
                        className={`${isMobile ? 'text-4xl' : 'text-5xl'} mb-2 font-black text-primary dark:text-primary/80 drop-shadow-lg tracking-tight`}
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

            {/* Main Content Grid */}
            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
                {/* Upcoming Events - Takes full height */}
                <div className={isMobile ? 'order-2' : 'lg:col-span-1'}>
                    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Calendar className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">Upcoming Events</CardTitle>
                                        <CardDescription>All scheduled events</CardDescription>
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
                            ) : upcomingEvents.length === 0 ? (
                                <div className="flex flex-col justify-center items-center h-full">
                                    <p className="text-sm text-muted-foreground py-8 text-center">No upcoming events</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingEvents.map((event) => (
                                        <div key={event.id} className="p-3 rounded-lg border bg-card hover:bg-primary/50 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <p className="font-medium text-sm">{event.name}</p>
                                                <Badge variant={event.rsvp_required ? 'default' : 'secondary'} className="shrink-0 ml-2">
                                                    {getEventTypeLabel(event)}
                                                </Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(event.event_date), 'MMM d, yyyy • h:mm a')}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {event.location}
                                                </p>
                                                {event.points > 0 && (
                                                    <p className="text-xs text-primary flex items-center gap-1 font-medium">
                                                        <Trophy className="h-3 w-3" />
                                                        +{event.points} points
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

                {/* Projects and Classes - Stack vertically on the right */}
                <div className={`${isMobile ? 'order-1' : 'lg:col-span-2'} space-y-6`}>
                    {/* Projects Widget */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">Recent Projects</CardTitle>
                                        <CardDescription>{projects.length} total projects</CardDescription>
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
                                            <div key={project.id} className="relative p-3 rounded-lg border bg-card hover:bg-primary/50 transition-colors">
                                                <Badge className={`absolute top-2 right-2 ${status.color} text-white text-xs`}>
                                                    {status.label}
                                                </Badge>
                                                <p className="font-medium text-sm mb-1 pr-24">{project.name}</p>
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
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Classes Widget */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg">
                                        <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">Recent Classes</CardTitle>
                                        <CardDescription>{classes.length} total classes</CardDescription>
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
                                            <div key={cls.id} className="relative p-3 rounded-lg border bg-card hover:bg-primary/50 transition-colors">
                                                <Badge className={`absolute top-2 right-2 ${status.color} text-white text-xs`}>
                                                    {status.label}
                                                </Badge>
                                                <p className="font-medium text-sm mb-1 pr-24">{cls.name}</p>
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
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;