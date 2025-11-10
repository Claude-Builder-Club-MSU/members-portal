import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  class_year: string | null;
  profile_picture_url: string | null;
  role: string;
}

const Members = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!inner(role)
      `)
      .order('email', { ascending: true });

    if (!error && data) {
      const formattedMembers = data.map((member: any) => ({
        ...member,
        role: member.user_roles[0]?.role || 'prospect',
      }));
      setMembers(formattedMembers);
    }
    setLoading(false);
  };

  const getRoleBadgeVariant = (role: string) => {
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Members</h1>
        <p className="text-muted-foreground">Manage club members</p>
      </div>

      {loading ? (
        <p>Loading members...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={member.profile_picture_url || undefined} />
                    <AvatarFallback>
                      {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {member.full_name || 'No name'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {member.class_year && (
                  <p className="text-sm text-muted-foreground capitalize">{member.class_year}</p>
                )}
                <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                  {member.role.replace('-', ' ')}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Members;
