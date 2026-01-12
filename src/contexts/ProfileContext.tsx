import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/database.types';

// Types
type Project = Database['public']['Tables']['projects']['Row'];
type ProjectMember = Database['public']['Tables']['project_members']['Row'];
type Class = Database['public']['Tables']['classes']['Row'];
type ClassEnrollment = Database['public']['Tables']['class_enrollments']['Row'];
type Application = Database['public']['Tables']['applications']['Row'];
type EventAttendance = Database['public']['Tables']['event_attendance']['Row'];
type EventCheckin = Database['public']['Tables']['event_checkins']['Row'];
type UserRole = Database['public']['Enums']['app_role'];

interface UserProjects {
    projects: Project[];
    memberships: ProjectMember[];
    leadProjects: Project[];
    memberProjects: Project[];
    count: number;
}

interface UserClasses {
    classes: Class[];
    enrollments: ClassEnrollment[];
    teachingClasses: Class[];
    studentClasses: Class[];
    count: number;
}

interface UserApplications {
    applications: Application[];
    pending: Application[];
    accepted: Application[];
    rejected: Application[];
    counts: {
        pending: number;
        accepted: number;
        rejected: number;
    };
}

interface UserEvents {
    checkins: EventCheckin[];
    rsvps: EventAttendance[];
    checkinCount: number;
    rsvpCount: number;
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
    role: UserRole | null;
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
    projects: UserProjects | undefined;
    projectsLoading: boolean;

    // Classes
    classes: UserClasses | undefined;
    classesLoading: boolean;

    // Applications
    applications: UserApplications | undefined;
    applicationsLoading: boolean;

    // Events
    events: UserEvents | undefined;
    eventsLoading: boolean;

    // Aggregated stats (counts only, no points)
    stats: UserStats | undefined;

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
async function fetchUserRole(userId: string): Promise<UserRole> {
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
            memberProjects: [],
            count: 0,
        };
    }

    // Fetch full project details
    const projectIds = memberships.map(m => m.project_id);
    const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('start_date', { ascending: false });

    if (projectsError) throw projectsError;

    const projectsMap = new Map(projects?.map(p => [p.id, p]) || []);

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
        memberProjects,
        count: projects?.length || 0,
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
            count: 0,
        };
    }

    // Fetch full class details
    const classIds = enrollments.map(e => e.class_id);
    const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .in('id', classIds)
        .order('start_date', { ascending: false });

    if (classesError) throw classesError;

    const classesMap = new Map(classes?.map(c => [c.id, c]) || []);

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
        count: classes?.length || 0,
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
        rejected,
        counts: {
            pending: pending.length,
            accepted: accepted.length,
            rejected: rejected.length,
        },
    };
}

async function fetchUserEvents(userId: string): Promise<UserEvents> {
    // Fetch check-ins (verified attendance via QR code)
    const checkinsPromise = supabase
        .from('event_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('checked_in_at', { ascending: false });

    // Fetch RSVPs (planned attendance)
    const rsvpsPromise = supabase
        .from('event_attendance')
        .select('*')
        .eq('user_id', userId)
        .order('rsvped_at', { ascending: false });

    const [checkinsRes, rsvpsRes] = await Promise.all([checkinsPromise, rsvpsPromise]);

    if (checkinsRes.error) throw checkinsRes.error;
    if (rsvpsRes.error) throw rsvpsRes.error;

    return {
        checkins: checkinsRes.data || [],
        rsvps: rsvpsRes.data || [],
        checkinCount: checkinsRes.data?.length || 0,
        rsvpCount: rsvpsRes.data?.length || 0,
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
        data: projects,
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
        data: classes,
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
        data: applications,
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
        data: events,
        isLoading: eventsLoading,
        refetch: refetchEvents,
    } = useQuery({
        queryKey: ['user-events', user?.id],
        queryFn: () => fetchUserEvents(user!.id),
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes (events change less frequently)
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

        // Subscribe to event check-in changes
        const checkinsChannel = supabase
            .channel(`user_checkins_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'event_checkins',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    refetchEvents();
                }
            )
            .subscribe();

        // Subscribe to RSVP changes
        const rsvpsChannel = supabase
            .channel(`user_rsvps_${user.id}`)
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
            checkinsChannel.unsubscribe();
            rsvpsChannel.unsubscribe();
        };
    }, [user?.id, refetchRole, refetchProjects, refetchClasses, refetchApplications, refetchEvents]);

    // Computed stats (counts only, no points!)
    const stats: UserStats | undefined = user ? {
        totalProjects: projects?.count || 0,
        totalClasses: classes?.count || 0,
        totalEventsAttended: events?.checkinCount || 0,
        totalRSVPs: events?.rsvpCount || 0,
        pendingApplications: applications?.counts.pending || 0,
    } : undefined;

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

    const loading = roleLoading || projectsLoading || classesLoading || applicationsLoading || eventsLoading;

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
                projects,
                projectsLoading,
                classes,
                classesLoading,
                applications,
                applicationsLoading,
                events,
                eventsLoading,
                stats,
                refreshProjects,
                refreshClasses,
                refreshApplications,
                refreshEvents,
                refreshAll,
                loading,
            }}
        >
            {children}
        </ProfileContext.Provider>
    );
};