import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ApplicationModal } from '@/components/modals/ApplicationModal';
import type { Database } from '@/integrations/supabase/database.types';
import { useNavigate } from 'react-router-dom';

type Application = Database['public']['Tables']['applications']['Row'];

const Applications = () => {
  const { user, role } = useAuth();
  const isMobile = useIsMobile();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role) {
      fetchApplications();
    }
  }, [user, role]);

  const fetchApplications = async () => {
    if (!user) return;

    let query = supabase.from('applications').select('*');


    // E-board can see all applications
    if (role === 'e-board') {
      // No filter needed
    }
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleNewApplication = () => {
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'enable';
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
    <div className="p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Applications</h1>
          <p className="text-muted-foreground">
            Manage Applications
          </p>
        </div>
        <Button onClick={handleNewApplication}>
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      {loading ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading applications...</p>
          </CardContent>
        </Card>
      ) : applications.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No applications yet. Click "New Application" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 mt-6">
          {applications.map((app) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow h-[150px] p-6">
              <div className={`flex h-full justify-between items-center ${isMobile ? 'gap-3' : ''}`}>
                <div className={`flex flex-col justify-between ${isMobile ? 'h-full' : 'gap-2'}`}>
                  <CardTitle className={isMobile ? 'text-lg' : ''}>{app.full_name}</CardTitle>
                  <CardDescription className={`flex items-center gap-2 ${isMobile ? 'flex-col items-start' : 'mt-1'}`}>
                    <span>{formatApplicationType(app.application_type)}</span>
                    <span className={isMobile ? 'hidden' : ''}>•</span>
                    <span>Submitted {new Date(app.created_at).toLocaleDateString()}</span>
                  </CardDescription>
                </div>
                <div className={`flex ${isMobile ? 'flex-col h-full justify-between items-end' : 'items-center gap-7'}`}>
                  <Badge variant={getStatusColor(app.status)} className="capitalize">
                    {app.status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={e => {
                      if (e.ctrlKey || e.metaKey) {
                        window.open(`/applications/${app.id}`, '_blank', 'noopener');
                      } else {
                        navigate(`/applications/${app.id}`);
                      }
                    }}
                    className="rounded-md px-3 h-9"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Review
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ApplicationModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={fetchApplications}
      />
    </div>
  );
};

export default Applications;