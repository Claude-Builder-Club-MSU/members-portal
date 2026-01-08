import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, MapPin, Clock, Users, Edit, GraduationCap } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ClassModal } from '@/components/ClassModal';
import type { Database } from '@/integrations/supabase/database.types';

type Class = Database['public']['Tables']['classes']['Row'];
type ClassEnrollment = Database['public']['Tables']['class_enrollments']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface ClassWithMembers extends Class {
  members: Array<{
    enrollment: ClassEnrollment;
    profile: Profile;
  }>;
  memberCount: number;
  userEnrollment?: ClassEnrollment;
}

const Classes = () => {
  const { user, role } = useAuth();
  const isMobile = useIsMobile();
  const [classes, setClasses] = useState<ClassWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassWithMembers | null>(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  useEffect(() => {
    if (user && role) {
      fetchClasses();
    }
  }, [user, role]);

  const fetchClasses = async () => {
    if (!user) return;

    // Fetch all classes
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .order('name', { ascending: true });

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      setLoading(false);
      return;
    }

    if (!classesData) {
      setLoading(false);
      return;
    }

    // Fetch all class enrollments
    const { data: enrollmentsData } = await supabase
      .from('class_enrollments')
      .select('*');

    // Fetch all profiles for enrolled users
    const enrolledUserIds = [...new Set(enrollmentsData?.map(e => e.user_id) || [])];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', enrolledUserIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    // Combine data
    const classesWithMembers: ClassWithMembers[] = classesData.map(cls => {
      const classEnrollments = enrollmentsData?.filter(e => e.class_id === cls.id) || [];
      const members = classEnrollments
        .map(enrollment => ({
          enrollment,
          profile: profilesMap.get(enrollment.user_id)!,
        }))
        .filter(m => m.profile);

      const userEnrollment = classEnrollments.find(e => e.user_id === user.id);

      return {
        ...cls,
        members,
        memberCount: members.length,
        userEnrollment,
      };
    });

    setClasses(classesWithMembers);
    setLoading(false);
  };

  const handleEnroll = async (classId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('class_enrollments')
      .insert({
        user_id: user.id,
        class_id: classId,
        role: 'student',
      });

    if (error) {
      console.error('Error enrolling in class:', error);
      return;
    }

    fetchClasses();
  };

  const handleUnenroll = async (classId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('class_enrollments')
      .delete()
      .eq('user_id', user.id)
      .eq('class_id', classId);

    if (error) {
      console.error('Error unenrolling from class:', error);
      return;
    }

    fetchClasses();
  };

  const handleEditClass = (cls: Class) => {
    setEditingClass(cls);
    setIsModalOpen(true);
  };

  const handleViewMembers = (cls: ClassWithMembers) => {
    setSelectedClass(cls);
    setIsMembersModalOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canManageClasses = role === 'board' || role === 'e-board';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Classes</h1>
          <p className="text-muted-foreground">Available classes</p>
        </div>
        {canManageClasses && (
          <Button onClick={() => {
            setEditingClass(null);
            setIsModalOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Class
          </Button>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading classes...</p>
          </CardContent>
        </Card>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No classes available at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const isEnrolled = !!cls.userEnrollment;
            const isTeacher = cls.userEnrollment?.role === 'teacher';

            return (
              <Card key={cls.id} className="flex flex-col h-full w-full">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-lg flex-1">{cls.name}</CardTitle>
                    {isEnrolled && (
                      <Badge variant={isTeacher ? 'default' : 'secondary'} className="shrink-0 whitespace-nowrap">
                        {isTeacher ? 'Teacher' : 'Student'}
                      </Badge>
                    )}
                  </div>
                  {cls.description && (
                    <CardDescription className="mt-2">{cls.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col flex-1 min-h-0">
                {cls.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {cls.location}
                  </div>
                )}
                {cls.schedule && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {cls.schedule}
                  </div>
                )}
                {/* Class Members Preview */}
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 cursor-pointer group w-fit">
                    <Users className="h-4 w-4 group-hover:text-orange-600 transition-colors duration-400" />
                    <span
                      className="underline decoration-transparent group-hover:decoration-orange-600 group-hover:text-orange-600 transition-all duration-400"
                      onClick={() => handleViewMembers(cls)}
                    >
                      {cls.memberCount} {cls.memberCount === 1 ? 'class member' : 'class members'}
                    </span>
                  </div>
                  {cls.members.length > 0 && (
                    <div className="flex -space-x-2 mb-6">
                      {cls.members.slice(0, 5).map(({ enrollment, profile }) => (
                        <Avatar key={enrollment.id} className="h-8 w-8 border-2 border-background">
                          <AvatarImage src={profile.profile_picture_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {profile.full_name ? getInitials(profile.full_name) : profile.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {cls.members.length > 5 && (
                        <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
                          +{cls.members.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                  <div className="space-y-2 mt-4">
                    {!canManageClasses && (
                      cls.userEnrollment ? (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => handleUnenroll(cls.id)}
                        >
                          Unenroll
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant="default"
                          onClick={() => handleEnroll(cls.id)}
                        >
                          Enroll
                        </Button>
                      )
                    )}

                    {canManageClasses && (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleEditClass(cls)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Class
                      </Button>
                    )}
                  </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <ClassModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClass(null);
        }}
        onSuccess={fetchClasses}
        existingClass={editingClass}
      />

      {/* Class Members Modal */}
      <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedClass?.name} - Class Members</DialogTitle>
            <DialogDescription>
              {selectedClass?.memberCount} {selectedClass?.memberCount === 1 ? 'member' : 'members'} in this class
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {selectedClass?.members.map(({ enrollment, profile }) => (
              <div
                key={enrollment.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.profile_picture_url || undefined} />
                  <AvatarFallback>
                    {profile.full_name ? getInitials(profile.full_name) : profile.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {profile.full_name || 'No name'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {profile.email}
                  </p>
                </div>
                <Badge variant={enrollment.role === 'teacher' ? 'default' : 'secondary'} className="capitalize">
                  {enrollment.role === 'teacher' && <GraduationCap className="h-3 w-3 mr-1" />}
                  {enrollment.role}
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Classes;