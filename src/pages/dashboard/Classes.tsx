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
import { Plus, MapPin, Users, Edit, GraduationCap, Calendar, Eye, Crown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { ClassModal } from '@/components/modals/ClassModal';
import type { Database } from '@/integrations/supabase/database.types';

type Class = Database['public']['Tables']['classes']['Row'] & {
  semesters: { code: string; name: string } | null;
};
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
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  useEffect(() => {
    if (user && role) {
      fetchClasses();
    }
  }, [user, role]);

  const fetchClasses = async () => {
    if (!user) return;

    // Fetch all classes with semester info
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select(`
        *,
        semesters (
          code,
          name
        )
      `)
      .order('start_date', { ascending: false });

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
    const classesWithMembers: ClassWithMembers[] = (classesData as Class[]).map(cls => {
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

  const getClassStatus = (cls: ClassWithMembers) => {
    const now = new Date();
    const startDate = new Date(cls.start_date);
    const endDate = new Date(cls.end_date);

    if (startDate > now) return { label: 'Available', color: 'bg-green-500', state: 'available' };
    if (endDate < now) return { label: 'Completed', color: 'bg-gray-500', state: 'completed' };
    return { label: 'In Progress', color: 'bg-blue-500', state: 'in_progress' };
  };

  const handleViewDetails = (classItem: ClassWithMembers) => {
    setSelectedClass(classItem);
    setIsDetailsModalOpen(true);
  };

  const handleEditClass = (classItem: Class) => {
    setEditingClass(classItem);
    setIsModalOpen(true);
  };

  const handleViewMembers = (classItem: ClassWithMembers) => {
    setSelectedClass(classItem);
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
  const canSeeAll = role === 'board' || role === 'e-board';

  // Filter and group classes
  const availableClasses = classes.filter(c => {
    const status = getClassStatus(c);
    return status.state === 'available';
  });

  const inProgressClasses = classes.filter(c => {
    const status = getClassStatus(c);
    if (status.state !== 'in_progress') return false;
    return canSeeAll || c.userEnrollment;
  });

  const completedClasses = classes.filter(c => {
    const status = getClassStatus(c);
    if (status.state !== 'completed') return false;
    return canSeeAll || c.userEnrollment;
  });


  const renderClassCard = (classItem: ClassWithMembers) => {
    const isEnrolled = !!classItem.userEnrollment;
    const isTeacher = classItem.userEnrollment?.role === 'teacher';
    const teacher = classItem.members.find(m => m.enrollment.role === 'teacher');
    const status = getClassStatus(classItem);

    return (
      <Card key={classItem.id} className="flex flex-col h-full w-full relative">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex-1">{classItem.name}</CardTitle>
            <div className="flex flex-row gap-3 items-center">
              {isEnrolled && (
                <Badge variant={isTeacher ? 'default' : 'secondary'} className="shrink-0 whitespace-nowrap">
                  {isTeacher ? 'Teacher' : 'Student'}
                </Badge>
              )}
              <Badge className={`${status.color} text-white text-xs z-10`}>
                {status.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0">
          <div className="space-y-3 text-sm text-muted-foreground">
            {/* Semester Info */}
            {classItem.semesters && (
              <div className="flex items-center gap-2 pt-2">
                <Calendar className="h-4 w-4" />
                {classItem.semesters.code} - {classItem.semesters.name}
              </div>
            )}

            {classItem.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {classItem.location}
              </div>
            )}

            {/* Teacher Info */}
            {teacher && (
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="text-muted-foreground">Teacher:</span>
                {/* 3. Fixed the syntax error here (added 'teacher' before .profile) */}
                <span className="font-medium">{teacher.profile.full_name || teacher.profile.email}</span>
              </div>
            )}

            {/* Class Members Preview */}
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 cursor-pointer group w-fit">
                <Users className="h-4 w-4 group-hover:text-orange-600 transition-colors duration-400" />
                <span
                  className="underline decoration-transparent group-hover:decoration-orange-600 group-hover:text-orange-600 transition-all duration-400"
                  onClick={() => handleViewMembers(classItem)}
                >
                  {classItem.memberCount} {classItem.memberCount === 1 ? 'team member' : 'team members'}
                </span>
              </div>
              {classItem.members.length > 0 && (
                <div className="flex -space-x-2 mb-6">
                  {classItem.members.slice(0, 5).map(({ enrollment, profile }) => (
                    <Avatar key={enrollment.id} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={profile.profile_picture_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {profile.full_name ? getInitials(profile.full_name) : profile.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {classItem.members.length > 5 && (
                    <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
                      +{classItem.members.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {classItem.description && (
            <div className="text-sm text-muted-foreground flex-1 space-y-3 break-words pt-3 whitespace-pre-line">
              {classItem.description}
            </div>
          )}

          <div className="space-y-2 mt-4">
            {canManageClasses ? (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleEditClass(classItem)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleViewDetails(classItem)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Classes</h1>
          <p className="text-muted-foreground">Club classes</p>
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
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading classes...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6">
          {/* In Progress Classes */}
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
            {inProgressClasses.map(renderClassCard)}
          </div>

          {/* Available Classes */}
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
            {availableClasses.map(renderClassCard)}
          </div>

          {/* Completed Classes */}
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(350px,500px))]">
            {completedClasses.map(renderClassCard)}
          </div>

          {/* Empty State */}
          {availableClasses.length === 0 && inProgressClasses.length === 0 && completedClasses.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No classes at this time.
                </p>
              </CardContent>
            </Card>
          )}
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

      {/* Class Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedClass?.name}</DialogTitle>
            {selectedClass?.location && (
              <DialogDescription>
                Location: {selectedClass.location}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedClass && (
            <div className="space-y-6">
              {/* Description */}
              {selectedClass.description && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedClass.description}
                  </p>
                </div>
              )}

              {/* Class Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Term */}
                {selectedClass.semesters && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Term</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {selectedClass.semesters.code} - {selectedClass.semesters.name}
                    </div>
                  </div>
                )}

                {/* Member Count */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Class Size</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {selectedClass.memberCount} {selectedClass.memberCount === 1 ? 'member' : 'members'}
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-2 col-span-2">
                  <h3 className="font-semibold text-sm">Dates</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {selectedClass.start_date
                      ? `Start: ${new Date(selectedClass.start_date).toLocaleDateString()}`
                      : null}
                    {selectedClass.end_date
                      ? ` | End: ${new Date(selectedClass.end_date).toLocaleDateString()}`
                      : null}
                  </div>
                </div>
              </div>

              {/* Teacher */}
              {selectedClass.members?.some(({ enrollment }) => enrollment.role === "teacher") && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Teacher</h3>
                  {selectedClass.members
                    ?.filter(({ enrollment }) => enrollment.role === "teacher")
                    .map(({ enrollment, profile }) => (
                      <div key={enrollment.id} className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.profile_picture_url || undefined} />
                          <AvatarFallback>
                            {profile.full_name
                              ? getInitials(profile.full_name)
                              : profile.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{profile.full_name || "No name"}</span>
                        <span className="text-xs text-muted-foreground">{profile.email}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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