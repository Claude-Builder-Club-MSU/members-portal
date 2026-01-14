import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useModalState, useItemStatus, useFilteredItems } from '@/hooks/use-modal';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DetailModal } from '@/components/modals/DetailModal';
import { EditModal } from '@/components/modals/EditModal';
import { MembersListModal } from '@/components/modals/MembersListModal';
import { ItemCard } from '@/components/ItemCard';
import SemesterSelector from '@/components/SemesterSelector';
import { Plus, MapPin, Users, Edit, GraduationCap, Calendar as CalendarIcon, Eye, Crown, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/database.types';
import type { MembershipInfo, ItemWithMembers } from '@/types/modal.types';

type Class = Database['public']['Tables']['classes']['Row'] & {
  semesters: { code: string; name: string; start_date: string; end_date: string } | null;
};
type Semester = Database['public']['Tables']['semesters']['Row'];

type ClassWithMembers = ItemWithMembers<Class>;

const Classes = () => {
  const { user } = useAuth();
  const { role, isBoardOrAbove, refreshClasses } = useProfile();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [classes, setClasses] = useState<ClassWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [teacherSearchOpen, setTeacherSearchOpen] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState<Database['public']['Tables']['profiles']['Row'][]>([]);

  const modalState = useModalState<ClassWithMembers>();

  useEffect(() => {
    if (user && role) {
      fetchClasses();
      fetchAvailableTeachers();
    }
  }, [user, role]);

  // Load form data when editing
  useEffect(() => {
    if (modalState.modalType === 'edit' && modalState.selectedItem) {
      const cls = modalState.selectedItem;
      setName(cls.name);
      setDescription(cls.description || '');
      setLocation(cls.location || '');
      setSelectedSemester(cls.semester_id ? { id: cls.semester_id } as Semester : null);
      const teacher = cls.members.find(m => m.role === 'teacher');
      setSelectedTeacher(teacher ? teacher.user_id : '');
    } else if (isCreateModalOpen) {
      // Reset form
      setName('');
      setDescription('');
      setLocation('');
      setSelectedSemester(null);
      setSelectedTeacher('');
    }
  }, [modalState.modalType, modalState.selectedItem, isCreateModalOpen]);

  const fetchClasses = async () => {
    if (!user) return;

    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select(`
        *,
        semesters (
          code,
          name,
          start_date,
          end_date
        )
      `);

    if (classesError || !classesData) {
      setLoading(false);
      return;
    }

    const { data: enrollmentsData } = await supabase
      .from('class_enrollments')
      .select('*');

    const enrolledUserIds = [...new Set(enrollmentsData?.map(e => e.user_id) || [])];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', enrolledUserIds);

    // Filter out banned users
    const activeProfilesData = profilesData?.filter(p => !p.is_banned) || [];
    const profilesMap = new Map(activeProfilesData.map(p => [p.id, p]));

    const classesWithMembers: ClassWithMembers[] = (classesData as Class[]).map(cls => {
      const classEnrollments = enrollmentsData?.filter(e => e.class_id === cls.id) || [];
      const members: MembershipInfo[] = classEnrollments
        .map(enrollment => ({
          id: enrollment.id,
          user_id: enrollment.user_id,
          role: enrollment.role,
          profile: profilesMap.get(enrollment.user_id)!,
        }))
        .filter(m => m.profile);

      const userEnrollment = members.find(m => m.user_id === user.id);

      return {
        ...cls,
        members,
        memberCount: members.length,
        userMembership: userEnrollment,
      };
    })
      .sort((a, b) => {
        // Sort by semester start date (most recent first)
        const aStart = a.semesters?.start_date ? new Date(a.semesters.start_date) : new Date(0);
        const bStart = b.semesters?.start_date ? new Date(b.semesters.start_date) : new Date(0);
        return bStart.getTime() - aStart.getTime();
      });

    setClasses(classesWithMembers);
    setLoading(false);
  };

  const fetchAvailableTeachers = async () => {
    const { data: teachersData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_banned', false)
      .order('full_name');

    if (!error && teachersData) {
      setAvailableTeachers(teachersData);
    }
  };

  const { available, inProgress, completed } = useFilteredItems(
    classes,
    (cls, status) => {
      if (status.state === 'available') return true;
      return isBoardOrAbove || !!cls.userMembership;
    }
  );

  const handleSubmit = async () => {
    if (!user) return;
    setSaveLoading(true);

    try {
      const classData = {
        name,
        description: description || null,
        location: location || null,
        semester_id: selectedSemester?.id || null,
      };

      let classId = modalState.selectedItem?.id;

      if (modalState.selectedItem) {
        const { error } = await supabase
          .from('classes')
          .update(classData)
          .eq('id', modalState.selectedItem.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Class updated!' });
      } else {
        const { data, error } = await supabase
          .from('classes')
          .insert({ ...classData, created_by: user.id })
          .select('id')
          .single();
        if (error) throw error;
        classId = data.id;
        toast({ title: 'Success', description: 'Class created!' });
      }

      // Handle teacher assignment
      if (classId) {
        // Remove existing teacher if any
        await supabase
          .from('class_enrollments')
          .delete()
          .eq('class_id', classId)
          .eq('role', 'teacher');

        // Add new teacher if selected
        if (selectedTeacher) {
          const { error: teacherError } = await supabase
            .from('class_enrollments')
            .insert({
              class_id: classId,
              user_id: selectedTeacher,
              role: 'teacher'
            });
          if (teacherError) throw teacherError;
        }
      }

      await fetchClasses();
      await refreshClasses();

      modalState.close();
      setIsCreateModalOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!modalState.selectedItem) return;

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', modalState.selectedItem.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      throw error;
    }

    toast({ title: 'Success', description: 'Class deleted!' });
    await fetchClasses();
    await refreshClasses();
    modalState.close();
  };

  const renderClassCard = (cls: ClassWithMembers) => {
    const isEnrolled = !!cls.userMembership;
    const isTeacher = cls.userMembership?.role === 'teacher';
    const teacher = cls.members.find(m => m.role === 'teacher');
    const status = useItemStatus(cls);

    if (!status) return null;

    const badges = [];

    if (isEnrolled) {
      badges.push(
        <Badge key="enrolled" variant="secondary" className="shrink-0 whitespace-nowrap">
          {isTeacher ? 'Teacher' : 'Enrolled'}
        </Badge>
      );
    }
    badges.push(
      <Badge key="status" variant={status.variant}>
        {status.label}
      </Badge>
    );

    const metadata = [];

    if (cls.semesters) {
      metadata.push({
        icon: <CalendarIcon className="h-4 w-4" />,
        text: `${cls.semesters.code} - ${cls.semesters.name}`,
      });
    }

    if (cls.location) {
      metadata.push({
        icon: <MapPin className="h-4 w-4" />,
        text: cls.location,
      });
    }

    if (teacher) {
      metadata.push({
        icon: <Crown className="h-4 w-4 text-yellow-500" />,
        text: `Teacher: ${teacher.profile.full_name || teacher.profile.email}`,
      });
    }

    metadata.push({
      icon: <Users className="h-4 w-4 group-hover:text-orange-600 transition-colors duration-400" />,
      text: `${cls.memberCount} ${cls.memberCount === 1 ? 'member' : 'members'}`,
      interactive: true,
      onClick: () => modalState.openMembers(cls),
    });

    const actions = [];

    if (isBoardOrAbove) {
      actions.push({
        label: 'Edit Details',
        onClick: () => modalState.openEdit(cls),
        icon: <Edit className="h-4 w-4 mr-2" />,
        variant: 'outline' as const,
      });
    } else {
      actions.push({
        label: 'View Details',
        onClick: () => modalState.openDetails(cls),
        icon: <Eye className="h-4 w-4 mr-2" />,
        variant: 'default' as const,
      });
    }

    return (
      <ItemCard
        key={cls.id}
        title={cls.name}
        badges={badges}
        metadata={metadata}
        description={cls.description || undefined}
        members={{
          data: cls.members,
          onViewAll: () => modalState.openMembers(cls),
          maxDisplay: 5,
        }}
        actions={actions}
      />
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Classes</h1>
          <p className="text-muted-foreground">Club classes</p>
        </div>
        {isBoardOrAbove && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Class
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading classes...</p>
          </CardContent>
        </Card>
      ) : available.length === 0 && inProgress.length === 0 && completed.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No classes at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-6">
          {inProgress.length > 0 && (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
              {inProgress.map(renderClassCard)}
            </div>
          )}

          {available.length > 0 && (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
              {available.map(renderClassCard)}
            </div>
          )}

          {completed.length > 0 && (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
              {completed.map(renderClassCard)}
            </div>
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      <EditModal
        open={isCreateModalOpen || modalState.modalType === 'edit'}
        onClose={() => {
          setIsCreateModalOpen(false);
          modalState.close();
        }}
        title={modalState.selectedItem ? 'Edit Class' : 'Create New Class'}
        description={modalState.selectedItem ? 'Update class details' : 'Add a new class'}
        onSubmit={handleSubmit}
        onDelete={modalState.selectedItem ? handleDelete : undefined}
        loading={saveLoading}
        deleteItemName={modalState.selectedItem?.name}
        submitLabel={modalState.selectedItem ? 'Update Class' : 'Create Class'}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Class Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Intro to Machine Learning"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Class description..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="STEM 3202"
            />
          </div>

          <SemesterSelector
            value={selectedSemester?.id || ''}
            onSelect={setSelectedSemester}
            required={false}
          />
        </div>

        <div className="space-y-2">
          <Label>Teacher</Label>
          <Popover open={teacherSearchOpen} onOpenChange={setTeacherSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                role="combobox"
                aria-expanded={teacherSearchOpen}
                className="w-full justify-between"
              >
                {selectedTeacher
                  ? availableTeachers.find((teacher) => teacher.id === selectedTeacher)?.full_name ||
                  availableTeachers.find((teacher) => teacher.id === selectedTeacher)?.email ||
                  'Select teacher...'
                  : 'Select teacher...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0">
              <Command>
                <CommandInput placeholder="Search teachers..." />
                <CommandList>
                  <CommandEmpty>No teachers found.</CommandEmpty>
                  <CommandGroup>
                    {availableTeachers.map((teacher) => (
                      <CommandItem
                        key={teacher.id}
                        value={`${teacher.full_name || ''} ${teacher.email}`}
                        onSelect={() => {
                          setSelectedTeacher(selectedTeacher === teacher.id ? '' : teacher.id);
                          setTeacherSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedTeacher === teacher.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{teacher.full_name || 'No name'}</span>
                          <span className="text-xs">{teacher.email}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </EditModal>

      {/* DETAIL MODAL */}
      {modalState.selectedItem && modalState.modalType === 'details' && (
        <DetailModal
          open={modalState.isOpen}
          onClose={modalState.close}
          title={modalState.selectedItem.name}
          subtitle={modalState.selectedItem.location ? `Location: ${modalState.selectedItem.location}` : undefined}
          sections={[
            ...(modalState.selectedItem.description
              ? [
                {
                  title: 'Description',
                  content: modalState.selectedItem.description,
                },
              ]
              : []),
            ...(modalState.selectedItem.semesters
              ? [
                {
                  title: 'Term',
                  icon: <CalendarIcon className="h-4 w-4" />,
                  content: `${modalState.selectedItem.semesters.code} - ${modalState.selectedItem.semesters.name}`,
                },
              ]
              : []),
            {
              title: 'Class Size',
              icon: <Users className="h-4 w-4" />,
              content: `${modalState.selectedItem.memberCount} ${modalState.selectedItem.memberCount === 1 ? 'member' : 'members'
                }`,
            },
            ...(modalState.selectedItem.semesters
              ? [
                {
                  title: 'Dates',
                  icon: <CalendarIcon className="h-4 w-4" />,
                  content: `${modalState.selectedItem.semesters.start_date
                    ? `Start: ${new Date(modalState.selectedItem.semesters.start_date).toLocaleDateString()}`
                    : ''
                    }${modalState.selectedItem.semesters.end_date
                      ? ` | End: ${new Date(modalState.selectedItem.semesters.end_date).toLocaleDateString()}`
                      : ''
                    }`,
                },
              ]
              : []),
            ...(modalState.selectedItem.members.some(m => m.role === 'teacher')
              ? [
                {
                  title: 'Teacher',
                  content: (
                    <div className="flex items-center gap-2">
                      {modalState.selectedItem.members
                        .filter(m => m.role === 'teacher')
                        .map(m => (
                          <div key={m.id} className="flex items-center gap-2">
                            <span className="font-semibold">{m.profile.full_name || 'No name'}</span>
                            <span className="text-xs text-muted-foreground">{m.profile.email}</span>
                          </div>
                        ))}
                    </div>
                  ),
                },
              ]
              : []),
          ]}
        />
      )}

      {/* MEMBERS MODAL */}
      {modalState.selectedItem && modalState.modalType === 'members' && (
        <MembersListModal
          open={modalState.isOpen}
          onClose={modalState.close}
          title={`${modalState.selectedItem.name} - Class Members`}
          members={modalState.selectedItem.members}
          showRole={true}
          roleIcon={(role) => (role === 'teacher' ? <GraduationCap className="h-3 w-3 mr-1" /> : null)}
        />
      )}
    </div>
  );
};

export default Classes;