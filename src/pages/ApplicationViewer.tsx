import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    ExternalLink,
    Calendar,
    GraduationCap,
    FileText,
    Trash2,
    Info,
    Briefcase,
    BookOpen,
    PartyPopper,
    BookUser,
    Github,
    MapPin,
    Users,
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileViewer from '@/components/modals/ProfileViewer';
import { DetailModal } from '@/components/modals/DetailModal';
import type { Database } from '@/integrations/supabase/database.types';
import type { DetailSection } from '@/types/modal.types';
import { useProfile } from '@/contexts/ProfileContext';

type Application = Database['public']['Tables']['applications']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface MemberWithRole extends Profile {
    role: AppRole;
}

const ApplicationViewerPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const { user } = useAuth();
    const { role } = useProfile();

    // State
    const [application, setApplication] = useState<Application | null>(null);
    const [applicantProfile, setApplicantProfile] = useState<MemberWithRole | null>(null);
    const [classData, setClassData] = useState<any | null>(null);
    const [projectData, setProjectData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    // Success/Rejection screen states
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);
    const [showRejectionScreen, setShowRejectionScreen] = useState(false);

    useEffect(() => {
        if (id) {
            fetchApplication();
        }
    }, [id]);

    const fetchApplication = async () => {
        if (!id) return;

        try {
            const { data: appData, error: appError } = await supabase
                .from('applications')
                .select('*')
                .eq('id', id)
                .single();

            if (appError) throw appError;
            if (!appData) {
                toast({
                    title: 'Not Found',
                    description: 'Application not found.',
                    variant: 'destructive',
                });
                navigate('/dashboard/applications');
                return;
            }

            setApplication(appData);

            // Fetch applicant profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', appData.user_id)
                .single();

            if (profileData && !profileData.is_banned) {
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', appData.user_id)
                    .single();

                setApplicantProfile({
                    ...profileData,
                    role: roleData?.role || 'prospect',
                });
            }

            // Fetch class/project data
            if (appData.class_id) {
                const { data: classInfo } = await supabase
                    .from('classes')
                    .select(`
            *,
            semesters (
              code,
              name
            )
          `)
                    .eq('id', appData.class_id)
                    .single();

                if (classInfo) {
                    // Get enrollment count
                    const { count } = await supabase
                        .from('class_enrollments')
                        .select('*', { count: 'exact', head: true })
                        .eq('class_id', appData.class_id);

                    setClassData({ ...classInfo, memberCount: count || 0 });
                }
            }

            if (appData.project_id) {
                const { data: projectInfo } = await supabase
                    .from('projects')
                    .select(`
            *,
            semesters (
              code,
              name
            )
          `)
                    .eq('id', appData.project_id)
                    .single();

                if (projectInfo) {
                    // Get team member count
                    const { count } = await supabase
                        .from('project_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('project_id', appData.project_id);

                    setProjectData({ ...projectInfo, memberCount: count || 0 });
                }
            }
        } catch (error: any) {
            console.error('Error fetching application:', error);
            toast({
                title: 'Error',
                description: 'Failed to load application.',
                variant: 'destructive',
            });
            navigate('/dashboard/applications');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!user || !application) return;

        try {
            const { error } = await supabase
                .from('applications')
                .update({
                    status: 'accepted',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', application.id);

            if (error) throw error;

            // Show success screen
            setTimeout(() => {
                setShowSuccessScreen(true);
            }, 300);

            // Navigate back after showing success
            setTimeout(() => {
                navigate('/dashboard/applications');
            }, 3000);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleReject = async () => {
        if (!user || !application) return;

        try {
            const { error } = await supabase
                .from('applications')
                .update({
                    status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', application.id);

            if (error) throw error;

            // Show rejection screen
            setTimeout(() => {
                setShowRejectionScreen(true);
            }, 300);

            // Navigate back after showing rejection
            setTimeout(() => {
                navigate('/dashboard/applications');
            }, 3000);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleOpenDocument = async (filePath: string) => {
        console.log(filePath);
        try {
            const { data, error } = await supabase.storage
                .from('applications')
                .createSignedUrl(filePath, 3600);

            if (error) throw error;
            if (!data?.signedUrl) throw new Error('Failed to generate signed URL');

            window.open(data.signedUrl, '_blank');
        } catch (error: any) {
            toast({
                title: 'Error',
                description: 'Failed to open document.',
                variant: 'destructive',
            });
        }
    };

    const getStatusBadge = (status: string) => {
        const variants = {
            accepted: { variant: 'enable', text: 'Accepted' },
            rejected: { variant: 'destructive', text: 'Rejected' },
            pending: { variant: 'secondary', text: 'Pending' },
        };
        const config = variants[status as keyof typeof variants] || variants.pending;

        return (
            <Badge variant={config.variant as any} className="text-sm px-3 py-1">
                {config.text}
            </Badge>
        );
    };

    const getAcceptanceMessage = () => {
        if (!application) return '';

        const name = application.full_name;
        switch (application.application_type) {
            case 'board':
                return `Added ${name} to ${application.board_position || 'Board'}!`;
            case 'class':
                return `Enrolled ${name} in ${classData?.name || 'class'}!`;
            case 'project':
                return `Added ${name} to ${projectData?.name || 'project'}!`;
            default:
                return `Accepted ${name}'s application!`;
        }
    };

    const getDeletionInfo = () => {
        if (!application?.reviewed_at) return null;

        const reviewedDate = new Date(application.reviewed_at);
        const deletionDate = addDays(reviewedDate, 30);
        const daysRemaining = differenceInDays(deletionDate, new Date());

        if (daysRemaining < 0) return 'This application will be deleted soon.';

        return `This application will be automatically deleted in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''
            } (${format(deletionDate, 'MMM d, yyyy')}).`;
    };

    const buildDetailSections = (item: any, type: 'class' | 'project'): DetailSection[] => {
        const sections: DetailSection[] = [];

        // Description
        if (item.description) {
            sections.push({
                title: 'Description',
                content: <p className="whitespace-pre-wrap">{item.description}</p>,
            });
        }

        // Details Grid
        const gridItems = [];

        // Term
        if (item.semesters) {
            gridItems.push(
                <div key="term" className="space-y-2">
                    <h4 className="font-semibold text-sm">Term</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {item.semesters.code} - {item.semesters.name}
                    </div>
                </div>
            );
        }

        // Size
        gridItems.push(
            <div key="size" className="space-y-2">
                <h4 className="font-semibold text-sm">{type === 'class' ? 'Class Size' : 'Team Size'}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {item.memberCount || 0} {item.memberCount === 1 ? (type === 'class' ? 'student' : 'member') : type === 'class' ? 'students' : 'members'}
                </div>
            </div>
        );

        // Location (classes) or Repository (projects)
        if (type === 'class' && item.location) {
            gridItems.push(
                <div key="location" className="space-y-2">
                    <h4 className="font-semibold text-sm">Location</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {item.location}
                    </div>
                </div>
            );
        } else if (type === 'project' && item.repository_url) {
            gridItems.push(
                <div key="repo" className="space-y-2">
                    <h4 className="font-semibold text-sm">Repository</h4>
                    <a
                        href={item.repository_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                        <Github className="h-4 w-4" />
                        View on GitHub
                    </a>
                </div>
            );
        }

        sections.push({
            content: <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{gridItems}</div>,
            fullWidth: true,
            title: ''
        });

        return sections;
    };

    const renderApplicationFields = () => {
        if (!application) return null;

        const fields = {
            board: [
                { key: 'why_position', title: 'Why this position?' },
                { key: 'relevant_experience', title: 'Relevant Experience' },
                { key: 'previous_experience', title: 'Previous Board Experience' },
                { key: 'other_commitments', title: 'Other Commitments' },
            ],
            project: [
                { key: 'project_detail', title: 'Why this project?' },
                { key: 'relevant_experience', title: 'Relevant Technical Skills' },
                { key: 'problem_solved', title: 'Technical Challenge Overcome' },
                { key: 'other_commitments', title: 'Other Commitments' },
            ],
            class: [
                { key: 'relevant_experience', title: 'Relevant Experience' },
                { key: 'other_commitments', title: 'Other Commitments' },
            ],
        };

        const typeFields = fields[application.application_type as keyof typeof fields] || [];

        return typeFields.map(
            ({ key, title }) => {
                const value = application[key as keyof Application] as string;
                return (
                    <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                    >
                        <h3 className="font-semibold text-base">{title}</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {value || 'Not provided'}
                        </p>
                    </motion.div>
                );
            }
        );
    };

    const canReview = user && (role === 'board' || role === 'e-board') && application?.user_id !== user.id;
    const deletionInfo = getDeletionInfo();

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <Button variant="ghost" onClick={() => navigate('/dashboard/applications')} className="mb-6">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Applications
                    </Button>
                    <div className="space-y-6">
                        <Skeleton className="h-12 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!application) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Application Not Found</h1>
                    <Button onClick={() => navigate('/dashboard/applications')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Applications
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <AnimatePresence>
                {showSuccessScreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-green-500"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', duration: 0.6 }}
                            className="text-center text-white"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                            >
                                <CheckCircle className="w-32 h-32 mx-auto mb-6" />
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-4xl font-bold mb-2"
                            >
                                Application Accepted!
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="text-xl"
                            >
                                {getAcceptanceMessage()}
                            </motion.p>
                        </motion.div>

                        {/* Ripple effect */}
                        <motion.div
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 3, opacity: 0 }}
                            transition={{ duration: 1 }}
                            className="absolute inset-0 rounded-full bg-green-400"
                            style={{ transformOrigin: 'center' }}
                        />
                    </motion.div>
                )}

                {showRejectionScreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-red-500"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', duration: 0.6 }}
                            className="text-center text-white"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                            >
                                <XCircle className="w-32 h-32 mx-auto mb-6" />
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-4xl font-bold mb-2"
                            >
                                Application Rejected
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="text-xl"
                            >
                                {application.full_name}'s application has been declined
                            </motion.p>
                        </motion.div>

                        {/* Ripple effect */}
                        <motion.div
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 3, opacity: 0 }}
                            transition={{ duration: 1 }}
                            className="absolute inset-0 rounded-full bg-red-400"
                            style={{ transformOrigin: 'center' }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="min-h-screen bg-background">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <Button variant="ghost" onClick={() => navigate('/dashboard/applications')} className="mb-6 hover:bg-primary">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Applications
                        </Button>

                        <div>
                            <div className="flex items-center gap-6 flex-wrap">
                                <h1 className="text-4xl font-bold">{application.full_name}</h1>
                                {getStatusBadge(application.status)}
                            </div>
                        </div>
                    </motion.div>

                    {/* Main Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="lg:col-span-2 space-y-6"
                        >
                            {/* Deletion Warning */}
                            {deletionInfo && application.status !== 'pending' && (
                                <Alert className="bg-muted/50 border-muted-foreground/20">
                                    <AlertDescription className="text-sm flex gap-3 text-muted-foreground flex items-center min-h-7">
                                        <Info className={isMobile ? "h-10 w-10" : "h-4 w-4"} />
                                        <div className="flex items-center gap-2">
                                            {deletionInfo}
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Basic Information */}
                            <div className="bg-card border rounded-lg p-6 shadow-sm">
                                <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Class Year</p>
                                        <div className="flex items-center gap-2">
                                            <GraduationCap className="h-5 w-5 text-muted-foreground" />
                                            <p className="font-medium capitalize text-lg">{application.class_year}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Submitted</p>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-5 w-5 text-muted-foreground" />
                                            <p className="font-medium text-lg">{format(new Date(application.created_at), 'MMM d, yyyy')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Application Target */}
                                {((application.application_type === 'board' && application.board_position) ||
                                    (application.application_type === 'class' && classData) ||
                                    (application.application_type === 'project' && projectData)) && (
                                        <>
                                            <Separator className="my-4" />
                                            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                                                <p className="text-sm font-medium mb-3 text-muted-foreground">
                                                    {application.application_type === 'board' && 'Position Applied For'}
                                                    {application.application_type === 'class' && 'Class Applied For'}
                                                    {application.application_type === 'project' && 'Project Applied For'}
                                                </p>
                                                <div
                                                    className={`grid ${
                                                        isMobile ? 'grid-rows-2 justify-items-center gap-3' : 'grid-cols-2 gap-6'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {application.application_type === 'board' && <Briefcase className="h-5 w-5" />}
                                                        {application.application_type === 'class' && <BookOpen className="h-5 w-5" />}
                                                        {application.application_type === 'project' && <Briefcase className="h-5 w-5" />}
                                                        <p className="text-lg font-semibold">
                                                            {application.application_type === 'board' && application.board_position}
                                                            {application.application_type === 'class' && classData?.name}
                                                            {application.application_type === 'project' && projectData?.name}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {application.application_type === 'class' && application.class_role && (
                                                            <>
                                                                <BookUser className="h-5 w-5 text-muted-foreground" />
                                                                <span className="text-lg font-semibold capitalize">
                                                                    {application.class_role.replace('_', ' ')}
                                                                </span>
                                                            </>
                                                        )}
                                                        {application.application_type === 'project' && application.project_role && (
                                                            <>
                                                                <BookUser className="h-5 w-5 text-muted-foreground" />
                                                                <span className="text-lg font-semibold capitalize">
                                                                    {application.project_role.replace('_', ' ')}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                            </div>

                            {/* Application Responses */}
                            <div className="bg-card border rounded-lg p-6 shadow-sm">
                                <h2 className="text-xl font-semibold mb-4">Application Responses</h2>
                                <div className="space-y-6">{renderApplicationFields()}</div>
                            </div>

                            {/* Documents - Sticky below class/project */}
                            {(application.resume_url || application.transcript_url) && (
                                <div>
                                    <div className="bg-card border rounded-lg p-6 shadow-sm">
                                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                            <FileText className="h-5 w-5" />
                                            Documents
                                        </h2>
                                        <div className="grid grid-cols-2 gap-6">
                                            {application.resume_url && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleOpenDocument(application.resume_url!)}
                                                    className="w-full"
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    {isMobile ? 'Resume' : 'View Resume'}
                                                </Button>
                                            )}
                                            {application.transcript_url && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleOpenDocument(application.transcript_url!)}
                                                    className="w-full"
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    {isMobile ? 'Transcript' : 'View Transcript'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {application.status === 'pending' && canReview && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-card border rounded-lg p-6 shadow-sm"
                                >
                                    <h2 className="text-xl font-semibold mb-4">Review Actions</h2>
                                    <div className="flex gap-4">
                                        <Button
                                            variant="enable"
                                            className="flex-1 h-12 text-base"
                                            onClick={handleAccept}
                                        >
                                            <CheckCircle className="h-5 w-5 mr-2" />
                                            Accept Application
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="flex-1 h-12 text-base"
                                            onClick={handleReject}
                                        >
                                            <XCircle className="h-5 w-5 mr-2" />
                                            Reject Application
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>

                        {/* Right Column */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-6"
                        >
                            {/* Embedded Profile */}
                            {applicantProfile && (
                                <div>
                                    <ProfileViewer member={applicantProfile} embedded className="lg:sticky lg:top-24" />
                                </div>
                            )}

                            {/* Class/Project Details - below profile */}
                            {(classData || projectData) && (
                                <DetailModal
                                    title={(classData || projectData).name}
                                    subtitle={projectData?.client_name ? `Client: ${projectData.client_name}` : undefined}
                                    sections={buildDetailSections(
                                        classData || projectData,
                                        classData ? 'class' : 'project'
                                    )}
                                    embedded
                                />
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ApplicationViewerPage;