import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/database.types';

export type Project = Database['public']['Tables']['projects']['Row'] & {
    semesters: { code: string; name: string; start_date: string; end_date: string } | null;
    project_members: { count: number }[];
};

export type Class = Database['public']['Tables']['classes']['Row'] & {
    semesters: { code: string; name: string; start_date: string; end_date: string } | null;
    class_enrollments: { count: number }[];
};

type Application = Database['public']['Tables']['applications']['Row'];
type Event = Database['public']['Tables']['events']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface UserProjects {
    inProgress: Project[];
    assigned: Project[];
    completed: Project[];
    available: Project[];
}

interface UserClasses {
    inProgress: Class[];
    enrolled: Class[];
    completed: Class[];
    available: Class[];
}

interface UserApplications {
    self: {
        accepted: Application[];
        rejected: Application[];
        pending: Application[];
    };
    review: {
        accepted: Application[];
        rejected: Application[];
        pending: Application[];
    };
}

interface UserEvents {
    attending: Event[];
    notAttending: Event[];
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
    // Fetch all project memberships for this user
    const { data: memberships, error: membershipsError } = await supabase
        .from('project_members')
        .select('*')
        .eq('user_id', userId);

    if (membershipsError) throw membershipsError;

    // Fetch all projects with semester data (for available calculation)
    const { data: allProjects, error: allProjectsError } = await supabase
        .from('projects')
        .select(`*, semesters (code, name, start_date, end_date), project_members(count)`);

    if (allProjectsError) throw allProjectsError;

    const now = new Date();

    // Map membership by project id for quick lookup
    const userProjectsMap = new Map();
    if (memberships && memberships.length) {
        for (const membership of memberships) {
            userProjectsMap.set(membership.project_id, membership);
        }
    }

    // Prepare buckets and set for "involved" project ids
    const inProgress: Project[] = [];
    const assigned: Project[] = [];
    const completed: Project[] = [];
    const involvedProjectIds = new Set<string>();

    for (const project of allProjects ?? []) {
        const membership = userProjectsMap.get(project.id);

        // Only process further if user is a member of the project
        if (!membership) continue;

        involvedProjectIds.add(project.id);

        // Defensive: skip if no semesters data
        if (!project.semesters) continue;

        const semesters = project.semesters;
        const startDate = semesters.start_date ? new Date(semesters.start_date) : null;
        const endDate = semesters.end_date ? new Date(semesters.end_date) : null;

        // inProgress: now >= start_date && now <= end_date
        if (startDate && endDate && now >= startDate && now <= endDate) {
            inProgress.push(project);
        }
        // assigned: project not started yet (now < start_date)
        else if (startDate && now < startDate) {
            assigned.push(project);
        }
        // completed: project end_date has passed
        else if (endDate && now > endDate) {
            completed.push(project);
        }
        // Defensive: If dates missing, fallback
        else if (startDate && !endDate) {
            if (now < startDate) {
                assigned.push(project);
            } else {
                inProgress.push(project);
            }
        } else if (!startDate && endDate) {
            if (now > endDate) {
                completed.push(project);
            } else {
                inProgress.push(project);
            }
        }
    }

    // Available: all projects NOT in involvedProjectIds
    const available: Project[] = (allProjects ?? []).filter(project => !involvedProjectIds.has(project.id));

    return {
        inProgress,
        assigned,
        completed,
        available,
    };
}

