import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/database.types';

// Types
type Project = Database['public']['Tables']['projects']['Row'] & {
    semesters: { start_date: string } | null;
};
type ProjectMember = Database['public']['Tables']['project_members']['Row'];
type Class = Database['public']['Tables']['classes']['Row'] & {
    semesters: { start_date: string } | null;
};
type ClassEnrollment = Database['public']['Tables']['class_enrollments']['Row'];
type Application = Database['public']['Tables']['applications']['Row'];
type Event = Database['public']['Tables']['events']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface UserProjects {
    projects: Project[];
    memberships: ProjectMember[];
    leadProjects: Project[];
    memberProjects: Project[];
}

interface UserClasses {
    classes: Class[];
    enrollments: ClassEnrollment[];
    teachingClasses: Class[];
    studentClasses: Class[];
}

interface UserApplications {
    applications: Application[];
    pending: Application[];
    accepted: Application[];
    rejected: Application[];
}

interface UserEvents {
    attending: Event[];
    notAttending: Event[];
}

interface UserStats {
    totalProjects: number;
    totalClasses: number;
    totalEventsAttended: number;
    totalRSVPs: number;
    pendingApplications: number;
}

interface ProfileContextType {
    // Role & Permissions
    role: AppRole | null;
    roleLoading: boolean;
    isEBoard: boolean;
    isBoard: boolean;
    isBoardOrAbove: boolean;
    canManageRoles: boolean;
    canManageApplications: boolean;
    canManageProjects: boolean;
    canManageClasses: boolean;
    canManageEvents: boolean;

    // Projects
    userProjects: UserProjects | undefined;
    projectsLoading: boolean;

    // Classes
    userClasses: UserClasses | undefined;
    classesLoading: boolean;

    // Applications
    userApplications: UserApplications | undefined;
    applicationsLoading: boolean;

    // Events
    userEvents: UserEvents | undefined;
    eventsLoading: boolean;

    // Refresh functions
    refreshProjects: () => Promise<void>;
    refreshClasses: () => Promise<void>;
    refreshApplications: () => Promise<void>;
    refreshEvents: () => Promise<void>;
    refreshAll: () => Promise<void>;

    // Overall loading state
    loading: boolean;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error('useProfile must be used within ProfileProvider');
    }
    return context;
};

// Data fetching functions
async function fetchUserRole(userId: string): Promise<AppRole> {
    const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error('Error fetching role:', error);
        return 'prospect'; // Default fallback
    }

    return data?.role || 'prospect';
}

