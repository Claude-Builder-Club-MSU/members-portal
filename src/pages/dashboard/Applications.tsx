import { useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Calendar, Briefcase, BookOpen, FileCode, ChevronDown, ChevronRight, Folder, FolderOpen, User, Shield } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ApplicationCreateModal } from '@/components/modals/ApplicationCreateModal';
import type { Database } from '@/integrations/supabase/database.types';

type Application = Database['public']['Tables']['applications']['Row'];

const Applications = () => {
  const { isBoardOrAbove, userApplications, applicationsLoading, refreshApplications } = useProfile();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [myApplicationsCollapsed, setMyApplicationsCollapsed] = useState(false);
  const [myPendingCollapsed, setMyPendingCollapsed] = useState(false);
  const [myReviewedCollapsed, setMyReviewedCollapsed] = useState(true);
  const [reviewApplicationsCollapsed, setReviewApplicationsCollapsed] = useState(false);
  const [reviewPendingCollapsed, setReviewPendingCollapsed] = useState(false);
  const [reviewReviewedCollapsed, setReviewReviewedCollapsed] = useState(true);

  const getStatusVariant = (status: string): 'enable' | 'destructive' | 'secondary' => {
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

  const renderApplicationSection = (title: string, applications: Application[], collapsed: boolean, onToggle: () => void, icon: React.ReactNode) => {
    if (applications.length === 0) return null;

    return (
      <Collapsible open={!collapsed} onOpenChange={onToggle}>
        <div className="space-y-4">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-start p-0 h-auto hover:text-black hover:bg-background border-0">
              <div className="flex items-center gap-2 w-full">
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="text-lg font-medium">{title}</span>
                </div>
                <Badge variant="secondary">{applications.length}</Badge>
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className={`grid gap-4 ${isMobile ? "ml-0" : "ml-6"}`}>
              {applications.map(renderApplicationCard)}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  const myApplicationsTotal = userApplications ? (
    userApplications.self.pending.length +
    userApplications.self.accepted.length +
    userApplications.self.rejected.length
  ) : 0;

  const reviewApplicationsTotal = userApplications ? (
    userApplications.review.pending.length +
    userApplications.review.accepted.length +
    userApplications.review.rejected.length
  ) : 0;

  return (
    <div className="p-6 w-full h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Applications</h1>
          <p className="text-muted-foreground">
            {isBoardOrAbove ? 'Manage applications' : 'Your applications'}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} disabled={false} >
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      {applicationsLoading ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading applications...</p>
          </CardContent>
        </Card>
      ) : !userApplications || (myApplicationsTotal === 0 && reviewApplicationsTotal === 0) ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No applications yet. Click "New Application" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 mt-6">
          {/* My Applications Folder */}
          {myApplicationsTotal > 0 && (
            <Collapsible open={!myApplicationsCollapsed} onOpenChange={setMyApplicationsCollapsed}>
              <div className="space-y-4">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-start p-0 h-auto hover:text-black hover:bg-background border-0">
                    <div className="flex items-center gap-2 w-full">
                      {myApplicationsCollapsed ? (
                        <Folder className="h-5 w-5" />
                      ) : (
                        <FolderOpen className="h-5 w-5" />
                      )}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <h2 className="text-xl font-semibold">My Applications</h2>
                      </div>
                      <Badge variant="secondary">{myApplicationsTotal}</Badge>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4">
                  {/* My Pending Applications */}
                  {renderApplicationSection(
                    "Pending",
                    userApplications.self.pending,
                    myPendingCollapsed,
                    () => setMyPendingCollapsed(!myPendingCollapsed),
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  )}

                  {/* My Reviewed Applications */}
                  {renderApplicationSection(
                    "Reviewed",
                    [...userApplications.self.accepted, ...userApplications.self.rejected],
                    myReviewedCollapsed,
                    () => setMyReviewedCollapsed(!myReviewedCollapsed),
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Review Applications Folder */}
          {reviewApplicationsTotal > 0 && (
            <Collapsible open={!reviewApplicationsCollapsed} onOpenChange={setReviewApplicationsCollapsed}>
              <div className="space-y-4">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-start p-0 h-auto hover:text-black hover:bg-background border-0">
                    <div className="flex items-center gap-2 w-full">
                      {reviewApplicationsCollapsed ? (
                        <Folder className="h-5 w-5" />
                      ) : (
                        <FolderOpen className="h-5 w-5" />
                      )}
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <h2 className="text-xl font-semibold">Review Applications</h2>
                      </div>
                      <Badge variant="secondary">{reviewApplicationsTotal}</Badge>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4">
                  {/* Review Pending Applications */}
                  {renderApplicationSection(
                    "Pending Review",
                    userApplications.review.pending,
                    reviewPendingCollapsed,
                    () => setReviewPendingCollapsed(!reviewPendingCollapsed),
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}

                  {/* Review Reviewed Applications */}
                  {renderApplicationSection(
                    "Reviewed",
                    [...userApplications.review.accepted, ...userApplications.review.rejected],
                    reviewReviewedCollapsed,
                    () => setReviewReviewedCollapsed(!reviewReviewedCollapsed),
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  )}
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
          refreshApplications();
          // Invalidate the applications query to refresh the UI
          queryClient.invalidateQueries({ queryKey: ['user-applications'] });
        }}
      />
    </div>
  );
};

export default Applications;