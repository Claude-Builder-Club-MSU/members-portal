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

interface ProspectWithRole extends Profile {
  role: AppRole;
}

const Prospects = () => {
  const { toast } = useToast();
  const { role: userRole } = useProfile();
  const { user } = useAuth();
  const [prospects, setProspects] = useState<ProspectWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<ProspectWithRole | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError || !profilesData) {
      setLoading(false);
      return;
    }

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const roleMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

    let prospectsWithRoles: ProspectWithRole[] = profilesData
      .map(profile => ({
        ...profile,
        role: roleMap.get(profile.id) || 'prospect',
      }))
      .filter(member => member.role === 'prospect');

    // Group by term_joined, then sort within groups by oldest creation_date
    const groupsMap: Record<string, ProspectWithRole[]> = {};
    for (const prospect of prospectsWithRoles) {
      const term = prospect.term_joined ?? 'Unknown Term';
      if (!groupsMap[term]) groupsMap[term] = [];
      groupsMap[term].push(prospect);
    }

    const sortedTermGroups = Object.keys(groupsMap).sort();
    const sortedProspects: ProspectWithRole[] = [];

    for (const term of sortedTermGroups) {
      const group = groupsMap[term].slice().sort((a, b) => {
        return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      });
      sortedProspects.push(...group);
    }

    setProspects(sortedProspects);
    setLoading(false);
  };

  const handleGraduate = async (prospectId: string, prospectName: string) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: 'member' })
      .eq('user_id', prospectId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `${prospectName} graduated to Member successfully`,
      });
      fetchProspects();
    }
  };

  const handleBanProspect = async (prospectId: string, prospectName: string) => {
    try {
      const { data: prospect, error: fetchError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', prospectId)
        .single();

      if (fetchError) throw fetchError;

      const { error: banError } = await supabase.from('banned_users').insert({
        user_id: prospectId,
        email: prospect.email,
        full_name: prospect.full_name,
        banned_by: user?.id,
        reason: 'Banned by e-board',
      });

      if (banError) throw banError;

      const { error: deleteError } = await supabase.from('profiles').delete().eq('id', prospectId);

      if (deleteError) throw deleteError;

      toast({
        title: 'Prospect Banned',
        description: `${prospectName} has been banned for one year`,
        variant: 'destructive',
      });
      fetchProspects();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to ban prospect',
        variant: 'destructive',
      });
    }
  };

  const handleViewProfile = (prospect: ProspectWithRole) => {
    setSelectedProspect(prospect);
    setIsProfileModalOpen(true);
  };

  const canManageProspects = userRole === 'board' || userRole === 'e-board';

  if (loading) {
    return (
      <div className="p-6">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Prospects</h1>
          <p className="text-muted-foreground">Manage prospective members</p>
        </div>
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading prospects...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>Prospects</h1>
        <p className="text-muted-foreground">
          {prospects.length} {prospects.length === 1 ? 'prospect' : 'prospects'}
        </p>
      </div>

      {prospects.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No prospects at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,400px))] mt-6">
          {prospects.map(prospect => (
            <PersonCard
              key={prospect.id}
              person={prospect}
              onViewProfile={handleViewProfile}
              onGraduate={handleGraduate}
              onBan={handleBanProspect}
              canManage={canManageProspects}
              isMobile={isMobile}
              type="prospect"
            />
          ))}
        </div>
      )}

      <ProfileViewer
        open={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedProspect(null);
        }}
        member={selectedProspect}
      />
    </div>
  );
};

export default Prospects;