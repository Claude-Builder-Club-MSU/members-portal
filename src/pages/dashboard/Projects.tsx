import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Github, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  client_name: string | null;
  description: string | null;
  github_url: string;
  due_date: string | null;
  lead_id: string | null;
}

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [userRole, setUserRole] = useState<string>('prospect');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchProjects();
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

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('due_date', { ascending: true });

    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  };

  const canManageProjects = userRole === 'board' || userRole === 'e-board';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Active club projects</p>
        </div>
        {canManageProjects && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        )}
      </div>

      {loading ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No active projects at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                {project.client_name && (
                  <CardDescription className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client: {project.client_name}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {project.description && (
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                )}
                {project.due_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Due: {format(new Date(project.due_date), 'PPP')}
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(project.github_url, '_blank')}
                >
                  <Github className="h-4 w-4 mr-2" />
                  View on GitHub
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
