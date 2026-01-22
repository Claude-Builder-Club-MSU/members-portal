import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { PersonCard } from '@/components/PersonCard';
import ProfileViewer from '@/components/modals/ProfileViewer';
import type { Database } from '@/integrations/supabase/database.types';
import { useProfile } from '@/contexts/ProfileContext';
import { useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface MemberWithRole extends Profile {
  role: AppRole;
}

const Members = () => {
  const { toast } = useToast();
  const { role: userRole } = useProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<MemberWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberWithRole | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
      .filter(member => member.role !== 'prospect' && !member.is_banned);

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

      // Invalidate ProfileContext queries since role changes affect what data users can see
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
      queryClient.invalidateQueries({ queryKey: ['user-projects'] });
      queryClient.invalidateQueries({ queryKey: ['user-classes'] });
      queryClient.invalidateQueries({ queryKey: ['user-applications'] });
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
      const { data, error } = await supabase.rpc('ban_user_by_id', {
        target_user_id: memberId,
      });

      if (error) throw error;

      const success = typeof data === 'object' && data !== null && 'success' in data ? (data).success : data;
      const banError = typeof data === 'object' && data !== null && 'error' in data ? (data).error : undefined;

      if (!success) {
        throw new Error(typeof banError === 'string' ? banError : 'Failed to ban member');
      }

      toast({
        title: 'Member Banned',
        description: `${memberName} has been permanently banned`,
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

  // Only e-board can change roles; board and e-board can kick/ban
  const canManageRoles = userRole === 'e-board';
  const canManageActions = userRole === 'board' || userRole === 'e-board';

  // Sort and filter members
  const processedMembers = useMemo(() => {
    let filteredMembers = members;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredMembers = members.filter(member =>
        member.full_name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.position?.toLowerCase().includes(query) ||
        member.role?.toLowerCase().includes(query)
      );
    }

    // Sort members by role, then by name/email
    const rolePriority = (role: string | null) => {
      if (role === 'e-board') return 1;
      if (role === 'board') return 2;
      if (role === 'member') return 3;
      return 4;
    };

    return [...filteredMembers].sort((a, b) => {
      const roleDiff = rolePriority(a.role) - rolePriority(b.role);
      if (roleDiff !== 0) return roleDiff;

      // Otherwise alphabetical
      return (a.full_name || a.email).localeCompare(b.full_name || b.email);
    });
  }, [members, searchQuery]);

  if (loading) {
    return (
      <div className="p-6 w-full h-full overflow-y-auto">
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
    <div className="p-6 w-full h-full overflow-y-auto">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1">
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Members</h1>
          <p className="text-muted-foreground">
            {isMobile
              ? `${members.length} ${members.length === 1 ? 'member' : 'members'}`
              : `${members.length} club ${members.length === 1 ? 'member' : 'members'}`}
          </p>
        </div>
        <div className={`relative ${isMobile ? "w-40" : "w-64"}`}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={isMobile ? "Search" : "Search members..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,400px))] mt-6">
        {processedMembers.map(member => (
          <PersonCard
            key={member.id}
            person={member}
            onViewProfile={handleViewProfile}
            onRoleChange={canManageRoles ? handleRoleChange : undefined}
            onKick={canManageActions ? handleKickMember : undefined}
            onBan={canManageActions ? handleBanMember : undefined}
            canManage={canManageActions}
            canChangeRoles={canManageRoles}
            isMobile={isMobile}
            currentUserId={user?.id}
            currentUserRole={userRole}
            type="member"
          />
        ))}
      </div>

      {members.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No members found.</p>
          </CardContent>
        </Card>
      ) : processedMembers.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No members match your search criteria.
            </p>
          </CardContent>
        </Card>
      ) : null}

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