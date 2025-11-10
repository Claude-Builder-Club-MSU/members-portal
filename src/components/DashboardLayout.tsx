import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>('prospect');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .order('role', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setUserRole(data.role);
    }
  };

  const getMenuItems = () => {
    const baseItems = [
      { title: 'Applications', url: '/dashboard/applications', icon: FileText },
      { title: 'Events', url: '/dashboard/events', icon: Calendar },
    ];

    if (userRole === 'prospect') {
      return baseItems;
    }

    const memberItems = [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
      { title: 'Classes', url: '/dashboard/classes', icon: BookOpen },
      { title: 'Projects', url: '/dashboard/projects', icon: FolderKanban },
      ...baseItems,
    ];

    if (userRole === 'e-board') {
      memberItems.push({ title: 'Members', url: '/dashboard/members', icon: Users });
    }

    return memberItems;
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
            <div className="p-4 border-b border-sidebar-border">
              <h2 className="font-bold text-lg text-sidebar-foreground">Claude Builder Club</h2>
              <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
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
