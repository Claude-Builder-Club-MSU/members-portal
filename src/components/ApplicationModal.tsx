import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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

interface ApplicationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApplicationModal = ({ open, onClose, onSuccess }: ApplicationModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string>('prospect');
  const [applicationType, setApplicationType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
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

  useEffect(() => {
    if (user && open) {
      fetchUserRole();
      fetchUserProfile();
    }
  }, [user, open]);

  const fetchUserRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .order('role', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setUserRole(data.role);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('full_name, class_year')
      .eq('id', user.id)
      .single();

    if (data) {
      setFullName(data.full_name || '');
      setClassYear(data.class_year || '');
    }
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user!.id}/${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('applications')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('applications')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const insertData: any = {
        user_id: user!.id,
        application_type: applicationType,
        full_name: fullName,
        class_year: classYear,
        resume_url: resumeUrl,
        transcript_url: transcriptUrl,
      };

      // Add optional fields only if they have values
      if (whyJoin) insertData.why_join = whyJoin;
      if (whyPosition) insertData.why_position = whyPosition;
      if (relevantExperience) insertData.relevant_experience = relevantExperience;
      if (otherCommitments) insertData.other_commitments = otherCommitments;
      if (projectDetail) insertData.project_detail = projectDetail;
      if (problemSolved) insertData.problem_solved = problemSolved;
      if (previousExperience) insertData.previous_experience = previousExperience;

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
  };

  const renderFields = () => {
    if (!applicationType) return null;

    const commonFields = (
      <>
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Class Year</Label>
          <Select value={classYear} onValueChange={setClassYear} required>
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="freshman">Freshman</SelectItem>
              <SelectItem value="sophomore">Sophomore</SelectItem>
              <SelectItem value="junior">Junior</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
              <SelectItem value="graduate">Graduate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Resume</Label>
          <Input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
          />
        </div>
        <div className="space-y-2">
          <Label>Unofficial Transcript</Label>
          <Input
            type="file"
            accept=".pdf"
            onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
          />
        </div>
      </>
    );

    switch (applicationType) {
      case 'club_admission':
        return (
          <>
            {commonFields}
            <div className="space-y-2">
              <Label>Why do you want to join?</Label>
              <Textarea
                value={whyJoin}
                onChange={(e) => setWhyJoin(e.target.value)}
                required
                rows={4}
              />
            </div>
          </>
        );

      case 'board':
        return (
          <>
            {commonFields}
            <div className="space-y-2">
              <Label>Why this position?</Label>
              <Textarea
                value={whyPosition}
                onChange={(e) => setWhyPosition(e.target.value)}
                required
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Relevant experience?</Label>
              <Textarea
                value={relevantExperience}
                onChange={(e) => setRelevantExperience(e.target.value)}
                required
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Other commitments?</Label>
              <Textarea
                value={otherCommitments}
                onChange={(e) => setOtherCommitments(e.target.value)}
                required
                rows={2}
              />
            </div>
          </>
        );

      case 'project':
        return (
          <>
            {commonFields}
            <div className="space-y-2">
              <Label>Why this project?</Label>
              <Textarea
                value={whyPosition}
                onChange={(e) => setWhyPosition(e.target.value)}
                required
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Other commitments?</Label>
              <Textarea
                value={otherCommitments}
                onChange={(e) => setOtherCommitments(e.target.value)}
                required
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Describe one project in detail</Label>
              <Textarea
                value={projectDetail}
                onChange={(e) => setProjectDetail(e.target.value)}
                required
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Describe a time you overcame a problem</Label>
              <Textarea
                value={problemSolved}
                onChange={(e) => setProblemSolved(e.target.value)}
                required
                rows={4}
              />
            </div>
          </>
        );

      case 'class':
        return (
          <>
            {commonFields}
            <div className="space-y-2">
              <Label>Why this class?</Label>
              <Textarea
                value={whyPosition}
                onChange={(e) => setWhyPosition(e.target.value)}
                required
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Previous experience in the field?</Label>
              <Textarea
                value={previousExperience}
                onChange={(e) => setPreviousExperience(e.target.value)}
                required
                rows={3}
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Application</DialogTitle>
          <DialogDescription>
            Submit your application to Claude Builder Club
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Application Type</Label>
            <Select value={applicationType} onValueChange={setApplicationType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {userRole === 'prospect' && (
                  <SelectItem value="club_admission">Club Admission</SelectItem>
                )}
                {userRole !== 'prospect' && (
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
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
