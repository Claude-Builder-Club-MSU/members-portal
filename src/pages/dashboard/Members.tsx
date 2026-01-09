import { useState, useEffect, Fragment } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Mail, GraduationCap, Crown, Users, Award, Eye } from 'lucide-react';
import type { Database } from '@/integrations/supabase/database.types';
import { useIsMobile } from '@/hooks/use-mobile';
import ProfileViewer from '@/components/modals/ProfileModal';

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

  // Only E-board can manage roles on Members page
  const canManageRoles = userRole === 'e-board';

  // Group members by team
  const groupedMembers = members.reduce((acc, member) => {
    // E-board members get "E-board" as their team
    let teamName = member.role === 'e-board' ? 'E-board' : (member.team || 'General Members');

    // Find existing team group
    let teamGroup = acc.find(g => g.team === teamName);

    if (!teamGroup) {
      teamGroup = { team: teamName, members: [], priority: 0 };
      // Set priority for sorting
      if (teamName === 'E-board') teamGroup.priority = 1;
      else if (member.team) teamGroup.priority = 2; // Teams with positions
      else teamGroup.priority = 3; // General members

      acc.push(teamGroup);
    }

    teamGroup.members.push(member);
    return acc;
  }, [] as Array<{ team: string; members: MemberWithRole[]; priority: number }>);

  // Sort teams by priority, then alphabetically
  groupedMembers.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.team.localeCompare(b.team);
  });

  // Within each team, sort by position (directors first) then alphabetically
  groupedMembers.forEach(group => {
    group.members.sort((a, b) => {
      // E-board: all flat, sort alphabetically
      if (group.team === 'E-board') {
        return (a.full_name || a.email).localeCompare(b.full_name || b.email);
      }

      // Other teams: Director/Lead first, then alphabetically
      const aIsLead = a.position?.toLowerCase().includes('director') || a.position?.toLowerCase().includes('lead');
      const bIsLead = b.position?.toLowerCase().includes('director') || b.position?.toLowerCase().includes('lead');

      if (aIsLead && !bIsLead) return -1;
      if (!aIsLead && bIsLead) return 1;
      return (a.full_name || a.email).localeCompare(b.full_name || b.email);
    });
  });

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
                {member.position && (
                  <p className="text-sm text-muted-foreground truncate mt-1">{member.position}</p>
                )}
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
                className="capitalize shrink-0 whitespace-nowrap bg-primary text-cream font-semibold border-2 border-primary/50"
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
              variant='default'
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
      <div className="p-6">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Members</h1>
          <p className="text-muted-foreground">Club members</p>
        </div>
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading members...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Members</h1>
        <p className="text-muted-foreground">
          {members.length} club {members.length === 1 ? 'member' : 'members'}
        </p>
      </div>

      {/* Members Grid - grouped by team */}
      <div className="space-y-8 mt-6">
        {groupedMembers.map((group) => (
          <div key={group.team}>
            <h2 className="text-xl font-bold mb-4">{group.team}</h2>
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,400px))]">
              {group.members.map((member) => renderMemberCard(member))}
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No members found.</p>
          </CardContent>
        </Card>
      )}

      {/* Profile Viewer */}
      <ProfileViewer
        open={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
      />
    </div>
  );
};

export default Members;