async function fetchUserClasses(userId: string): Promise<UserClasses> {
    // Fetch class enrollments for this user
    const { data: enrollments, error: enrollmentsError } = await supabase
        .from('class_enrollments')
        .select('*')
        .eq('user_id', userId);

    if (enrollmentsError) throw enrollmentsError;

    // Fetch all classes with semesters (for available calculation)
    const { data: allClasses, error: allClassesError } = await supabase
        .from('classes')
        .select(`*, semesters (code, name, start_date, end_date), class_enrollments(count)`)

    if (allClassesError) throw allClassesError;

    const now = new Date();

    // Map enrollment by class id for quick lookup
    const userClassesMap = new Map();
    if (enrollments && enrollments.length) {
        for (const enrollment of enrollments) {
            userClassesMap.set(enrollment.class_id, enrollment);
        }
    }

    // Prepare buckets and set for "involved" class ids
    const inProgress: Class[] = [];
    const enrolled: Class[] = [];
    const completed: Class[] = [];
    const involvedClassIds = new Set<string>();

    for (const classItem of allClasses ?? []) {
        const enrollment = userClassesMap.get(classItem.id);

        // Only process further if user is enrolled (teacher OR student role)
        if (!enrollment) continue;

        involvedClassIds.add(classItem.id);

        // Defensive: skip if no semesters data
        if (!classItem.semesters) continue;

        const semesters = classItem.semesters;
        const startDate = semesters.start_date ? new Date(semesters.start_date) : null;
        const endDate = semesters.end_date ? new Date(semesters.end_date) : null;

        // inProgress: now >= start_date && now <= end_date
        if (startDate && endDate && now >= startDate && now <= endDate) {
            inProgress.push(classItem);
        }
        // enrolled: class not started yet (now < start_date)
        else if (startDate && now < startDate) {
            enrolled.push(classItem);
        }
        // completed: class end_date has passed
        else if (endDate && now > endDate) {
            completed.push(classItem);
        }
        // Defensive: If dates missing, fallback
        else if (startDate && !endDate) {
            if (now < startDate) {
                enrolled.push(classItem);
            } else {
                inProgress.push(classItem);
            }
        } else if (!startDate && endDate) {
            if (now > endDate) {
                completed.push(classItem);
            } else {
                inProgress.push(classItem);
            }
        }
    }

    // Available: all classes NOT in involvedClassIds
    const available: Class[] = (allClasses ?? []).filter(classItem => !involvedClassIds.has(classItem.id));

    return {
        inProgress,
        enrolled,
        completed,
        available,
    };
}

async function fetchUserApplications(userId: string, role: AppRole): Promise<UserApplications> {
    // Fetch user's own applications
    const { data: ownApplications, error: ownError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (ownError) throw ownError;

    // Categorize user's own applications
    const self = {
        pending: ownApplications?.filter(a => a.status === 'pending') || [],
        accepted: ownApplications?.filter(a => a.status === 'accepted') || [],
        rejected: ownApplications?.filter(a => a.status === 'rejected') || [],
    };

    // Initialize review categories
    const review = {
        accepted: [] as Application[],
        rejected: [] as Application[],
        pending: [] as Application[],
    };

    // Fetch applications the user can review based on their role
    if (role === 'e-board' || role === 'board') {
        // Build query for applications user can review
        let reviewQuery = supabase
            .from('applications')
            .select('*')
            .neq('user_id', userId) // Exclude own applications
            .order('created_at', { ascending: false });

        // Board members can only review project and class applications
        if (role === 'board') {
            reviewQuery = reviewQuery.in('application_type', ['project', 'class']);
        }
        // e-board can review all applications

        const { data: reviewableApplications, error: reviewError } = await reviewQuery;

        if (reviewError) throw reviewError;

        if (reviewableApplications) {
            // Categorize reviewable applications
            review.pending = reviewableApplications.filter(a => a.status === 'pending');
            review.accepted = reviewableApplications.filter(a => a.status === 'accepted' && a.reviewed_by === userId);
            review.rejected = reviewableApplications.filter(a => a.status === 'rejected' && a.reviewed_by === userId);
        }
    }

    return {
        self,
        review
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
            rsvpCounts = (rsvpCountsData || []).reduce((acc: Record<string, number>, row) => {
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
        queryKey: ['user-applications', user?.id, role],
        queryFn: () => fetchUserApplications(user!.id, role!),
        enabled: !!user && !!role,
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