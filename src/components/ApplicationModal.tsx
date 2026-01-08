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
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/database.types';

type ApplicationType = Database['public']['Enums']['application_type'];
type Class = Database['public']['Tables']['classes']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];

interface ApplicationModalProps {
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

export const ApplicationModal = ({ open, onClose, onSuccess }: ApplicationModalProps) => {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [applicationType, setApplicationType] = useState<ApplicationType | ''>('');
  const [loading, setLoading] = useState(false);

  // Available options
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

  // Selection fields
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedBoardPosition, setSelectedBoardPosition] = useState('');

  useEffect(() => {
    if (profile && open) {
      setFullName(profile.full_name);
      setClassYear(profile.class_year || '');
    }
  }, [profile, open]);

  // Fetch available classes and projects when modal opens
  useEffect(() => {
    if (open) {
      fetchAvailableOptions();
    }
  }, [open]);

  const fetchAvailableOptions = async () => {
    // Fetch all classes
    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .order('name', { ascending: true });

    if (classesData) {
      setAvailableClasses(classesData);
    }

    // Fetch all projects
    const { data: projectsData } = await supabase
      .from('projects')
      .select('*')
      .order('name', { ascending: true });

    if (projectsData) {
      setAvailableProjects(projectsData);
    }
  };

  const handleApplicationTypeChange = (type: ApplicationType) => {
    setApplicationType(type);

    // Check if there are options available
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

    // Use format: fullname_userid for folder structure
    const sanitizedName = fullName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // For resume: Internship-focused naming like Ankur_Desai_Resume.pdf
    // For transcript: Simple naming like Ankur_Desai_Transcript.pdf
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

    // Return the full path for storage reference
    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !applicationType) return;

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
  };

  const renderFields = () => {
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
          <Label htmlFor="resume">Resume</Label>
          <Input
            id="resume"
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
      case 'club_admission':
        return (
          <>
            {commonFields}
            <div className="space-y-2">
              <Label htmlFor="whyJoin">Why do you want to join? *</Label>
              <Textarea
                id="whyJoin"
                value={whyJoin}
                onChange={(e) => setWhyJoin(e.target.value)}
                required
                rows={4}
                placeholder="Tell us about your interest in Claude Builder Club..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relevantExperience">Relevant Experience</Label>
              <Textarea
                id="relevantExperience"
                value={relevantExperience}
                onChange={(e) => setRelevantExperience(e.target.value)}
                rows={3}
                placeholder="Any technical or club experience..."
              />
            </div>
          </>
        );

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
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                {role === 'prospect' && (
                  <SelectItem value="club_admission">Club Admission</SelectItem>
                )}
                {role !== 'prospect' && (
                  <>
                    <SelectItem value="board">Board Position</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="class">Class</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {renderFields()}

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