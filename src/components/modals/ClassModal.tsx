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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useToast } from '@/hooks/use-toast';
import { Trash2, AlertTriangle, Save, X } from 'lucide-react';
import SemesterSelector from '@/components/SemesterSelector';
import type { Database } from '@/integrations/supabase/database.types';

type Class = Database['public']['Tables']['classes']['Row'];
type Semester = Database['public']['Tables']['semesters']['Row'];

interface ClassModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingClass?: Class | null;
}

export const ClassModal = ({ open, onClose, onSuccess, existingClass }: ClassModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [teacherId, setTeacherId] = useState<string>('');
  const [teachers, setTeachers] = useState<Array<{id: string, full_name: string, email: string}>>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load teachers list when modal opens
  useEffect(() => {
    if (open) {
      fetchTeachers();
    }
  }, [open]);

  // Load existing class data when modal opens for editing
  useEffect(() => {
    if (open && existingClass) {
      setName(existingClass.name);
      setDescription(existingClass.description || '');
      setLocation(existingClass.location || '');

      // Load semester if exists
      if (existingClass.semester_id) {
        loadSemester(existingClass.semester_id);
      }

      // Load current class teacher if it exists
      loadClassTeacher();
    } else if (open && !existingClass) {
      // Reset form for new class
      setName('');
      setDescription('');
      setLocation('');
      setSelectedSemester(null);
      setTeacherId('none');
    }
  }, [open, existingClass]);

  const loadSemester = async (semesterId: string) => {
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('id', semesterId)
        .single();

      if (error) throw error;
      setSelectedSemester(data);
    } catch (error) {
      console.error('Error loading semester:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch all user roles to filter for teachers (members, board, e-board)
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Create a map of user_id to role
      const roleMap = new Map(
        rolesData?.map(r => [r.user_id, r.role]) || []
      );

      // Filter for teachers (members, board, and e-board only)
      const eligibleTeachers = profilesData?.filter(profile => {
        const role = roleMap.get(profile.id) || 'prospect';
        return role === 'member' || role === 'board' || role === 'e-board';
      }) || [];

      setTeachers(eligibleTeachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const loadClassTeacher = async () => {
    if (!existingClass) return;

    try {
      const { data: teacherData } = await supabase
        .from('class_enrollments')
        .select('user_id')
        .eq('class_id', existingClass.id)
        .eq('role', 'teacher')
        .single();

      if (teacherData) {
        setTeacherId(teacherData.user_id);
      }
    } catch (error) {
      console.error('Error loading class teacher:', error);
      // If no teacher is assigned, just leave teacherId empty
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedSemester) {
      toast({
        title: 'Error',
        description: 'Please select a term for the class',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (existingClass) {
        // Update existing class
        const { error } = await supabase
          .from('classes')
          .update({
            name,
            description: description || null,
            location: location || null,
            semester_id: selectedSemester.id,
            start_date: selectedSemester.start_date,
            end_date: selectedSemester.end_date,
          })
          .eq('id', existingClass.id);

        if (error) throw error;

        // Update class teacher if changed
        if (teacherId && teacherId !== 'none') {
          // Remove existing teachers
          await supabase
            .from('class_enrollments')
            .delete()
            .eq('class_id', existingClass.id)
            .eq('role', 'teacher');

          // Add new teacher
          const { error: teacherError } = await supabase
            .from('class_enrollments')
            .insert({
              user_id: teacherId,
              class_id: existingClass.id,
              role: 'teacher',
            });

          if (teacherError) throw teacherError;
        } else if (teacherId === 'none') {
          // Remove existing teachers if "no teacher assigned" is selected
          await supabase
            .from('class_enrollments')
            .delete()
            .eq('class_id', existingClass.id)
            .eq('role', 'teacher');
        }

        toast({
          title: 'Success',
          description: 'Class updated successfully!',
        });
      } else {
        // Create new class
        const insertData: Database['public']['Tables']['classes']['Insert'] = {
          name,
          description: description || null,
          location: location || null,
          semester_id: selectedSemester.id,
          start_date: selectedSemester.start_date,
          end_date: selectedSemester.end_date,
          created_by: user.id,
        };

        const { data: classData, error } = await supabase
          .from('classes')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        // Add teacher if selected
        if (teacherId && teacherId !== 'none') {
          const { error: teacherError } = await supabase
            .from('class_enrollments')
            .insert({
              user_id: teacherId,
              class_id: classData.id,
              role: 'teacher',
            });

          if (teacherError) throw teacherError;
        }

        toast({
          title: 'Success',
          description: 'Class created successfully!',
        });
      }

      onSuccess();
      onClose();
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

  const handleDelete = async () => {
    if (!existingClass) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', existingClass.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Class deleted successfully!',
      });

      onSuccess();
      onClose();
      setShowDeleteConfirm(false);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-[calc(100vw-2rem)]' : 'max-w-2xl'} rounded-xl`}>
        <DialogHeader>
          <DialogTitle>{existingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
          <DialogDescription>
            {existingClass ? 'Update class details' : 'Add a new class to the club'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Class Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Introduction to Machine Learning"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Brief description of the class..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Engineering Building Room 101"
            />
          </div>

          <SemesterSelector
            value={selectedSemester?.id || ''}
            onSelect={setSelectedSemester}
            required
          />

          <div className="space-y-2">
            <Label>Teacher (Optional)</Label>
            <Select value={teacherId} onValueChange={setTeacherId} disabled={!teachers || teachers.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={teachers && teachers.length > 0 ? "Select a teacher..." : "Loading teachers..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No teacher assigned</SelectItem>
                {teachers?.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.full_name || teacher.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            {existingClass && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-0" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} className={existingClass ? "flex-1" : "flex-1"}>
              <X className="h-4 w-4 mr-0" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className={existingClass ? "flex-1" : "flex-1"}>
              <Save className="h-4 w-4 mr-0" />
              {loading ? 'Saving...' : existingClass ? 'Update Class' : 'Create Class'}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-left">Delete Class</AlertDialogTitle>
                <AlertDialogDescription className="text-left mt-2">
                  Are you sure you want to delete "{existingClass?.name}"? This action cannot be undone and will permanently remove the class and all associated data.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {loading ? 'Deleting...' : 'Delete Class'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};