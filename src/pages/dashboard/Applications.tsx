import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Calendar, Briefcase, BookOpen, FileCode, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ApplicationCreateModal } from '@/components/modals/ApplicationCreateModal';
import type { Database } from '@/integrations/supabase/database.types';

type Application = Database['public']['Tables']['applications']['Row'];

const Applications = () => {
  const { user } = useAuth();
  const { role, isBoardOrAbove } = useProfile();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReviewedCollapsed, setIsReviewedCollapsed] = useState(true);

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

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const reviewedApplications = applications.filter(app => app.status === 'accepted' || app.status === 'rejected');

  const getStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
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

  const getApplicationIcon = (type: string) => {
    switch (type) {
      case 'board':
        return <Briefcase className="h-4 w-4" />;
      case 'project':
        return <FileCode className="h-4 w-4" />;
      case 'class':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <Briefcase className="h-4 w-4" />;
    }
  };

  const getApplicationTarget = (application: Application) => {
    if (application.application_type === 'board' && application.board_position) {
      return application.board_position;
    }
    return formatApplicationType(application.application_type);
  };

  const renderApplicationCard = (app: Application) => (
    <Card key={app.id} className="hover:shadow-md transition-shadow p-6">
      <div className={`flex h-full justify-between items-center ${isMobile ? 'gap-3' : ''}`}>
        <div className={`flex flex-col justify-between ${isMobile ? 'h-full' : 'gap-2'}`}>
          <div className="flex items-center gap-2">
            {getApplicationIcon(app.application_type)}
            <CardTitle className={isMobile ? 'text-lg' : ''}>{app.full_name}</CardTitle>
          </div>
          <CardDescription className={`flex items-center ${isMobile ? 'flex-col items-start mt-1 gap-1' : 'mt-1 gap-2'}`}>
            <span>{getApplicationTarget(app)}</span>
            <span className={isMobile ? 'hidden' : ''}>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(app.created_at).toLocaleDateString()}
            </span>
          </CardDescription>
        </div>
        <div className={`flex ${isMobile ? 'flex-col h-full justify-between items-end' : 'items-center gap-7'}`}>
          <Badge variant={getStatusVariant(app.status)} className="capitalize">
            {app.status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                window.open(`/applications/${app.id}`, '_blank', 'noopener');
              } else {
                navigate(`/applications/${app.id}`);
              }
            }}
            className="rounded-md px-3 h-9"
          >
            <Eye className="h-4 w-4 mr-2" />
            {isBoardOrAbove ? 'Review' : 'View'}
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Applications</h1>
          <p className="text-muted-foreground">
            {isBoardOrAbove ? 'Manage member applications' : 'Your applications'}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
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
        <div className="space-y-6 mt-6">
          {/* Pending Applications */}
          {pendingApplications.length > 0 && (
            <div className="space-y-4 grid gap-4">
              {pendingApplications.map(renderApplicationCard)}
            </div>
          )}

          {/* Reviewed Applications - Collapsible */}
          {reviewedApplications.length > 0 && (
            <Collapsible open={!isReviewedCollapsed} onOpenChange={(open) => setIsReviewedCollapsed(!open)}>
              <div className="space-y-4">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-start p-0 h-auto hover:text-black hover:bg-background border-0">
                    <div className="flex items-center gap-2 w-full">
                      {isReviewedCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <h2 className="text-xl font-semibold">Reviewed Applications</h2>
                      <Badge variant="secondary">{reviewedApplications.length}</Badge>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid gap-4">
                    {reviewedApplications.map(renderApplicationCard)}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
        </div>
      )}

      <ApplicationCreateModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchApplications();
        }}
      />
    </div>
  );
};

export default Applications;