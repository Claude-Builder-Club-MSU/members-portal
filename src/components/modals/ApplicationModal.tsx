import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  Calendar,
  GraduationCap,
  FileText,
  Trash2,
  Info
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import type { Database } from '@/integrations/supabase/database.types';

type ApplicationType = Database['public']['Enums']['application_type'];
type Application = Database['public']['Tables']['applications']['Row'];
type Class = Database['public']['Tables']['classes']['Row'] & {
  semesters: { code: string; name: string } | null;
};
type Project = Database['public']['Tables']['projects']['Row'] & {
  semesters: { code: string; name: string } | null;
};

interface ApplicationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingApplication?: Application | null;
}

const BOARD_POSITIONS = [
  'President',
  'Vice President',
  'Treasurer',
  'Secretary',
  'Technical Lead',
  'Marketing Lead',
  'Events Coordinator',
];

export const ApplicationModal = ({
  open,
  onClose,
  onSuccess,
  existingApplication
}: ApplicationModalProps) => {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Determine if we're in view mode or create mode
  const isViewMode = !!existingApplication;

  // View mode state
  const [actionLoading, setActionLoading] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [className, setClassName] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);

  // Create mode state
  const [applicationType, setApplicationType] = useState<ApplicationType | ''>('');
  const [loading, setLoading] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [classYear, setClassYear] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [whyJoin, setWhyJoin] = useState('');
  const [whyPosition, setWhyPosition] = useState('');
  const [relevantExperience, setRelevantExperience] = useState('');
  const [otherCommitments, setOtherCommitments] = useState('');
  const [projectDetail, setProjectDetail] = useState('');
  const [problemSolved, setProblemSolved] = useState('');
  const [previousExperience, setPreviousExperience] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedBoardPosition, setSelectedBoardPosition] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Fetch class name for view mode
  useEffect(() => {
    const fetchClassName = async () => {
      if (existingApplication?.class_id) {
        const { data } = await supabase
          .from('classes')
          .select('name')
          .eq('id', existingApplication.class_id)
          .single();

        if (data) setClassName(data.name);
      }
    };

    if (open && existingApplication?.class_id) {
      fetchClassName();
    }
  }, [open, existingApplication?.class_id]);

  // Fetch project name for view mode
  useEffect(() => {
    const fetchProjectName = async () => {
      if (existingApplication?.project_id) {
        const { data } = await supabase
          .from('projects')
          .select('name')
          .eq('id', existingApplication.project_id)
          .single();

        if (data) setProjectName(data.name);
      }
    };

    if (open && existingApplication?.project_id) {
      fetchProjectName();
    }
  }, [open, existingApplication?.project_id]);

  // Initialize form for create mode
  useEffect(() => {
    if (profile && open && !isViewMode) {
      setFullName(profile.full_name);
      setClassYear(profile.class_year || '');
    }
  }, [profile, open, isViewMode]);

  // Fetch available options for create mode
  useEffect(() => {
    if (open && !isViewMode) {
      fetchAvailableOptions();
    }
  }, [open, isViewMode]);

  // Set default role based on application type and user role
  useEffect(() => {
    if (applicationType === 'project') {
      setSelectedRole(role === 'prospect' ? 'member' : '');
    } else if (applicationType === 'class') {
      setSelectedRole(role === 'prospect' ? 'student' : '');
    }
  }, [applicationType, role]);

  const fetchAvailableOptions = async () => {
    const now = new Date().toISOString();

    // Fetch only classes that haven't started yet
    const { data: classesData } = await supabase
      .from('classes')
      .select(`
        *,
        semesters (
          code,
          name
        )
      `)
      .gt('start_date', now)
      .order('name', { ascending: true });

    if (classesData) {
      setAvailableClasses(classesData);
    }

    // Fetch only projects that haven't started yet
    const { data: projectsData } = await supabase
      .from('projects')
      .select(`
        *,
        semesters (
          code,
          name
        )
      `)
      .gt('start_date', now)
      .order('name', { ascending: true });

    if (projectsData) {
      setAvailableProjects(projectsData);
    }
  };

  const handleApplicationTypeChange = (type: ApplicationType) => {
    setApplicationType(type);

    if (type === 'class' && availableClasses.length === 0) {
      toast({
        title: 'No Classes Available',
        description: 'There are currently no classes available to apply for.',
        variant: 'destructive',
      });
      setApplicationType('');
      return;
    }

    if (type === 'project' && availableProjects.length === 0) {
      toast({
        title: 'No Projects Available',
        description: 'There are currently no projects available to apply for.',
        variant: 'destructive',
      });
      setApplicationType('');
      return;
    }
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const sanitizedName = fullName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    let fileName: string;
    if (folder === 'resumes') {
      const resumeName = fullName
        .split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('_');
      fileName = `${resumeName}_Resume.${fileExt}`;
    } else {
      const transcriptName = fullName
        .split(' ')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('_');
      fileName = `${transcriptName}_Transcript.${fileExt}`;
    }

    const folderPath = `${sanitizedName}_${user!.id}`;
    const filePath = `${folderPath}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('applications')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !applicationType) return;

    // Validate role selection
    if ((applicationType === 'project' || applicationType === 'class') && !selectedRole) {
      toast({
        title: 'Role Required',
        description: 'Please select a role for your application.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let resumeUrl = null;
      let transcriptUrl = null;

      if (resumeFile) {
        resumeUrl = await uploadFile(resumeFile, 'resumes');
      }

      if (transcriptFile) {
        transcriptUrl = await uploadFile(transcriptFile, 'transcripts');
      }

      const insertData: Database['public']['Tables']['applications']['Insert'] = {
        user_id: user.id,
        application_type: applicationType,
        full_name: fullName,
        class_year: classYear,
        status: 'pending',
        resume_url: resumeUrl,
        transcript_url: transcriptUrl,
        why_join: whyJoin || null,
        why_position: whyPosition || null,
        relevant_experience: relevantExperience || null,
        other_commitments: otherCommitments || null,
        project_detail: projectDetail || null,
        problem_solved: problemSolved || null,
        previous_experience: previousExperience || null,
        class_id: selectedClassId || null,
        project_id: selectedProjectId || null,
        board_position: selectedBoardPosition || null,
        class_role: applicationType === 'class' ? selectedRole as 'teacher' | 'student' : null,
        project_role: applicationType === 'project' ? selectedRole as 'lead' | 'member' : null,
      };

      const { error } = await supabase.from('applications').insert(insertData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Application submitted successfully!',
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setApplicationType('');
    setWhyJoin('');
    setWhyPosition('');
    setRelevantExperience('');
    setOtherCommitments('');
    setProjectDetail('');
    setProblemSolved('');
    setPreviousExperience('');
    setResumeFile(null);
    setTranscriptFile(null);
    setSelectedClassId('');
    setSelectedProjectId('');
    setSelectedBoardPosition('');
    setSelectedRole('');
  };

  const handleAccept = async () => {
    if (!user || !existingApplication) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'accepted',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', existingApplication.id);

      if (error) throw error;

      toast({
        title: 'Application Accepted',
        description: `${existingApplication.full_name}'s application has been accepted and roles have been automatically assigned.`,
      });

      setShowAcceptDialog(false);
      onSuccess();
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
    if (!user || !existingApplication) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', existingApplication.id);

      if (error) throw error;

      toast({
        title: 'Application Rejected',
        description: `${existingApplication.full_name}'s application has been rejected.`,
      });

      setShowRejectDialog(false);
      onSuccess();
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
    if (!existingApplication) return '';

    switch (existingApplication.application_type) {
      case 'board':
        return `This will automatically assign them the ${existingApplication.board_position || 'board'} position and change their role to Board.`;
      case 'class':
        const classRole = existingApplication.class_role === 'teacher' ? 'teacher' : 'student';
        return className
          ? `This will automatically enroll them in "${className}" as ${classRole === 'teacher' ? 'an' : 'a'} ${classRole}.`
          : `This will automatically enroll them in the selected class as ${classRole === 'teacher' ? 'an' : 'a'} ${classRole}.`;
      case 'project':
        const projectRole = existingApplication.project_role === 'lead' ? 'lead' : 'member';
        return projectName
          ? `This will automatically add them to "${projectName}" as a ${projectRole}.`
          : `This will automatically add them to the selected project as a ${projectRole}.`;
      default:
        return '';
    }
  };

  const getDeletionInfo = () => {
    if (!existingApplication?.reviewed_at) return null;

    const reviewedDate = new Date(existingApplication.reviewed_at);
    const deletionDate = addDays(reviewedDate, 30);
    const daysRemaining = differenceInDays(deletionDate, new Date());

    if (daysRemaining < 0) {
      return 'This application will be deleted soon.';
    }

    return `This application will be automatically deleted in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} (${format(deletionDate, 'MMM d, yyyy')}).`;
  };

  const renderApplicationFields = () => {
    if (!existingApplication) return null;

    switch (existingApplication.application_type) {
      case 'board':
        return (
          <>
            {existingApplication.why_position && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Why this position?</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingApplication.why_position}
                </p>
              </div>
            )}
            {existingApplication.relevant_experience && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Relevant Experience</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingApplication.relevant_experience}
                </p>
              </div>
            )}
            {existingApplication.previous_experience && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Previous Board Experience</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingApplication.previous_experience}
                </p>
              </div>
            )}
            {existingApplication.other_commitments && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Other Commitments</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingApplication.other_commitments}
                </p>
              </div>
            )}
          </>
        );

      case 'project':
        return (
          <>
            {existingApplication.why_position && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Why this project?</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingApplication.why_position}
                </p>
              </div>
            )}
            {existingApplication.relevant_experience && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Relevant Technical Skills</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingApplication.relevant_experience}
                </p>
              </div>
            )}
            {existingApplication.project_detail && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Project Detail</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingApplication.project_detail}
                </p>
              </div>
            )}
            {existingApplication.problem_solved && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Technical Challenge Overcome</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingApplication.problem_solved}
                </p>
              </div>
            )}
            {existingApplication.other_commitments && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Other Commitments</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingApplication.other_commitments}
                </p>
              </div>
            )}
          </>
        );

      case 'class':
        return (
          <>
            {existingApplication.why_position && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Why this class?</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingApplication.why_position}
                </p>
              </div>
            )}
            {existingApplication.previous_experience && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Previous Experience</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingApplication.previous_experience}
                </p>
              </div>
            )}
            {existingApplication.relevant_experience && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">What will you bring?</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {existingApplication.relevant_experience}
                </p>
              </div>
            )}
          </>
        );
    }
  };

  const renderFormFields = () => {
    if (!applicationType) return null;

    const commonFields = (
      <>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="classYear">Class Year *</Label>
          <Select value={classYear} onValueChange={setClassYear} required>
            <SelectTrigger id="classYear">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="freshman">Freshman</SelectItem>
              <SelectItem value="sophomore">Sophomore</SelectItem>
              <SelectItem value="junior">Junior</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="resume">Resume *</Label>
          <Input
            id="resume"
            required
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
          />
          {resumeFile && (
            <p className="text-xs text-muted-foreground">
              Selected: {resumeFile.name}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="transcript">Unofficial Transcript (PDF)</Label>
          <Input
            id="transcript"
            type="file"
            accept=".pdf"
            onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
          />
          {transcriptFile && (
            <p className="text-xs text-muted-foreground">
              Selected: {transcriptFile.name}
            </p>
          )}
        </div>
      </>
    );

    switch (applicationType) {
      case 'board':
        return (
          <>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="boardPosition">Board Position *</Label>
              <Select value={selectedBoardPosition} onValueChange={setSelectedBoardPosition} required>
                <SelectTrigger id="boardPosition">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {BOARD_POSITIONS.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whyPosition">Why this position? *</Label>
              <Textarea
                id="whyPosition"
                value={whyPosition}
                onChange={(e) => setWhyPosition(e.target.value)}
                required
                rows={3}
                placeholder="What makes you a good fit for this board position?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relevantExperience">Relevant Experience *</Label>
              <Textarea
                id="relevantExperience"
                value={relevantExperience}
                onChange={(e) => setRelevantExperience(e.target.value)}
                required
                rows={3}
                placeholder="Leadership, organizational, or technical experience..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previousExperience">Previous Board Experience</Label>
              <Textarea
                id="previousExperience"
                value={previousExperience}
                onChange={(e) => setPreviousExperience(e.target.value)}
                rows={3}
                placeholder="Any previous board or leadership roles..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherCommitments">Other Commitments *</Label>
              <Textarea
                id="otherCommitments"
                value={otherCommitments}
                onChange={(e) => setOtherCommitments(e.target.value)}
                required
                rows={2}
                placeholder="Classes, jobs, other clubs, etc."
              />
            </div>
          </>
        );

      case 'project':
        return (
          <>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="project">Select Project *</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId} required>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} {project.semesters && `(${project.semesters.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <RadioGroup
                value={selectedRole}
                onValueChange={setSelectedRole}
                disabled={role === 'prospect'}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="member" id="member" />
                  <Label htmlFor="member" className="font-normal cursor-pointer">
                    Member
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lead" id="lead" disabled={role === 'prospect'} />
                  <Label htmlFor="lead" className={`font-normal ${role === 'prospect' ? 'text-muted-foreground' : 'cursor-pointer'}`}>
                    Lead
                  </Label>
                </div>
              </RadioGroup>
              {role === 'prospect' && (
                <p className="text-xs text-muted-foreground">
                  Prospects can only apply as members
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="whyPosition">Why this project? *</Label>
              <Textarea
                id="whyPosition"
                value={whyPosition}
                onChange={(e) => setWhyPosition(e.target.value)}
                required
                rows={3}
                placeholder="What interests you about this project?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relevantExperience">Relevant Technical Skills *</Label>
              <Textarea
                id="relevantExperience"
                value={relevantExperience}
                onChange={(e) => setRelevantExperience(e.target.value)}
                required
                rows={3}
                placeholder="Programming languages, frameworks, tools, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDetail">Describe one project in detail *</Label>
              <Textarea
                id="projectDetail"
                value={projectDetail}
                onChange={(e) => setProjectDetail(e.target.value)}
                required
                rows={4}
                placeholder="What did you build? What technologies did you use? What was your role?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="problemSolved">Describe a technical challenge you overcame *</Label>
              <Textarea
                id="problemSolved"
                value={problemSolved}
                onChange={(e) => setProblemSolved(e.target.value)}
                required
                rows={4}
                placeholder="What was the problem? How did you solve it?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherCommitments">Other Commitments *</Label>
              <Textarea
                id="otherCommitments"
                value={otherCommitments}
                onChange={(e) => setOtherCommitments(e.target.value)}
                required
                rows={2}
                placeholder="Classes, jobs, other clubs, etc."
              />
            </div>
          </>
        );

      case 'class':
        return (
          <>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="class">Select Class *</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId} required>
                <SelectTrigger id="class">
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} {cls.semesters && `(${cls.semesters.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <RadioGroup
                value={selectedRole}
                onValueChange={setSelectedRole}
                disabled={role === 'prospect'}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="student" id="student" />
                  <Label htmlFor="student" className="font-normal cursor-pointer">
                    Student
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="teacher" id="teacher" disabled={role === 'prospect'} />
                  <Label htmlFor="teacher" className={`font-normal ${role === 'prospect' ? 'text-muted-foreground' : 'cursor-pointer'}`}>
                    teacher
                  </Label>
                </div>
              </RadioGroup>
              {role === 'prospect' && (
                <p className="text-xs text-muted-foreground">
                  Prospects can only apply as students
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="whyPosition">Why this class? *</Label>
              <Textarea
                id="whyPosition"
                value={whyPosition}
                onChange={(e) => setWhyPosition(e.target.value)}
                required
                rows={3}
                placeholder="What do you hope to learn from this class?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previousExperience">Previous experience in this topic *</Label>
              <Textarea
                id="previousExperience"
                value={previousExperience}
                onChange={(e) => setPreviousExperience(e.target.value)}
                required
                rows={3}
                placeholder="Any prior knowledge, courses, or projects related to this topic..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relevantExperience">What will you bring to the class?</Label>
              <Textarea
                id="relevantExperience"
                value={relevantExperience}
                onChange={(e) => setRelevantExperience(e.target.value)}
                rows={3}
                placeholder="Skills, perspectives, or experiences you'll contribute..."
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  // Check if current user can review this application
  const canReview = user && (role === 'board' || role === 'e-board') &&
    existingApplication && existingApplication.user_id !== user.id;
  const deletionInfo = getDeletionInfo();

  // Render view mode
  if (isViewMode && existingApplication) {
    return (
      <>
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className={`${isMobile ? 'max-w-[calc(100vw-2rem)]' : 'max-w-3xl'} max-h-[90vh] overflow-y-auto rounded-xl`}>
            <DialogHeader>
              <DialogTitle className="text-2xl">{existingApplication.full_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{formatApplicationType(existingApplication.application_type)}</Badge>
                {getStatusBadge(existingApplication.status)}
                {(existingApplication.project_role || existingApplication.class_role) && (
                  <Badge variant="secondary" className="capitalize">
                    {existingApplication.project_role || existingApplication.class_role}
                  </Badge>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Deletion Warning */}
              {deletionInfo && existingApplication.status !== 'pending' && (
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
                    <p className="font-medium capitalize">{existingApplication.class_year}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {format(new Date(existingApplication.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Application Target */}
              {existingApplication.application_type === 'board' && existingApplication.board_position && (
                <>
                  <Separator />
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                    <p className="text-sm font-medium mb-1">Position Applied For</p>
                    <p className="text-base font-semibold">{existingApplication.board_position}</p>
                  </div>
                </>
              )}

              {existingApplication.application_type === 'class' && className && (
                <>
                  <Separator />
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                    <p className="text-sm font-medium mb-1">Class Applied For</p>
                    <p className="text-base font-semibold">{className}</p>
                    {existingApplication.class_role && (
                      <p className="text-sm text-muted-foreground mt-1 capitalize">
                        As {existingApplication.class_role}
                      </p>
                    )}
                  </div>
                </>
              )}

              {existingApplication.application_type === 'project' && projectName && (
                <>
                  <Separator />
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                    <p className="text-sm font-medium mb-1">Project Applied For</p>
                    <p className="text-base font-semibold">{projectName}</p>
                    {existingApplication.project_role && (
                      <p className="text-sm text-muted-foreground mt-1 capitalize">
                        As {existingApplication.project_role}
                      </p>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Application Responses */}
              <div className="space-y-4">
                {renderApplicationFields()}
              </div>

              {/* Documents */}
              {(existingApplication.resume_url || existingApplication.transcript_url) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {existingApplication.resume_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDocument(existingApplication.resume_url!)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Resume
                        </Button>
                      )}
                      {existingApplication.transcript_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDocument(existingApplication.transcript_url!)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Transcript
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              {existingApplication.status === 'pending' && canReview && (
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

        {/* Accept Dialog */}
        <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Accept Application?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Are you sure you want to accept {existingApplication.full_name}'s application for{' '}
                  {formatApplicationType(existingApplication.application_type)}?
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

        {/* Reject Dialog */}
        <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Application?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Are you sure you want to reject {existingApplication.full_name}'s application for{' '}
                  {formatApplicationType(existingApplication.application_type)}?
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
  }

  // Render create mode
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-[calc(100vw-2rem)]' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto rounded-xl`}>
        <DialogHeader>
          <DialogTitle>New Application</DialogTitle>
          <DialogDescription>
            Submit your application to Claude Builder Club
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="applicationType">Application Type *</Label>
            <Select
              value={applicationType}
              onValueChange={(value) => handleApplicationTypeChange(value as ApplicationType)}
            >
              <SelectTrigger id="applicationType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {role !== 'prospect' && (
                  <SelectItem value="board">Board Position</SelectItem>
                )}
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="class">Class</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderFormFields()}

          {applicationType && (
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};