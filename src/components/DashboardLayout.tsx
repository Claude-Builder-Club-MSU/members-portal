import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
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
  ChevronUp,
  TabletSmartphone
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useState, useEffect } from 'react';
import { Database } from '@/integrations/supabase/database.types';
import { User } from '@supabase/supabase-js';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  title: string;
  url: string;
  icon;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, profile, signOut } = useAuth();
  const { role, isBoardOrAbove } = useProfile();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Responsive layout: Remove forced landscape lock, but warn on landscape on small screens
  const [showRotate, setShowRotate] = useState(false);

  useEffect(() => {
    // Only check for portrait on mobile screens
    if (typeof window !== "undefined") {
      const handler = () => {
        // Mobile landscape: screen is small (mobile) and orientation is landscape
        const isLandscape = window.matchMedia("(orientation: landscape)").matches;
        setShowRotate(isMobile && isLandscape);
      };
      window.addEventListener("orientationchange", handler);
      window.addEventListener("resize", handler);
      handler(); // initial
      return () => {
        window.removeEventListener("orientationchange", handler);
        window.removeEventListener("resize", handler);
      };
    }
  }, [isMobile]);

  if (showRotate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen min-w-screen bg-sidebar-primary text-sidebar-primary-foreground p-8 z-50">
        <TabletSmartphone size={60} className="mb-2 text-yellow-400" />
        <h2 className="text-xl font-bold mb-1">Rotate your device</h2>
        <p className="text-sm text-muted-foreground max-w-xs text-center">
          For best experience, please use portrait orientation.
        </p>
      </div>
    );
  }

  // Responsive main layout (works on mobile & desktop!)
  return (
    <SidebarProvider>
      <div className={`flex w-full min-h-screen`}>
        <AppSidebar
          user={user}
          profile={profile}
          role={role}
          isBoardOrAbove={isBoardOrAbove}
          signOut={signOut}
          navigate={navigate}
          isMobile={isMobile}
        />
        <div className="flex w-screen flex-col">
          <header className="h-[5vh] border-b border-border flex items-center justify-between px-4 bg-background">
            <SidebarTrigger />
            <ThemeToggle />
          </header>
          <main
            className={`flex w-full overflow-y-scroll overflow-auto bg-muted/10 ${isMobile ? "flex-1" : "h-[95vh]"
              }`}
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

// --- Navigation Configuration ---
const getMenuItems = (isBoardOrAbove: boolean): MenuItem[] => {
  const baseItems: MenuItem[] = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Events', url: '/dashboard/events', icon: Calendar },
    { title: 'Classes', url: '/dashboard/classes', icon: BookOpen },
    { title: 'Projects', url: '/dashboard/projects', icon: FolderKanban },
    { title: 'Applications', url: '/dashboard/applications', icon: FileText },
    { title: 'Members', url: '/dashboard/members', icon: Users },
  ];

  // Board and E-board get Prospects page
  if (isBoardOrAbove) {
    baseItems.push({ title: 'Prospects', url: '/dashboard/prospects', icon: UserPlus });
  }

  return baseItems;
};

const getRoleBadgeVariant = (role: AppRole) => {
  switch (role) {
    case 'e-board':
      return 'default';
    case 'board':
      return 'default';
    case 'member':
      return 'secondary';
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

// --- Sidebar Component ---
interface AppSidebarProps {
  user: User;
  profile: Profile;
  role: AppRole;
  isBoardOrAbove: boolean;
  signOut: () => void;
  navigate: (path: string) => void;
  isMobile: boolean;
}

const AppSidebar = ({
  user,
  profile,
  role,
  isBoardOrAbove,
  signOut,
  navigate,
  isMobile,
}: AppSidebarProps) => {
  const { setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const menuItems = getMenuItems(isBoardOrAbove);

  return (
    <Sidebar>
      <SidebarContent>
        {/* Header */}
        <div className="p-2 border-b border-sidebar-border flex flex-col gap-3 justify-center min-h-[95px]">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 w-full text-left hover:bg-sidebar-primary rounded-md ml-0 px-3 py-3 transition-colors cursor-pointer"
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
            <SidebarMenu className="px-0 space-y-1 gap-4">
              {menuItems.map((item) => (
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
                      <RoleBadge role={role} />
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
                navigate('/profile');
                handleNavClick();
              }}>
                <Settings className="h-4 w-4 mr-1" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

// --- Role Badge Component ---
const RoleBadge = ({ role }: { role: AppRole }) => {
  if (role === 'e-board') {
    return (
      <Badge className="text-xs capitalize px-2 py-0 shrink-0 whitespace-nowrap sparkle gold-shimmer text-yellow-900 font-semibold border-2 border-yellow-400/50 relative">
        <span className="sparkle-particle"></span>
        <span className="sparkle-particle"></span>
        <span className="sparkle-particle"></span>
        <span className="relative z-10">{role.replace('-', ' ')}</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant={getRoleBadgeVariant(role)}
      className="text-xs capitalize px-2 py-0"
    >
      {role.replace('-', ' ')}
    </Badge>
  );
};

export default DashboardLayout;