async function fetchUserProjects(userId: string): Promise<UserProjects> {
    // Fetch project memberships
    const { data: memberships, error: membershipsError } = await supabase
        .from('project_members')
        .select('*')
        .eq('user_id', userId);

    if (membershipsError) throw membershipsError;

    if (!memberships || memberships.length === 0) {
        return {
            projects: [],
            memberships: [],
            leadProjects: [],
            memberProjects: []
        };
    }

    // Fetch full project details
    const projectIds = memberships.map(m => m.project_id);
    const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
            *,
            semesters (
                start_date
            )
        `)
        .in('id', projectIds);

    if (projectsError) throw projectsError;

    // Sort projects by semester start date (most recent first)
    const sortedProjects = projects?.sort((a, b) => {
        const aStart = a.semesters?.start_date ? new Date(a.semesters.start_date) : new Date(0);
        const bStart = b.semesters?.start_date ? new Date(b.semesters.start_date) : new Date(0);
        return bStart.getTime() - aStart.getTime();
    }) || [];

    const projectsMap = new Map(sortedProjects.map(p => [p.id, p]));

    const leadProjects: Project[] = [];
    const memberProjects: Project[] = [];

    memberships.forEach(membership => {
        const project = projectsMap.get(membership.project_id);
        if (project) {
            if (membership.role === 'lead') {
                leadProjects.push(project);
            } else {
                memberProjects.push(project);
            }
        }
    });

    return {
        projects: projects || [],
        memberships: memberships || [],
        leadProjects,
        memberProjects
    };
}

async function fetchUserClasses(userId: string): Promise<UserClasses> {
    // Fetch class enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
        .from('class_enrollments')
        .select('*')
        .eq('user_id', userId);

    if (enrollmentsError) throw enrollmentsError;

    if (!enrollments || enrollments.length === 0) {
        return {
            classes: [],
            enrollments: [],
            teachingClasses: [],
            studentClasses: [],
        };
    }

    // Fetch full class details
    const classIds = enrollments.map(e => e.class_id);
    const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select(`
            *,
            semesters (
                start_date
            )
        `)
        .in('id', classIds);

    if (classesError) throw classesError;

    // Sort classes by semester start date (most recent first)
    const sortedClasses = classes?.sort((a, b) => {
        const aStart = a.semesters?.start_date ? new Date(a.semesters.start_date) : new Date(0);
        const bStart = b.semesters?.start_date ? new Date(b.semesters.start_date) : new Date(0);
        return bStart.getTime() - aStart.getTime();
    }) || [];

    const classesMap = new Map(sortedClasses.map(c => [c.id, c]));

    const teachingClasses: Class[] = [];
    const studentClasses: Class[] = [];

    enrollments.forEach(enrollment => {
        const classItem = classesMap.get(enrollment.class_id);
        if (classItem) {
            if (enrollment.role === 'teacher') {
                teachingClasses.push(classItem);
            } else {
                studentClasses.push(classItem);
            }
        }
    });

    return {
        classes: classes || [],
        enrollments: enrollments || [],
        teachingClasses,
        studentClasses,
    };
}

async function fetchUserApplications(userId: string): Promise<UserApplications> {
    const { data: applications, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    const pending = applications?.filter(a => a.status === 'pending') || [];
    const accepted = applications?.filter(a => a.status === 'accepted') || [];
    const rejected = applications?.filter(a => a.status === 'rejected') || [];

    return {
        applications: applications || [],
        pending,
        accepted,
        rejected
    };
}

async function fetchUserEvents(userId: string, role: AppRole): Promise<UserEvents> {
    // 1. Get all events the user has RSVPd for
    const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('event_attendance')
        .select('event_id')
        .eq('user_id', userId);

    if (attendanceError) throw attendanceError;
    const attendedEventIds = (attendanceRecords || []).map(e => e.event_id);

    // 2. Get all events relevant to the user and their role
    const { data: allEvents, error: allEventsError } = await supabase
        .from('events')
        .select('*')
        .contains('allowed_roles', [role])
        .order('event_date', { ascending: false });

    if (allEventsError) throw allEventsError;

    // Utility to get RSVP count for a set of events
    let rsvpCounts: Record<string, number> = {};
    if (allEvents && allEvents.length > 0) {
        const eventIds = allEvents.filter(e => e.rsvp_required).map(e => e.id);
        if (eventIds.length > 0) {
            const { data: rsvpCountsData, error: rsvpCountsError } = await supabase
                .from('event_attendance')
                .select('event_id', { count: 'exact', head: false })
                .in('event_id', eventIds);
            if (rsvpCountsError) throw rsvpCountsError;
            // rsvpCountsData will be an array of rows, so we need to count the number of rows per event_id
            rsvpCounts = (rsvpCountsData || []).reduce((acc: Record<string, number>, row: any) => {
                acc[row.event_id] = (acc[row.event_id] || 0) + 1;
                return acc;
            }, {});
        }
    }

    // 3. Split events into attending and notAttending
    const attending: Event[] = [];
    const notAttending: Event[] = [];

    (allEvents || []).forEach(event => {
        const isRSVPd = attendedEventIds.includes(event.id);
        if (!event.rsvp_required) {
            // Public event, included in attending if user's role is allowed
            attending.push(event);
        } else if (isRSVPd) {
            // User has RSVPd
            attending.push(event);
        } else {
            // RSVP event, user has NOT RSVPd, check if event is full
            const rsvpCount = rsvpCounts[event.id] || 0;

            if (rsvpCount < event.max_attendance) {
                notAttending.push(event);
            }
        }
    });

    return {
        attending,
        notAttending
    };
}

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();

    // Fetch user's role
    const {
        data: role,
        isLoading: roleLoading,
        refetch: refetchRole,
    } = useQuery({
        queryKey: ['user-role', user?.id],
        queryFn: () => fetchUserRole(user!.id),
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes (role changes infrequently)
        gcTime: 1000 * 60 * 10,
    });

    // Fetch user's projects
    const {
        data: userProjects,
        isLoading: projectsLoading,
        refetch: refetchProjects,
    } = useQuery({
        queryKey: ['user-projects', user?.id],
        queryFn: () => fetchUserProjects(user!.id),
        enabled: !!user,
        staleTime: 1000 * 60 * 2, // 2 minutes
        gcTime: 1000 * 60 * 5, // 5 minutes
    });

    // Fetch user's classes
    const {
        data: userClasses,
        isLoading: classesLoading,
        refetch: refetchClasses,
    } = useQuery({
        queryKey: ['user-classes', user?.id],
        queryFn: () => fetchUserClasses(user!.id),
        enabled: !!user,
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 5,
    });

    // Fetch user's applications
    const {
        data: userApplications,
        isLoading: applicationsLoading,
        refetch: refetchApplications,
    } = useQuery({
        queryKey: ['user-applications', user?.id],
        queryFn: () => fetchUserApplications(user!.id),
        enabled: !!user,
        staleTime: 1000 * 60 * 1, // 1 minute (applications change more frequently)
        gcTime: 1000 * 60 * 5,
    });

    // Fetch user's event attendance
    const {
        data: userEvents,
        isLoading: eventsQueryLoading,
        refetch: refetchEvents,
    } = useQuery({
        queryKey: ['user-events', user?.id, role],
        queryFn: () => fetchUserEvents(user!.id, role!),
        enabled: !!user && !!role,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
    });

    // Real-time subscriptions for automatic updates
    useEffect(() => {
        if (!user) return;

        // Subscribe to role changes
        const roleChannel = supabase
            .channel(`user_role_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_roles',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    refetchRole();
                }
            )
            .subscribe();

        // Subscribe to project member changes
        const projectsChannel = supabase
            .channel(`user_projects_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'project_members',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    refetchProjects();
                }
            )
            .subscribe();

        // Subscribe to class enrollment changes
        const classesChannel = supabase
            .channel(`user_classes_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'class_enrollments',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    refetchClasses();
                }
            )
            .subscribe();

        // Subscribe to application changes
        const applicationsChannel = supabase
            .channel(`user_applications_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'applications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    refetchApplications();
                }
            )
            .subscribe();

        // Subscribe to event record changes (both RSVPs and check-ins)
        const eventRecordsChannel = supabase
            .channel(`user_event_records_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'event_attendance',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    refetchEvents();
                }
            )
            .subscribe();

        return () => {
            roleChannel.unsubscribe();
            projectsChannel.unsubscribe();
            classesChannel.unsubscribe();
            applicationsChannel.unsubscribe();
            eventRecordsChannel.unsubscribe();
        };
    }, [user?.id, refetchRole, refetchProjects, refetchClasses, refetchApplications, refetchEvents]);

    // Computed permission helpers
    const isEBoard = role === 'e-board';
    const isBoard = role === 'board';
    const isBoardOrAbove = role === 'board' || role === 'e-board';
    const canManageRoles = role === 'e-board';
    const canManageApplications = role === 'board' || role === 'e-board';
    const canManageProjects = role === 'e-board' || role === 'board';
    const canManageClasses = role === 'board' || role === 'e-board';
    const canManageEvents = role === 'board' || role === 'e-board';

    // Refresh functions
    const refreshProjects = async () => {
        await refetchProjects();
    };

    const refreshClasses = async () => {
        await refetchClasses();
    };

    const refreshApplications = async () => {
        await refetchApplications();
    };

    const refreshEvents = async () => {
        await refetchEvents();
    };

    const refreshAll = async () => {
        await Promise.all([
            refetchProjects(),
            refetchClasses(),
            refetchApplications(),
            refetchEvents(),
        ]);
    };

    return (
        <ProfileContext.Provider
            value={{
                role: role || null,
                roleLoading,
                isEBoard,
                isBoard,
                isBoardOrAbove,
                canManageRoles,
                canManageApplications,
                canManageProjects,
                canManageClasses,
                canManageEvents,
                userProjects,
                projectsLoading,
                userClasses,
                classesLoading,
                userApplications,
                applicationsLoading,
                userEvents,
                eventsLoading: roleLoading || eventsQueryLoading || (user && !role),
                refreshProjects,
                refreshClasses,
                refreshApplications,
                refreshEvents,
                refreshAll,
                loading: roleLoading || projectsLoading || classesLoading || applicationsLoading || eventsQueryLoading
            }}
        >
            {children}
        </ProfileContext.Provider>
    );
};