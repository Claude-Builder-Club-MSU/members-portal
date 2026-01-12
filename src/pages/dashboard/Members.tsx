import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { PersonCard } from '@/components/PersonCard';
import ProfileViewer from '@/components/modals/ProfileModal';
import type { Database } from '@/integrations/supabase/database.types';
import { useProfile } from '@/contexts/ProfileContext';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface MemberWithRole extends Profile {
  role: AppRole;
}

const Members = () => {
  const { toast } = useToast();
  const { role: userRole } = useProfile();
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberWithRole | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (profilesError || !profilesData) {
      setLoading(false);
      return;
    }

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const roleMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

    const membersWithRoles: MemberWithRole[] = profilesData
      .map(profile => ({
        ...profile,
        role: roleMap.get(profile.id) || 'prospect',
      }))
      .filter(member => member.role !== 'prospect');

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

  const handleKickMember = async (memberId: string, memberName: string) => {
    try {
      const { data, error } = await supabase.rpc('delete_user_by_id', {
        target_user_id: memberId,
      });

      if (error) throw error;

      toast({
        title: 'Member Kicked',
        description: `${memberName} has been kicked from the club`,
      });
      fetchMembers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to kick member',
        variant: 'destructive',
      });
    }
  };

  const handleBanMember = async (memberId: string, memberName: string) => {
    try {
      const { data: member, error: fetchError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', memberId)
        .single();

      if (fetchError) throw fetchError;

      const { error: banError } = await supabase.from('banned_users').insert({
        user_id: memberId,
        email: member.email,
        full_name: member.full_name,
        banned_by: user?.id,
        reason: 'Banned by e-board',
      });

      if (banError) throw banError;

      const { error: deleteError } = await supabase.from('profiles').delete().eq('id', memberId);

      if (deleteError) throw deleteError;

      toast({
        title: 'Member Banned',
        description: `${memberName} has been banned for one year`,
        variant: 'destructive',
      });
      fetchMembers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to ban member',
        variant: 'destructive',
      });
    }
  };

  const handleViewProfile = (member: MemberWithRole) => {
    setSelectedMember(member);
    setIsProfileModalOpen(true);
  };

  const canManageRoles = userRole === 'e-board';

  // Group members by team
  const groupedMembers = members.reduce((acc, member) => {
    let teamName = member.role === 'e-board' ? 'E-board' : member.team || 'General Members';

    let teamGroup = acc.find(g => g.team === teamName);

    if (!teamGroup) {
      teamGroup = { team: teamName, members: [], priority: 0 };
      if (teamName === 'E-board') teamGroup.priority = 1;
      else if (member.team) teamGroup.priority = 2;
      else teamGroup.priority = 3;

      acc.push(teamGroup);
    }

    teamGroup.members.push(member);
    return acc;
  }, [] as Array<{ team: string; members: MemberWithRole[]; priority: number }>);

  groupedMembers.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.team.localeCompare(b.team);
  });

  groupedMembers.forEach(group => {
    group.members.sort((a, b) => {
      if (group.team === 'E-board') {
        return (a.full_name || a.email).localeCompare(b.full_name || b.email);
      }

      const aIsLead =
        a.position?.toLowerCase().includes('director') || a.position?.toLowerCase().includes('lead');
      const bIsLead =
        b.position?.toLowerCase().includes('director') || b.position?.toLowerCase().includes('lead');

      if (aIsLead && !bIsLead) return -1;
      if (!aIsLead && bIsLead) return 1;
      return (a.full_name || a.email).localeCompare(b.full_name || b.email);
    });
  });

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

      {groupedMembers.map(group => (
        <div key={group.team} className="mb-6">
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,400px))] mt-6">
            {group.members.map(member => (
              <PersonCard
                key={member.id}
                person={member}
                onViewProfile={handleViewProfile}
                onRoleChange={handleRoleChange}
                onKick={handleKickMember}
                onBan={handleBanMember}
                canManage={canManageRoles}
                isMobile={isMobile}
                currentUserId={user?.id}
                type="member"
              />
            ))}
          </div>
          {group !== groupedMembers[groupedMembers.length - 1] && (
            <div className="w-full flex items-center my-8">
              <div
                className="flex-1 border-t-2 rounded-md border-primary"
                style={{ borderRadius: '9999px', borderTopLeftRadius: '9999px', borderTopRightRadius: '9999px' }}
              />
            </div>
          )}
        </div>
      ))}

      {members.length === 0 && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No members found.</p>
          </CardContent>
        </Card>
      )}

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