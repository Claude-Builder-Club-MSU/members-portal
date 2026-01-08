import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, ExternalLink, Calendar, GraduationCap, FileText, Trash2, Info } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import type { Database } from '@/integrations/supabase/database.types';

type Application = Database['public']['Tables']['applications']['Row'];

interface ApplicationViewerProps {
    application: Application | null;
    open: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const ApplicationViewer = ({ application, open, onClose, onUpdate }: ApplicationViewerProps) => {
    const { toast } = useToast();
    const { user, role } = useAuth();
    const isMobile = useIsMobile();
    const [actionLoading, setActionLoading] = useState(false);
    const [showAcceptDialog, setShowAcceptDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [className, setClassName] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string | null>(null);

    // Fetch class name if class application
    useEffect(() => {
        const fetchClassName = async () => {
            if (application?.class_id) {
                const { data } = await supabase
                    .from('classes')
                    .select('name')
                    .eq('id', application.class_id)
                    .single();

                if (data) setClassName(data.name);
            }
        };

        if (open && application?.class_id) {
            fetchClassName();
        }
    }, [open, application?.class_id]);

    // Fetch project name if project application
    useEffect(() => {
        const fetchProjectName = async () => {
            if (application?.project_id) {
                const { data } = await supabase
                    .from('projects')
                    .select('name')
                    .eq('id', application.project_id)
                    .single();

                if (data) setProjectName(data.name);
            }
        };

        if (open && application?.project_id) {
            fetchProjectName();
        }
    }, [open, application?.project_id]);

    if (!application) return null;

    const handleAccept = async () => {
        if (!user) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('applications')
                .update({
                    status: 'accepted',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', application.id);

            if (error) throw error;

            toast({
                title: 'Application Accepted',
                description: `${application.full_name}'s application has been accepted and roles have been automatically assigned.`,
            });

            setShowAcceptDialog(false);
            onUpdate();
            onClose();
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
        if (!user) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('applications')
                .update({
                    status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', application.id);

            if (error) throw error;

            toast({
                title: 'Application Rejected',
                description: `${application.full_name}'s application has been rejected.`,
            });

            setShowRejectDialog(false);
            onUpdate();
            onClose();
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

    const formatApplicationType = (type: string) => {
        return type
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'accepted':
                return <Badge variant="default" className="bg-green-500">Accepted</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Rejected</Badge>;
            default:
                return <Badge variant="secondary">Pending</Badge>;
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
            console.error('Error opening document:', error);
            toast({
                title: 'Error',
                description: 'Failed to open document. You may not have permission.',
                variant: 'destructive',
            });
        }
    };

    const getAcceptanceAction = () => {
        switch (application.application_type) {
            case 'club_admission':
                return 'This will automatically change their role from Prospect to Member.';
            case 'board':
                return `This will automatically assign them the ${application.board_position || 'board'} position and change their role to Board.`;
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
        if (!application.reviewed_at) return null;

        const reviewedDate = new Date(application.reviewed_at);
        const deletionDate = addDays(reviewedDate, 30);
        const daysRemaining = differenceInDays(deletionDate, new Date());

        if (daysRemaining < 0) {
            return 'This application will be deleted soon.';
        }

        return `This application will be automatically deleted in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} (${format(deletionDate, 'MMM d, yyyy')}).`;
    };

    const renderApplicationFields = () => {
        switch (application.application_type) {
            case 'club_admission':
                return (
                    <>
                        {application.why_join && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Why do you want to join?</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {application.why_join}
                                </p>
                            </div>
                        )}
                        {application.relevant_experience && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Relevant Experience</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {application.relevant_experience}
                                </p>
                            </div>
                        )}
                    </>
                );

            case 'board':
                return (
                    <>
                        {application.why_position && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Why this position?</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {application.why_position}
                                </p>
                            </div>
                        )}
                        {application.relevant_experience && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Relevant Experience</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {application.relevant_experience}
                                </p>
                            </div>
                        )}
                        {application.previous_experience && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Previous Board Experience</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {application.previous_experience}
                                </p>
                            </div>
                        )}
                        {application.other_commitments && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Other Commitments</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
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
                                <h3 className="font-semibold text-sm">Why this project?</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {application.why_position}
                                </p>
                            </div>
                        )}
                        {application.relevant_experience && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Relevant Technical Skills</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {application.relevant_experience}
                                </p>
                            </div>
                        )}
                        {application.project_detail && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Project Detail</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {application.project_detail}
                                </p>
                            </div>
                        )}
                        {application.problem_solved && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Technical Challenge Overcome</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {application.problem_solved}
                                </p>
                            </div>
                        )}
                        {application.other_commitments && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Other Commitments</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
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
                                <h3 className="font-semibold text-sm">Why this class?</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {application.why_position}
                                </p>
                            </div>
                        )}
                        {application.previous_experience && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Previous Experience</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {application.previous_experience}
                                </p>
                            </div>
                        )}
                        {application.relevant_experience && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm">What will you bring?</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {application.relevant_experience}
                                </p>
                            </div>
                        )}
                    </>
                );
        }
    };

    // Check if current user can review this application
    const canReview = user && (role === 'board' || role === 'e-board') && application.user_id !== user.id;
    const deletionInfo = getDeletionInfo();

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className={`${isMobile ? 'max-w-[calc(100vw-2rem)]' : 'max-w-3xl'} max-h-[90vh] overflow-y-auto rounded-xl`}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{application.full_name}</DialogTitle>
                        <DialogDescription className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{formatApplicationType(application.application_type)}</Badge>
                            {getStatusBadge(application.status)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Deletion Warning for Reviewed Applications */}
                        {deletionInfo && application.status !== 'pending' && (
                            <Alert className="bg-muted/50 border-muted-foreground/20">
                                <Info className="h-4 w-4" />
                                <AlertDescription className="text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Trash2 className="h-3 w-3" />
                                        {deletionInfo}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Class Year</p>
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                    <p className="font-medium capitalize">{application.class_year}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Submitted</p>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <p className="font-medium">
                                        {format(new Date(application.created_at), 'MMM d, yyyy')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Show what they applied for */}
                        {application.application_type === 'board' && application.board_position && (
                            <>
                                <Separator />
                                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                                    <p className="text-sm font-medium mb-1">Position Applied For</p>
                                    <p className="text-base font-semibold">{application.board_position}</p>
                                </div>
                            </>
                        )}

                        {application.application_type === 'class' && className && (
                            <>
                                <Separator />
                                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                                    <p className="text-sm font-medium mb-1">Class Applied For</p>
                                    <p className="text-base font-semibold">{className}</p>
                                </div>
                            </>
                        )}

                        {application.application_type === 'project' && projectName && (
                            <>
                                <Separator />
                                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                                    <p className="text-sm font-medium mb-1">Project Applied For</p>
                                    <p className="text-base font-semibold">{projectName}</p>
                                </div>
                            </>
                        )}

                        <Separator />

                        {/* Application Responses */}
                        <div className="space-y-4">
                            {renderApplicationFields()}
                        </div>

                        {/* Documents */}
                        {(application.resume_url || application.transcript_url) && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Documents
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {application.resume_url && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenDocument(application.resume_url!)}
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                View Resume
                                            </Button>
                                        )}
                                        {application.transcript_url && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenDocument(application.transcript_url!)}
                                            >
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                View Transcript
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Action Buttons - Only show for pending applications AND if user can review */}
                        {application.status === 'pending' && canReview && (
                            <>
                                <Separator />
                                <div className="flex gap-3">
                                    <Button
                                        variant="default"
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={() => setShowAcceptDialog(true)}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Accept
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={() => setShowRejectDialog(true)}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Accept Confirmation Dialog */}
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
                                <p className="text-sm font-medium text-foreground">
                                    {getAcceptanceAction()}
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This action cannot be undone.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAccept}
                            disabled={actionLoading}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {actionLoading ? 'Accepting...' : 'Yes, Accept & Auto-Assign'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reject Confirmation Dialog */}
            <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reject Application?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>
                                Are you sure you want to reject {application.full_name}'s application for{' '}
                                {formatApplicationType(application.application_type)}?
                            </p>
                            <p className="text-xs text-muted-foreground">
                                This action cannot be undone.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReject}
                            disabled={actionLoading}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {actionLoading ? 'Rejecting...' : 'Yes, Reject'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};