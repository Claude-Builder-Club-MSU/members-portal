import { useState, useEffect } from 'react';
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

  // Group members by role
  const eBoardMembers = members.filter(m => m.role === 'e-board');
  const boardMembers = members.filter(m => m.role === 'board');
  const regularMembers = members.filter(m => m.role === 'member');

  const renderMemberCard = (member: MemberWithRole) => {
    return (
      <Card key={member.id}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
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
                <Mail className="h-3 w-3" />
                <p className="truncate">{member.email}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
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

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleViewProfile(member)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          </div>

          {canManageRoles && (
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">Change Role</label>
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
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
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
        <h1 className="text-3xl font-bold">Members</h1>
        <p className="text-muted-foreground">
          {members.length} club {members.length === 1 ? 'member' : 'members'}
        </p>
      </div>

      {/* Executive Board Section */}
      {eBoardMembers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <h2 className="text-2xl font-bold">Executive Board</h2>
            <Badge variant="default">{eBoardMembers.length}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {eBoardMembers.map(renderMemberCard)}
          </div>
        </div>
      )}

      {/* Board Section */}
      {boardMembers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-500" />
            <h2 className="text-2xl font-bold">Board</h2>
            <Badge variant="secondary">{boardMembers.length}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {boardMembers.map(renderMemberCard)}
          </div>
        </div>
      )}

      {/* Members Section */}
      {regularMembers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            <h2 className="text-2xl font-bold">Members</h2>
            <Badge variant="outline">{regularMembers.length}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {regularMembers.map(renderMemberCard)}
          </div>
        </div>
      )}

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
                    <Badge variant={getRoleBadgeVariant(selectedMember.role)} className="capitalize">
                      {selectedMember.role.replace('-', ' ')}
                    </Badge>
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