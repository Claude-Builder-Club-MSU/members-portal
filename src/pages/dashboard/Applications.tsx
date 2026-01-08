import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ApplicationModal } from '@/components/ApplicationModal';
import { ApplicationViewer } from '@/components/ApplicationViewer';
import type { Database } from '@/integrations/supabase/database.types';

type Application = Database['public']['Tables']['applications']['Row'];

const Applications = () => {
  const { user, role } = useAuth();
  const isMobile = useIsMobile();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    if (user && role) {
      fetchApplications();
    }
  }, [user, role]);

  const fetchApplications = async () => {
    if (!user) return;

    let query = supabase.from('applications').select('*');

    // E-board can see all applications
    if (role === 'e-board') {}

    // Board can see all non-board applications + their own board applications
    else if (role === 'board') {
      query = query.or(`application_type.neq.board,user_id.eq.${user.id}`);
    }
    // Regular users can only see their own
    else {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      setApplications(data);
    }
    setLoading(false);
  };

  const handleViewApplication = (application: Application) => {
    setSelectedApplication(application);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedApplication(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatApplicationType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const canReviewApplications = role === 'board' || role === 'e-board';

  return (
    <div className={`space-y-6 ${isMobile ? 'p-4' : 'p-6'}`}>
      <div className={`flex justify-between items-center ${isMobile ? 'flex-col gap-4' : ''}`}>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Applications</h1>
          <p className="text-muted-foreground">
            {canReviewApplications ? 'Review and manage applications' : 'Submit and track your applications'}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className={isMobile ? 'w-full' : ''}>
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading applications...</p>
          </CardContent>
        </Card>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No applications yet. Click "New Application" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className={`flex justify-between items-start ${isMobile ? 'flex-col gap-3' : ''}`}>
                  <div className="flex-1">
                    <CardTitle className={isMobile ? 'text-lg' : ''}>{app.full_name}</CardTitle>
                    <CardDescription className={`flex items-center gap-2 mt-1 ${isMobile ? 'flex-col gap-1 items-start' : ''}`}>
                      <span>{formatApplicationType(app.application_type)}</span>
                      <span className={isMobile ? 'hidden' : ''}>•</span>
                      <span>Submitted {new Date(app.created_at).toLocaleDateString()}</span>
                    </CardDescription>
                  </div>
                  <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-between' : ''}`}>
                    <Badge variant={getStatusColor(app.status)} className="capitalize">
                      {app.status}
                    </Badge>
                    {canReviewApplications && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewApplication(app)}
                        className={isMobile ? 'flex-1' : ''}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <ApplicationModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchApplications}
      />

      <ApplicationViewer
        application={selectedApplication}
        open={isViewerOpen}
        onClose={handleCloseViewer}
        onUpdate={fetchApplications}
      />
    </div>
  );
};

export default Applications;