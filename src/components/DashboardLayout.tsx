import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NavLink } from '@/components/ui/navigation-link';
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
  UserPlus,
  ChevronUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, profile, role, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const getMenuItems = () => {
    // Define each menu item up front for consistent order
    const dashboard = { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard };
    const events = { title: 'Events', url: '/dashboard/events', icon: Calendar };
    const classes = { title: 'Classes', url: '/dashboard/classes', icon: BookOpen };
    const projects = { title: 'Projects', url: '/dashboard/projects', icon: FolderKanban };
    const applications = { title: 'Applications', url: '/dashboard/applications', icon: FileText };
    const members = { title: 'Members', url: '/dashboard/members', icon: Users };
    const prospects = { title: 'Prospects', url: '/dashboard/prospects', icon: UserPlus };

    // if (role === 'prospect') {
    //   // Prospects get only Events and Applications
    //   return [events, applications];
    // }

    // Members get: Dashboard, Events, Classes, Projects, Applications
    const memberItems = [dashboard, events, classes, projects, applications, members];

    // E-board and Board additionally see Members and Prospects (after Applications)
    if (role === 'e-board' || role === 'board') {
      memberItems.push(prospects);
    }

    return memberItems;
  };

  const getRoleBadgeVariant = (roleValue: string): "default" | "secondary" | "outline" | "destructive" => {
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
        <SidebarContentComponent
          user={user}
          profile={profile}
          role={role}
          signOut={signOut}
          navigate={navigate}
          isMobile={isMobile}
          getMenuItems={getMenuItems}
          getRoleBadgeVariant={getRoleBadgeVariant}
          getInitials={getInitials}
        />

        <div className="flex-1 flex flex-col">
          <header className="h-[5vh] border-b border-border flex items-center px-4 bg-background">
            <SidebarTrigger />
          </header>

          <main className="flex-1 overflow-auto bg-muted/10">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

interface SidebarContentComponentProps {
  user: any;
  profile: any;
  role: string | null;
  signOut: () => void;
  navigate: (path: string) => void;
  isMobile: boolean;
  getMenuItems: () => any[];
  getRoleBadgeVariant: (role: string) => string;
  getInitials: (name: string) => string;
}

const SidebarContentComponent = ({
  user,
  profile,
  role,
  signOut,
  navigate,
  isMobile,
  getMenuItems,
  getRoleBadgeVariant,
  getInitials,
}: SidebarContentComponentProps) => {
  const { setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar>
      <SidebarContent>
        {/* Header */}
        <div className="p-3 border-b border-sidebar-border flex flex-col gap-3 justify-center min-h-[95px]">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 w-full text-left hover:bg-sidebar-primary/50 rounded-md p-0 pl-7 -m-5 transition-colors cursor-pointer"
          >
            <div className="relative w-12 h-12 flex-shrink-0">
              <img
                src="/msu-logo.png"
                alt="MSU Logo"
                className="w-full h-full object-contain bg-transparent"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-[0.95rem] text-sidebar-foreground tracking-tight leading-tight">
                Claude Builder Club
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">MSU Chapter</p>
            </div>
          </button>
        </div>

        {/* Navigation */}
        <SidebarGroup className="flex-1 flex flex-col justify-center">
          <SidebarGroupContent>
            <SidebarMenu className="px-3 space-y-1 gap-4">
              {getMenuItems().map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="flex items-center gap-4 px-4 py-6 rounded-lg transition-colors text-base"
                      activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                      onClick={handleNavClick}
                    >
                      <item.icon className="h-4 w-6" />
                      <span className="text-lg">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Profile Card at Bottom */}
        <div className="p-3 border-t border-sidebar-border min-h-[95px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sidebar-primary transition-colors">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                  <AvatarImage src={profile?.profile_picture_url || undefined} />
                  <AvatarFallback className="text-sm">
                    {profile?.full_name
                      ? getInitials(profile.full_name)
                      : user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-m font-medium truncate text-sidebar-foreground">
                    {profile?.full_name || 'No name'}
                  </p>
                  <div className="flex items-center gap-4 mt-0.5">
                    {role && (
                      role === 'e-board' ? (
                        <Badge
                          className="text-xs capitalize px-2 py-0 shrink-0 whitespace-nowrap sparkle gold-shimmer text-yellow-900 font-semibold border-2 border-yellow-400/50 relative"
                        >
                          <span className="sparkle-particle"></span>
                          <span className="sparkle-particle"></span>
                          <span className="sparkle-particle"></span>
                          <span className="relative z-10">{role.replace('-', ' ')}</span>
                        </Badge>
                      ) : role === 'board' ? (
                        <Badge
                          className="text-xs capitalize px-2 py-0 shrink-0 whitespace-nowrap bg-primary text-cream font-semibold border-2 border-primary/50"
                        >
                          {role.replace('-', ' ')}
                        </Badge>
                      ) : (
                        <Badge
                          variant={getRoleBadgeVariant(role || '') as "default" | "secondary" | "outline" | "destructive"}
                          className="text-xs capitalize px-2 py-0"
                        >
                          {role.replace('-', ' ')}
                        </Badge>
                      )
                    )}
                    {profile && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Trophy className="h-3 w-3" />
                        <span className="font-medium">{profile.points}</span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className={isMobile ? "w-[250px]" : "w-56"}
              side="top"
              sideOffset={8}
            >
              <DropdownMenuItem onClick={() => {
                navigate('/dashboard/profile');
                handleNavClick();
              }}>
                <Settings className="h-4 w-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default DashboardLayout;