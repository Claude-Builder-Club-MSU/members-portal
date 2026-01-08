import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  BookOpen,
  FolderKanban,
  Users,
  LogOut,
  Settings,
  Trophy,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, profile, role, signOut, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const getMenuItems = () => {
    const baseItems = [
      { title: 'Applications', url: '/dashboard/applications', icon: FileText },
      { title: 'Events', url: '/dashboard/events', icon: Calendar },
    ];

    if (role === 'prospect') {
      return baseItems;
    }

    const memberItems = [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
      { title: 'Classes', url: '/dashboard/classes', icon: BookOpen },
      { title: 'Projects', url: '/dashboard/projects', icon: FolderKanban },
      ...baseItems,
    ];

    if (role === 'e-board' || role === 'board') {
      memberItems.push({ title: 'Members', url: '/dashboard/members', icon: Users });
      memberItems.push({ title: 'Prospects', url: '/dashboard/prospects', icon: UserPlus }); // Add this
    }

    return memberItems;
  };

  const getRoleBadgeVariant = (roleValue: string) => {
    switch (roleValue) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarContent>
            <div className="p-4 border-b border-sidebar-border space-y-3">
              <h2 className="font-bold text-lg text-sidebar-foreground">Claude Builder Club</h2>

              {profile && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile.profile_picture_url || undefined} />
                    <AvatarFallback className="text-sm">
                      {profile.full_name
                        ? getInitials(profile.full_name)
                        : user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-sidebar-foreground">
                      {profile.full_name || 'No name'}
                    </p>
                    <div className="flex items-center gap-2">
                      {role && (
                        <Badge
                          variant={getRoleBadgeVariant(role)}
                          className="text-xs capitalize"
                        >
                          {role.replace('-', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {profile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  <span className="font-medium">{profile.points}</span>
                  <span>points</span>
                </div>
              )}
            </div>

            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {getMenuItems().map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === '/dashboard'}
                          className="flex items-center gap-2"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/dashboard/profile"
                        className="flex items-center gap-2"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={signOut}
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </Button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4 bg-background">
            <SidebarTrigger />
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;