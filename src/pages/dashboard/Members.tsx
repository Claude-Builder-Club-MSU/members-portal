import { useState, useEffect, Fragment } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Mail, GraduationCap, Crown, Users, Award, Eye, Linkedin } from 'lucide-react';
import type { Database } from '@/integrations/supabase/database.types';
import { useIsMobile } from '@/hooks/use-mobile';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface MemberWithRole extends Profile {
  role: AppRole;
}

const Members = () => {
  const { toast } = useToast();
  const { role: userRole } = useAuth();
  const [members, setMembers] = useState<MemberWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberWithRole | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    // Fetch all profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    if (!profilesData) {
      setLoading(false);
      return;
    }

    // Fetch all user roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    // Create a map of user_id to role
    const roleMap = new Map(
      rolesData?.map(r => [r.user_id, r.role]) || []
    );

    // Combine profiles with roles, exclude prospects
    const membersWithRoles: MemberWithRole[] = profilesData
      .map(profile => ({
        ...profile,
        role: roleMap.get(profile.id) || 'prospect',
      }))
      .filter(member => member.role !== 'prospect'); // Exclude prospects

    setMembers(membersWithRoles);
    setLoading(false);
  };

  const handleRoleChange = async (memberId: string, newRole: AppRole) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', memberId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });
      fetchMembers();
    }
  };

  const handleViewProfile = (member: MemberWithRole) => {
    setSelectedMember(member);
    setIsProfileModalOpen(true);
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  const getRolePriority = (role: AppRole): number => {
    switch (role) {
      case 'e-board':
        return 1;
      case 'board':
        return 2;
      case 'member':
        return 3;
      default:
        return 4;
    }
  };

  // Only E-board can manage roles on Members page
  const canManageRoles = userRole === 'e-board';

  // Sort members by role priority, then by name
  const sortedMembers = [...members].sort((a, b) => {
    const priorityDiff = getRolePriority(a.role) - getRolePriority(b.role);
    if (priorityDiff !== 0) return priorityDiff;
    return (a.full_name || a.email).localeCompare(b.full_name || b.email);
  });

  // Group members by role for row breaks
  const groupedMembers = sortedMembers.reduce((acc, member, index) => {
    const prevMember = index > 0 ? sortedMembers[index - 1] : null;
    const isNewRole = !prevMember || prevMember.role !== member.role;

    if (isNewRole) {
      acc.push({ role: member.role, members: [member] });
    } else {
      acc[acc.length - 1].members.push(member);
    }

    return acc;
  }, [] as Array<{ role: AppRole; members: MemberWithRole[] }>);

  const renderMemberCard = (member: MemberWithRole) => {
    return (
      <Card key={member.id} className="flex flex-col h-full w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={member.profile_picture_url || undefined} />
                <AvatarFallback className="text-lg">
                  {member.full_name ? getInitials(member.full_name) : member.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">
                  {member.full_name || 'No name'}
                </CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Mail className="h-3 w-3 shrink-0" />
                  <p className="truncate">{member.email}</p>
                </div>
              </div>
            </div>
            {member.role === 'e-board' ? (
              <Badge
                className="capitalize shrink-0 whitespace-nowrap sparkle gold-shimmer text-yellow-900 font-semibold border-2 border-yellow-400/50 relative"
              >
                <span className="sparkle-particle"></span>
                <span className="sparkle-particle"></span>
                <span className="sparkle-particle"></span>
                <span className="relative z-10">{member.role.replace('-', ' ')}</span>
              </Badge>
            ) : member.role === 'board' ? (
              <Badge
                className="capitalize shrink-0 whitespace-nowrap bg-claude-peach text-cream font-semibold border-2 border-claude-peach/50"
              >
                {member.role.replace('-', ' ')}
              </Badge>
            ) : (
              <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize shrink-0 whitespace-nowrap">
                {member.role.replace('-', ' ')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between text-sm">
              {member.class_year ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  <span className="capitalize">{member.class_year}</span>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <GraduationCap className="h-4 w-4 inline mr-2" />
                  No class year
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Trophy className="h-4 w-4" />
                <span className="font-medium">{member.points}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {canManageRoles && (
              <Select
                value={member.role}
                onValueChange={(value) => handleRoleChange(member.id, value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="board">Board</SelectItem>
                  <SelectItem value="e-board">E-Board</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleViewProfile(member)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Members</h1>
          <p className="text-muted-foreground">Club members</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading members...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Members</h1>
        <p className="text-muted-foreground">
          {members.length} club {members.length === 1 ? 'member' : 'members'}
        </p>
      </div>

      {/* Members Grid - grouped by role, each role starts a new row */}
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,400px))]">
        {groupedMembers.map((group, groupIndex) => (
          <Fragment key={group.role}>
            {/* Add a break element before each role group (except the first) to force new row */}
            {groupIndex > 0 && <div className="col-span-full" />}
            {group.members.map((member) => renderMemberCard(member))}
          </Fragment>
        ))}
      </div>

      {members.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No members found.</p>
          </CardContent>
        </Card>
      )}

      {/* Profile View Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Member Profile</DialogTitle>
            <DialogDescription>View member details</DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={selectedMember.profile_picture_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {selectedMember.full_name
                      ? getInitials(selectedMember.full_name)
                      : selectedMember.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">
                    {selectedMember.full_name || 'No name'}
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    {getRoleIcon(selectedMember.role)}
                    {selectedMember.role === 'e-board' ? (
                      <Badge
                        className="capitalize sparkle gold-shimmer text-yellow-900 font-semibold border-2 border-yellow-400/50 relative"
                      >
                        <span className="sparkle-particle"></span>
                        <span className="sparkle-particle"></span>
                        <span className="sparkle-particle"></span>
                        <span className="relative z-10">{selectedMember.role.replace('-', ' ')}</span>
                      </Badge>
                    ) : selectedMember.role === 'board' ? (
                      <Badge
                        className="capitalize bg-claude-peach text-cream font-semibold border-2 border-claude-peach/50"
                      >
                        {selectedMember.role.replace('-', ' ')}
                      </Badge>
                    ) : (
                      <Badge variant={getRoleBadgeVariant(selectedMember.role)} className="capitalize">
                        {selectedMember.role.replace('-', ' ')}
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
                    <p className="text-sm">{selectedMember.email}</p>
                  </div>
                </div>

                {selectedMember.class_year && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Class Year</p>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm capitalize">{selectedMember.class_year}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Club Points</p>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm font-semibold">{selectedMember.points} points</p>
                  </div>
                </div>

                {selectedMember.linkedin_url && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">LinkedIn</p>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => window.open(selectedMember.linkedin_url!, '_blank')}
                      >
                        <Linkedin className="h-4 w-4 mr-2 text-blue-600" />
                        View LinkedIn Profile
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Members;