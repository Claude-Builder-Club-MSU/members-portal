import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BookOpen, MapPin, Clock } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  schedule: string | null;
}

const Classes = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [userRole, setUserRole] = useState<string>('prospect');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchClasses();
    }
  }, [user]);

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

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setClasses(data);
    }
    setLoading(false);
  };

  const canManageClasses = userRole === 'board' || userRole === 'e-board';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Available club classes</p>
        </div>
        {canManageClasses && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Class
          </Button>
        )}
      </div>

      {loading ? (
        <p>Loading classes...</p>
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
                {canManageClasses && (
                  <Button className="w-full mt-4" variant="outline">
                    Manage Class
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Classes;
