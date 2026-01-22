import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Save, X } from 'lucide-react';
import type { Database } from '@/integrations/supabase/database.types';

type Application = Database['public']['Tables']['applications']['Row'];
type ApplicationType = Database['public']['Enums']['application_type'];
type Class = Database['public']['Tables']['classes']['Row'] & {
  semesters: { code: string; name: string } | null;
};
type Project = Database['public']['Tables']['projects']['Row'] & {
  semesters: { code: string; name: string } | null;
};

interface ApplicationCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export const ApplicationCreateModal = ({
  open,
  onClose,
  onSuccess,
}: ApplicationCreateModalProps) => {
  const { user, profile } = useAuth();
  const { role } = useProfile();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [existingApplications, setExistingApplications] = useState<Array<{
    class_id: string | null;
    project_id: string | null;
  }>>([]);

  // Form fields
  const [applicationType, setApplicationType] = useState<ApplicationType | ''>('');
  const [fullName, setFullName] = useState('');
  const [classYear, setClassYear] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [whyPosition, setWhyPosition] = useState('');
  const [relevantExperience, setRelevantExperience] = useState('');
  const [otherCommitments, setOtherCommitments] = useState('');
  const [projectDetail, setProjectDetail] = useState('');
  const [problemSolved, setProblemSolved] = useState('');
  const [previousExperience, setPreviousExperience] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedBoardPosition, setSelectedBoardPosition] = useState('');
  const [selectedClassRole, setSelectedClassRole] = useState<'student' | 'teacher'>('student');
  const [selectedProjectRole, setSelectedProjectRole] = useState<'member' | 'lead'>('member');

  // Initialize form
  useEffect(() => {
    if (profile && open) {
      setFullName(profile.full_name || '');
      setClassYear(profile.class_year || '');
    }
  }, [profile, open]);

  // Fetch available options and existing applications
  useEffect(() => {
    if (open && user) {
      const loadData = async () => {
        const applications = await fetchExistingApplications();
        await fetchAvailableOptions(applications);
      };
      loadData();
    }
  }, [open, user]);

  const fetchExistingApplications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('applications')
      .select('class_id, project_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching existing applications:', error);
      return [];
    }

    const applications = data || [];
    setExistingApplications(applications);
    return applications;
  };

  const fetchAvailableOptions = async (applicationsToFilter: Array<{ class_id: string | null; project_id: string | null }> = existingApplications) => {
    const now = new Date().toISOString();

    // Fetch classes where the semester start date is in the future
    const { data: classesData } = await supabase
      .from('classes')
      .select(`
        *,
        semesters!inner (
          code,
          name,
          start_date
        )
      `)
      .gt('semesters.start_date', now)
      .order('name', { ascending: true });

    if (classesData) {
      // Filter out classes the user has already applied to
      const appliedClassIds = new Set(
        applicationsToFilter
          .filter(app => app.class_id !== null)
          .map(app => app.class_id)
      );
      const filteredClasses = classesData.filter(
        cls => !appliedClassIds.has(cls.id)
      );
      setAvailableClasses(filteredClasses);
    }

    // Fetch projects where the semester start date is in the future
    const { data: projectsData } = await supabase
      .from('projects')
      .select(`
        *,
        semesters!inner (
          code,
          name,
          start_date
        )
      `)
      .gt('semesters.start_date', now)
      .order('name', { ascending: true });

    if (projectsData) {
      // Filter out projects the user has already applied to
      const appliedProjectIds = new Set(
        applicationsToFilter
          .filter(app => app.project_id !== null)
          .map(app => app.project_id)
      );
      const filteredProjects = projectsData.filter(
        proj => !appliedProjectIds.has(proj.id)
      );
      setAvailableProjects(filteredProjects);
    }
  };

  const handleApplicationTypeChange = (type: ApplicationType) => {
    // Check if user has GitHub username for project applications
    if (type === 'project' && !profile?.github_username) {
      toast({
        title: 'GitHub Username Required',
        description: 'Please add your GitHub username to your profile before applying to projects.',
        variant: 'destructive',
      });
      return;
    }

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

  const uploadFile = async (file: File, type: 'resume' | 'transcript'): Promise<string> => {
    const safeUserName = fullName.replace(/\s+/g, '-');
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}.${fileExt}`;

    // Build folder path: {userName}_{thing_id}/resume.pdf
    let filePath: string | undefined;
    if (applicationType === 'class' && selectedClassId) {
      filePath = `${safeUserName}_${selectedClassId}/${fileName}`;
    } else if (applicationType === 'project' && selectedProjectId) {
      filePath = `${safeUserName}_${selectedProjectId}/${fileName}`;
    } else {
      throw new Error('Could not resolve file path for upload');
    }

    const { error: uploadError } = await supabase.storage.from('applications').upload(filePath, file);

    if (uploadError) {
      console.error('File upload error:', uploadError);
      throw new Error(`Failed to upload ${type}: ${uploadError.message}`);
    }

    return filePath;
  };

  const resetForm = () => {
    setApplicationType('');
    setFullName(profile?.full_name || '');
    setClassYear(profile?.class_year || '');
    setResumeFile(null);
    setTranscriptFile(null);
    setWhyPosition('');
    setRelevantExperience('');
    setOtherCommitments('');
    setProjectDetail('');
    setProblemSolved('');
    setPreviousExperience('');
    setSelectedClassId('');
    setSelectedProjectId('');
    setSelectedBoardPosition('');
    setSelectedClassRole('student');
    setSelectedProjectRole('member');
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate required fields
    if (!applicationType) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select an application type',
        variant: 'destructive',
      });
      return;
    }

    if (!fullName.trim()) {
      toast({
        title: 'Required Field Missing',
        description: 'Please enter your full name',
        variant: 'destructive',
      });
      return;
    }

    if (!classYear) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select your class year',
        variant: 'destructive',
      });
      return;
    }

    if (applicationType === 'board' && !selectedBoardPosition) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select a board position',
        variant: 'destructive',
      });
      return;
    }

    if (applicationType === 'board' && !whyPosition.trim()) {
      toast({
        title: 'Required Field Missing',
        description: 'Please explain why you want this position',
        variant: 'destructive',
      });
      return;
    }

    if (applicationType === 'class' && !selectedClassId) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select a class',
        variant: 'destructive',
      });
      return;
    }

    if (applicationType === 'class' && !selectedClassRole) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select your class role',
        variant: 'destructive',
      });
      return;
    }

    if (applicationType === 'project' && !selectedProjectId) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select a project',
        variant: 'destructive',
      });
      return;
    }

    if (applicationType === 'project' && !selectedProjectRole) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select your project role',
        variant: 'destructive',
      });
      return;
    }

    if (applicationType === 'project' && !projectDetail.trim()) {
      toast({
        title: 'Required Field Missing',
        description: 'Please explain why you want to join this project',
        variant: 'destructive',
      });
      return;
    }

    if (applicationType === 'project' && !problemSolved.trim()) {
      toast({
        title: 'Required Field Missing',
        description: 'Please describe what problem you want to solve',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate applications
      if (applicationType === 'class' && selectedClassId) {
        const hasExistingClassApplication = existingApplications.some(
          app => app.class_id === selectedClassId
        );
        if (hasExistingClassApplication) {
          toast({
            title: 'Duplicate Application',
            description: 'You have already applied to this class. You cannot apply again.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      } else if (applicationType === 'project' && selectedProjectId) {
        const hasExistingProjectApplication = existingApplications.some(
          app => app.project_id === selectedProjectId
        );
        if (hasExistingProjectApplication) {
          toast({
            title: 'Duplicate Application',
            description: 'You have already applied to this project. You cannot apply again.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

      let resumeUrl: string | null = null;
      let transcriptUrl: string | null = null;

      if (resumeFile) {
        resumeUrl = await uploadFile(resumeFile, 'resume');
      }

      if (transcriptFile) {
        transcriptUrl = await uploadFile(transcriptFile, 'transcript');
      }

      const baseData: Partial<Application> = {
        user_id: user.id,
        application_type: applicationType,
        full_name: fullName,
        class_year: classYear,
        resume_url: resumeUrl,
        transcript_url: transcriptUrl,
        status: 'pending',
      };

      let extraData: Partial<Application> = {};

      if (applicationType === 'board') {
        extraData = {
          board_position: selectedBoardPosition,
          why_position: whyPosition,
          relevant_experience: relevantExperience,
          previous_experience: previousExperience,
          other_commitments: otherCommitments,
        };
      } else if (applicationType === 'class') {
        extraData = {
          class_id: selectedClassId,
          class_role: selectedClassRole,
          relevant_experience: relevantExperience,
          other_commitments: otherCommitments,
        };
      } else if (applicationType === 'project') {
        extraData = {
          project_id: selectedProjectId,
          project_role: selectedProjectRole,
          project_detail: projectDetail,
          problem_solved: problemSolved,
          relevant_experience: relevantExperience,
          other_commitments: otherCommitments,
        };
      }

      const applicationData: Application = { ...baseData, ...extraData } as Application;

      const { error } = await supabase.from('applications').insert(applicationData);

      if (error) throw error;

      toast({ title: 'Success', description: 'Application submitted successfully!' });

      // Reset form and refresh existing applications and available options
      resetForm();
      const updatedApplications = await fetchExistingApplications();
      await fetchAvailableOptions(updatedApplications);
      onSuccess();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    if (!applicationType) return null;

    return (
      <>
        {/* Common Fields */}
        <div className="space-y-2">
          <Label htmlFor="fullName" required>Full Name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="classYear" required>Class Year</Label>
          <Select value={classYear} onValueChange={setClassYear}>
            <SelectTrigger>
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

        {/* Type-specific Fields */}
        {applicationType === 'board' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="boardPosition" required>Position</Label>
              <Select value={selectedBoardPosition} onValueChange={setSelectedBoardPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {BOARD_POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whyPosition" required>Why this position?</Label>
              <Textarea
                id="whyPosition"
                value={whyPosition}
                onChange={(e) => setWhyPosition(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousExperience">Previous Board Experience</Label>
              <Textarea
                id="previousExperience"
                value={previousExperience}
                onChange={(e) => setPreviousExperience(e.target.value)}
                rows={3}
              />
            </div>
          </>
        )}

        {applicationType === 'class' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="class" required>Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                      {cls.semesters && ` (${cls.semesters.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label required>Class Role</Label>
              <RadioGroup value={selectedClassRole} onValueChange={(value) => setSelectedClassRole(value as 'student' | 'teacher')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="student" id="class-student" />
                  <Label htmlFor="class-student">Student</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="teacher" id="class-teacher" />
                  <Label htmlFor="class-teacher">Teacher</Label>
                </div>
              </RadioGroup>
            </div>

          </>
        )}

        {applicationType === 'project' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="project" required>Select Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                      {proj.semesters && ` (${proj.semesters.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label required>Project Role</Label>
              <RadioGroup value={selectedProjectRole} onValueChange={(value) => setSelectedProjectRole(value as 'member' | 'lead')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="member" id="project-member" />
                  <Label htmlFor="project-member">Member</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lead" id="project-lead" />
                  <Label htmlFor="project-lead">Lead</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDetail" required>Why this project?</Label>
              <Textarea
                id="projectDetail"
                value={projectDetail}
                onChange={(e) => setProjectDetail(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="problemSolved" required>What problem do you want to solve?</Label>
              <Textarea
                id="problemSolved"
                value={problemSolved}
                onChange={(e) => setProblemSolved(e.target.value)}
                rows={3}
              />
            </div>
          </>
        )}

        {/* Common optional fields */}
        <div className="space-y-2">
          <Label htmlFor="relevantExperience">Relevant Experience</Label>
          <Textarea
            id="relevantExperience"
            value={relevantExperience}
            onChange={(e) => setRelevantExperience(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="otherCommitments">Other Commitments</Label>
          <Textarea
            id="otherCommitments"
            value={otherCommitments}
            onChange={(e) => setOtherCommitments(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="resume">Resume</Label>
          <Input
            id="resume"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transcript">Transcript</Label>
          <Input
            id="transcript"
            type="file"
            accept=".pdf"
            onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
          />
        </div>
      </>
    );
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={`${isMobile ? 'max-w-[92vw] max-h-[90vh]' : 'max-w-2xl max-h-[90vh] p-6'
          } overflow-y-auto overflow-x-hidden rounded-xl`}
      >
        <DialogHeader className="pb-4">
          <DialogTitle>New Application</DialogTitle>
          <DialogDescription>
            You can only apply to each class or project once. Submit your application to Claude Builder Club below.
          </DialogDescription>
        </DialogHeader>

        <div className="">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="applicationType" required>Application Type</Label>
              <Select
                value={applicationType}
                onValueChange={(value) => handleApplicationTypeChange(value as ApplicationType)}
              >
                <SelectTrigger id="applicationType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {role !== 'prospect' && <SelectItem value="board">Board Position</SelectItem>}
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="class">Class</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {renderFormFields()}

            {applicationType && (
              <div className="flex gap-2 pt-4 flex-col w-full sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="w-full sm:flex-1"
                >
                  <X className="h-4 w-4 mr-0" />
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="w-full sm:flex-1">
                  <Save className="h-4 w-4 mr-0" />
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};