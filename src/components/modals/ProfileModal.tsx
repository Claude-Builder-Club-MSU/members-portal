import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Trophy, Mail, GraduationCap, Crown, Users, Award, Linkedin, Github } from 'lucide-react';
import type { Database } from '@/integrations/supabase/database.types';
import { useIsMobile } from '@/hooks/use-mobile';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface MemberWithRole extends Profile {
  role: AppRole;
}

interface ProfileViewerProps {
  open: boolean;
  onClose: () => void;
  member: MemberWithRole | null;
}

const ProfileViewer = ({ open, onClose, member }: ProfileViewerProps) => {
  const isMobile = useIsMobile();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'e-board':
        return 'default';
      case 'board':
        return 'secondary';
      case 'member':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'e-board':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'board':
        return <Award className="h-4 w-4 text-blue-500" />;
      default:
        return <Users className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-lg ${isMobile ? 'mx-4 max-w-[90vw] overflow-y-auto rounded-xl m-0' : ''}`}>
        <DialogHeader>
          <DialogTitle>Member Profile</DialogTitle>
          <DialogDescription>View member details</DialogDescription>
        </DialogHeader>
        {member && (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={member.profile_picture_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {member.full_name
                    ? getInitials(member.full_name)
                    : member.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">
                  {member.full_name || 'No name'}
                </h3>
                <div className="flex items-center justify-center gap-2">
                  {getRoleIcon(member.role)}
                  {member.role === 'e-board' ? (
                    <Badge
                      className="capitalize sparkle gold-shimmer text-yellow-900 font-semibold border-2 border-yellow-400/50 relative"
                    >
                      <span className="sparkle-particle"></span>
                      <span className="sparkle-particle"></span>
                      <span className="sparkle-particle"></span>
                      <span className="relative z-10">{member.role.replace('-', ' ')}</span>
                    </Badge>
                  ) : member.role === 'board' ? (
                    <Badge
                      className="capitalize bg-primary text-cream font-semibold border-2 border-primary/50"
                    >
                      {member.role.replace('-', ' ')}
                    </Badge>
                  ) : (
                    <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                      {member.role.replace('-', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Profile Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{member.email}</p>
                </div>
              </div>

              {member.class_year && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Class Year</p>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm capitalize">{member.class_year}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Club Points</p>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <p className="text-sm font-semibold">{member.points} points</p>
                </div>
              </div>

              {(member.linkedin_username || member.github_username) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Social Links</p>
                    <div className="flex flex-col gap-2">
                      {member.linkedin_username && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => window.open(`https://linkedin.com/in/${member.linkedin_username}`, '_blank')}
                        >
                          <Linkedin className="h-4 w-4 mr-2 text-blue-600" />
                          View LinkedIn Profile
                        </Button>
                      )}
                      {member.github_username && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => window.open(`https://github.com/${member.github_username}`, '_blank')}
                        >
                          <Github className="h-4 w-4 mr-2" />
                          View GitHub Profile
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileViewer;