import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BookOpen, MapPin, Clock, Users, Edit } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ClassModal } from '@/components/ClassModal';
import type { Database } from '@/integrations/supabase/database.types';

type Class = Database['public']['Tables']['classes']['Row'];
type ClassEnrollment = Database['public']['Tables']['class_enrollments']['Row'];

interface ClassWithEnrollment extends Class {
  enrollment?: ClassEnrollment;
  enrollmentCount?: number;
}

const Classes = () => {
  const { user, role } = useAuth();
  const isMobile = useIsMobile();
  const [classes, setClasses] = useState<ClassWithEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

    // Fetch user's enrollments
    const { data: enrollmentsData } = await supabase
      .from('class_enrollments')
      .select('*')
      .eq('user_id', user.id);

    // Create a map of class_id to enrollment
    const enrollmentMap = new Map(
      enrollmentsData?.map(e => [e.class_id, e]) || []
    );

    // Fetch enrollment counts for each class
    const classesWithData = await Promise.all(
      classesData.map(async (cls) => {
        const { count } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id);

        return {
          ...cls,
          enrollment: enrollmentMap.get(cls.id),
          enrollmentCount: count || 0,
        };
      })
    );

    setClasses(classesWithData);
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

  const canManageClasses = role === 'board' || role === 'e-board';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Available club classes</p>
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
          {classes.map((cls) => (
            <Card key={cls.id}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-primary mt-1" />
                  <div className="flex-1">
                    <CardTitle>{cls.name}</CardTitle>
                    {cls.description && (
                      <CardDescription className="mt-2">{cls.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {cls.enrollmentCount} {cls.enrollmentCount === 1 ? 'student' : 'students'}
                </div>

                <div className="pt-2 space-y-2">
                  {cls.enrollment ? (
                    <>
                      <div className="text-sm text-green-600 font-medium">
                        Enrolled as {cls.enrollment.role}
                      </div>
                      {!canManageClasses && (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => handleUnenroll(cls.id)}
                        >
                          Unenroll
                        </Button>
                      )}
                    </>
                  ) : (
                    !canManageClasses && (
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
          ))}
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
    </div>
  );
};

export default Classes;