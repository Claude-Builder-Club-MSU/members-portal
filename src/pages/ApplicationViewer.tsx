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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
    User,
    Briefcase,
    BookOpen,
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import ProfileViewer from '@/components/modals/ProfileModal';
import type { Database } from '@/integrations/supabase/database.types';

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
    const { user, role } = useAuth();

    // State
    const [application, setApplication] = useState<Application | null>(null);
    const [applicantProfile, setApplicantProfile] = useState<MemberWithRole | null>(null);
    const [className, setClassName] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal states
    const [showProfileViewer, setShowProfileViewer] = useState(false);
    const [showAcceptDialog, setShowAcceptDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);

    // Animation states
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        if (id) {
            fetchApplication();
        }
    }, [id]);

    useEffect(() => {
        if (application) {
            // Trigger animations after data loads
            setTimeout(() => setAnimateIn(true), 100);
        }
    }, [application]);

    const fetchApplication = async () => {
        if (!id) return;

        try {
            // Fetch application
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
                navigate('/applications');
                return;
            }

            setApplication(appData);

            // Fetch applicant profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', appData.user_id)
                .single();

            if (profileData) {
                // Fetch user role
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

            // Fetch class name if applicable
            if (appData.class_id) {
                const { data: classData } = await supabase
                    .from('classes')
                    .select('name')
                    .eq('id', appData.class_id)
                    .single();

                if (classData) setClassName(classData.name);
            }

            // Fetch project name if applicable
            if (appData.project_id) {
                const { data: projectData } = await supabase
                    .from('projects')
                    .select('name')
                    .eq('id', appData.project_id)
                    .single();

                if (projectData) setProjectName(projectData.name);
            }
        } catch (error: any) {
            console.error('Error fetching application:', error);
            toast({
                title: 'Error',
                description: 'Failed to load application.',
                variant: 'destructive',
            });
            navigate('/applications');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!user || !application) return;

        setActionLoading(true);
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

            toast({
                title: 'Application Accepted',
                description: `${application.full_name}'s application has been accepted.`,
            });

            setShowAcceptDialog(false);
            fetchApplication();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!user || !application) return;

        setActionLoading(true);
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

            toast({
                title: 'Application Rejected',
                description: `${application.full_name}'s application has been rejected.`,
            });

            setShowRejectDialog(false);
            fetchApplication();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenDocument = async (filePath: string) => {
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

    const formatApplicationType = (type: string) => {
        return type
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'accepted':
                return (
                    <Badge variant="default" className="bg-green-500 text-base px-4 py-1">
                        Accepted
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge variant="destructive" className="text-base px-4 py-1">
                        Rejected
                    </Badge>
                );
            default:
                return (
                    <Badge variant="secondary" className="text-base px-4 py-1">
                        Pending
                    </Badge>
                );
        }
    };

    const getAcceptanceAction = () => {
        if (!application) return '';

        switch (application.application_type) {
            case 'board':
                return `This will automatically assign them the ${application.board_position || 'board'
                    } position and change their role to Board.`;
            case 'class':
                return className
                    ? `This will automatically enroll them in "${className}" as a student.`
                    : 'This will automatically enroll them in the selected class as a student.';
            case 'project':
                return projectName
                    ? `This will automatically add them to "${projectName}" as a member.`
                    : 'This will automatically add them to the selected project as a member.';
            default:
                return '';
        }
    };

    const getDeletionInfo = () => {
        if (!application?.reviewed_at) return null;

        const reviewedDate = new Date(application.reviewed_at);
        const deletionDate = addDays(reviewedDate, 30);
        const daysRemaining = differenceInDays(deletionDate, new Date());

        if (daysRemaining < 0) {
            return 'This application will be deleted soon.';
        }

        return `This application will be automatically deleted in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''
            } (${format(deletionDate, 'MMM d, yyyy')}).`;
    };

    const renderApplicationFields = () => {
        if (!application) return null;

        switch (application.application_type) {
            case 'board':
                return (
                    <>
                        {application.why_position && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base">Why this position?</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.why_position}
                                </p>
                            </div>
                        )}
                        {application.relevant_experience && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base">Relevant Experience</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.relevant_experience}
                                </p>
                            </div>
                        )}
                        {application.previous_experience && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base">Previous Board Experience</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.previous_experience}
                                </p>
                            </div>
                        )}
                        {application.other_commitments && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base">Other Commitments</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.other_commitments}
                                </p>
                            </div>
                        )}
                    </>
                );

            case 'project':
                return (
                    <>
                        {application.why_position && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base">Why this project?</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.why_position}
                                </p>
                            </div>
                        )}
                        {application.relevant_experience && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base">Relevant Technical Skills</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.relevant_experience}
                                </p>
                            </div>
                        )}
                        {application.project_detail && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base">Project Detail</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.project_detail}
                                </p>
                            </div>
                        )}
                        {application.problem_solved && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base">Technical Challenge Overcome</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.problem_solved}
                                </p>
                            </div>
                        )}
                        {application.other_commitments && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base">Other Commitments</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.other_commitments}
                                </p>
                            </div>
                        )}
                    </>
                );

            case 'class':
                return (
                    <>
                        {application.why_position && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base">Why this class?</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.why_position}
                                </p>
                            </div>
                        )}
                        {application.previous_experience && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base">Previous Experience</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.previous_experience}
                                </p>
                            </div>
                        )}
                        {application.relevant_experience && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-base">What will you bring?</h3>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {application.relevant_experience}
                                </p>
                            </div>
                        )}
                    </>
                );
        }
    };

    const canReview =
        user && (role === 'board' || role === 'e-board') && application?.user_id !== user.id;
    const deletionInfo = getDeletionInfo();

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <Button variant="ghost" onClick={() => navigate('/applications')} className="mb-6">
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
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header with Back Button */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/dashboard/applications')}
                        className="mb-6 hover:bg-primary"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Applications
                    </Button>

                    <div
                        className={`transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-4xl font-bold mb-2">{application.full_name}</h1>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <Badge variant="outline" className="text-base px-3 py-1">
                                        {formatApplicationType(application.application_type)}
                                    </Badge>
                                    {getStatusBadge(application.status)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Application Details */}
                    <div
                        className={`lg:col-span-2 space-y-6 transition-all duration-700 delay-100 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                            }`}
                    >
                        {/* Deletion Warning */}
                        {deletionInfo && application.status !== 'pending' && (
                            <Alert className="bg-muted/50 border-muted-foreground/20">
                                <Info className="h-4 w-4" />
                                <AlertDescription className="text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Trash2 className="h-4 w-4" />
                                        {deletionInfo}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Basic Information Card */}
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
                                        <p className="font-medium text-lg">
                                            {format(new Date(application.created_at), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Application Target */}
                            {application.application_type === 'board' && application.board_position && (
                                <>
                                    <Separator className="my-4" />
                                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                                        <p className="text-sm font-medium mb-1 text-muted-foreground">
                                            Position Applied For
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="h-5 w-5" />
                                            <p className="text-lg font-semibold">{application.board_position}</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {application.application_type === 'class' && className && (
                                <>
                                    <Separator className="my-4" />
                                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                                        <p className="text-sm font-medium mb-1 text-muted-foreground">
                                            Class Applied For
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-5 w-5" />
                                            <p className="text-lg font-semibold">{className}</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {application.application_type === 'project' && projectName && (
                                <>
                                    <Separator className="my-4" />
                                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                                        <p className="text-sm font-medium mb-1 text-muted-foreground">
                                            Project Applied For
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="h-5 w-5" />
                                            <p className="text-lg font-semibold">{projectName}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Application Responses Card */}
                        <div className="bg-card border rounded-lg p-6 shadow-sm">
                            <h2 className="text-xl font-semibold mb-4">Application Responses</h2>
                            <div className="space-y-6">{renderApplicationFields()}</div>
                        </div>

                        {/* Action Buttons */}
                        {application.status === 'pending' && canReview && (
                            <div className="bg-card border rounded-lg p-6 shadow-sm">
                                <h2 className="text-xl font-semibold mb-4">Review Actions</h2>
                                <div className="flex gap-4">
                                    <Button
                                        variant='enable'
                                        className="flex-1 h-12 text-base"
                                        onClick={() => setShowAcceptDialog(true)}
                                    >
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        Accept Application
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1 h-12 text-base"
                                        onClick={() => setShowRejectDialog(true)}
                                    >
                                        <XCircle className="h-5 w-5 mr-2" />
                                        Reject Application
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Applicant Profile */}
                    <div
                        className={`transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                            }`}
                    >

                        <div className="space-y-6 lg:sticky lg:top-24">

                            {/* Applicant Profile Card */}
                            <div className="bg-card border rounded-lg p-6 shadow-sm">
                                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Applicant Profile
                                </h2>

                                {applicantProfile ? (
                                    <div className="space-y-4">
                                        <div className="text-center pb-4 border-b">
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 mx-auto mb-3 flex items-center justify-center text-white text-3xl font-bold">
                                                {applicantProfile.full_name?.[0]?.toUpperCase() ||
                                                    applicantProfile.email[0].toUpperCase()}
                                            </div>
                                            <h3 className="font-semibold text-lg">
                                                {applicantProfile.full_name || 'No name'}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">{applicantProfile.email}</p>
                                        </div>

                                        <div className="space-y-3">
                                            {applicantProfile.class_year && (
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-muted-foreground">Class Year</span>
                                                    <span className="font-medium capitalize">
                                                        {applicantProfile.class_year}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-sm text-muted-foreground">Club Points</span>
                                                <span className="font-medium">{applicantProfile.points}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-muted-foreground">Current Role</span>
                                                <Badge variant="outline" className="capitalize">
                                                    {applicantProfile.role.replace('-', ' ')}
                                                </Badge>
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => setShowProfileViewer(true)}
                                        >
                                            View Full Profile
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Profile information unavailable
                                    </p>
                                )}
                            </div>

                            {/* Documents Card - Inside the sticky wrapper */}
                            {(application.resume_url || application.transcript_url) && (
                                <div className="bg-card border rounded-lg p-6 shadow-sm">
                                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Documents
                                    </h2>
                                    <div className="flex flex-col gap-3">
                                        {application.resume_url && (
                                            <Button
                                                variant="outline"
                                                onClick={() => handleOpenDocument(application.resume_url!)}
                                                className="w-full justify-start"
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                View Resume
                                            </Button>
                                        )}
                                        {application.transcript_url && (
                                            <Button
                                                variant="outline"
                                                onClick={() => handleOpenDocument(application.transcript_url!)}
                                                className="w-full justify-start"
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                View Transcript
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Viewer Modal */}
            {applicantProfile && (
                <ProfileViewer
                    open={showProfileViewer}
                    onClose={() => setShowProfileViewer(false)}
                    member={applicantProfile}
                />
            )}

            {/* Accept Dialog */}
            <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Accept Application?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>
                                Are you sure you want to accept {application.full_name}'s application for{' '}
                                {formatApplicationType(application.application_type)}?
                            </p>
                            <div className="bg-blue-50 dark:bg-blue-950 rounded-md p-3">
                                <p className="text-sm font-medium text-foreground">{getAcceptanceAction()}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={`flex !justify-around ${isMobile ? 'space-y-2 flex-col-reverse' : ''}`}>
                        <AlertDialogCancel
                            variant='outline'
                            disabled={actionLoading}
                            className={!isMobile ? 'w-[47%]' : ''}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAccept}
                            disabled={actionLoading}
                            className={`bg-green-600 hover:bg-green-700 ${!isMobile ? 'w-[47%]' : ''}`}
                        >
                            {actionLoading ? 'Accepting...' : 'Yes, Accept & Auto-Assign'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reject Dialog */}
            <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reject Application?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>
                                Are you sure you want to reject {application.full_name}'s application for{' '}
                                {formatApplicationType(application.application_type)}?
                            </p>
                            <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={`flex !justify-around ${isMobile ? 'space-y-2 flex-col-reverse' : ''}`}>
                        <AlertDialogCancel
                            variant='outline'
                            disabled={actionLoading}
                            className={!isMobile ? 'w-[47%]' : ''}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReject}
                            disabled={actionLoading}
                            variant='destructive'
                            className={!isMobile ? 'w-[47%]' : ''}
                        >
                            {actionLoading ? 'Rejecting...' : 'Yes, Reject'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ApplicationViewerPage;