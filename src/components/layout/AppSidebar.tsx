import { useLocation, useNavigate } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  Users,
  Send,
  FileText,
  Settings,
  LogOut,
  PenLine,
  Building2,
  ChevronDown,
  Megaphone,
  UserCog,
  Package,
  Handshake,
} from 'lucide-react';
import authorServicesLogo from '@/assets/author-services-logo.png';

const homeItem = { title: 'Home', url: '/', icon: LayoutDashboard };

const marketingItems = [
  { title: 'Campaigns', url: '/campaigns', icon: Send },
  { title: 'Templates', url: '/templates', icon: FileText },
];

const crmItems = [
  { title: 'Contacts', url: '/contacts', icon: Users },
  { title: 'Deals', url: '/deals', icon: Handshake },
];

const backofficeItems = [
  { title: 'Users', url: '/users', icon: Users },
  { title: 'Master SKU List', url: '/products', icon: Package },
  { title: 'Imprints', url: '/imprints', icon: Building2 },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const collapsed = state === 'collapsed';

  // Fetch user profile and role
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role || 'member';
    },
    enabled: !!user?.id,
  });

  const getInitials = () => {
    if (userProfile?.full_name) {
      const names = userProfile.full_name.split(' ');
      return names.map(n => n.charAt(0).toUpperCase()).slice(0, 2).join('');
    }
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    if (userProfile?.full_name) return userProfile.full_name;
    return user?.email?.split('@')[0] || 'User';
  };

  const getRoleLabel = (role: string | null | undefined) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'asc': return 'Author Success Coach';
      case 'ae': return 'Account Executive';
      case 'marketing': return 'Marketing';
      default: return 'Member';
    }
  };

  // Marketing role only sees marketing section
  const isMarketingOnly = userRole === 'marketing';
  const showCRM = !isMarketingOnly;
  const showBackoffice = !isMarketingOnly;

  const isGroupActive = (items: typeof marketingItems) => 
    items.some(item => location.pathname === item.url);

  const renderNavItem = (item: typeof homeItem) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild
        isActive={location.pathname === item.url}
        tooltip={item.title}
        className="h-10"
      >
        <NavLink
          to={item.url}
          end={item.url === '/'}
          className="flex items-center gap-3 px-3 rounded-lg transition-colors"
          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        >
          <item.icon className="h-5 w-5" />
          <span className="text-sm">{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderCollapsibleGroup = (
    label: string,
    icon: React.ElementType,
    items: typeof marketingItems
  ) => {
    const Icon = icon;
    const isActive = isGroupActive(items);

    return (
      <Collapsible defaultOpen={isActive} className="group/collapsible">
        <SidebarGroup className="p-0">
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="h-10 px-3 cursor-pointer hover:bg-sidebar-accent/50 rounded-lg transition-colors flex items-center justify-between text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                {!collapsed && <span className="text-sm font-medium">{label}</span>}
              </div>
              {!collapsed && (
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
              )}
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent className={collapsed ? '' : 'pl-4'}>
              <SidebarMenu className="space-y-1">
                {items.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3">
        <div className="flex items-center justify-center py-2">
          <img 
            src={authorServicesLogo}
            alt="Author Services" 
            className={collapsed ? "h-8 object-contain" : "h-9 object-contain"}
          />
        </div>
        
        <Button 
          onClick={() => navigate('/campaigns')}
          className={`w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground ${
            collapsed ? 'px-2' : ''
          }`}
          size={collapsed ? "icon" : "default"}
        >
          <PenLine className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Create</span>}
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Home - standalone */}
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {renderNavItem(homeItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Marketing Group */}
        {renderCollapsibleGroup('Marketing', Megaphone, marketingItems)}

        {/* CRM Group - hidden for marketing role */}
        {showCRM && renderCollapsibleGroup('CRM', UserCog, crmItems)}

        {/* Backoffice Group - hidden for marketing role */}
        {showBackoffice && renderCollapsibleGroup('Backoffice', Settings, backofficeItems)}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 flex-1 hover:bg-sidebar-accent/50 rounded-lg p-1 -m-1 transition-colors"
          >
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-1 flex-col overflow-hidden text-left">
                <span className="truncate text-sm font-medium text-sidebar-foreground">
                  {getDisplayName()}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {getRoleLabel(userRole)}
                </span>
              </div>
            )}
          </button>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
