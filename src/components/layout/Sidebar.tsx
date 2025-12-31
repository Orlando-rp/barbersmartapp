import { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Calendar,
  Users,
  Scissors,
  UserCog,
  DollarSign,
  BarChart3,
  MessageSquare,
  MessageCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  Shield,
  Clock,
  StarIcon,
  ListChecks,
  Wallet,
  Building2,
  Bot,
  Menu,
  Sparkles,
  Loader2,
  Briefcase,
  Megaphone,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useSubscription } from "@/hooks/useSubscription";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { PlanFeatures } from "@/components/saas/PlanFeaturesSelector";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "next-themes";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import logoIcon from "@/assets/logo-barbersmart.png";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  multiUnitOnly?: boolean;
  superAdminOnly?: boolean;
  adminOnly?: boolean;
  requiredFeature?: keyof PlanFeatures;
  permission?: string;
  group: "operacoes" | "gestao" | "marketing" | "config" | "admin";
  tourId?: string;
}

interface NavGroup {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const navigation: NavItem[] = [
  // Operações
  { name: "Dashboard", href: "/", icon: Home, permission: 'dashboard', group: "operacoes", tourId: "dashboard" },
  { name: "Agendamentos", href: "/appointments", icon: Calendar, requiredFeature: 'appointments', permission: 'appointments', group: "operacoes", tourId: "appointments" },
  { name: "Lista de Espera", href: "/waitlist", icon: ListChecks, requiredFeature: 'waitlist', permission: 'waitlist', group: "operacoes" },
  { name: "Clientes", href: "/clients", icon: Users, requiredFeature: 'clients', permission: 'clients', group: "operacoes", tourId: "clients" },
  { name: "Horários", href: "/business-hours", icon: Clock, requiredFeature: 'business_hours', permission: 'business_hours', group: "operacoes", tourId: "hours" },
  
  // Gestão
  { name: "Serviços", href: "/services", icon: Scissors, requiredFeature: 'services', permission: 'services', group: "gestao", tourId: "services" },
  { name: "Equipe", href: "/staff", icon: UserCog, requiredFeature: 'staff_basic', permission: 'staff', group: "gestao", tourId: "staff" },
  { name: "Financeiro", href: "/finance", icon: DollarSign, requiredFeature: 'finance_basic', permission: 'finance', group: "gestao", tourId: "finance" },
  { name: "Meus Ganhos", href: "/meus-ganhos", icon: Wallet, requiredFeature: 'staff_earnings', permission: 'meus_ganhos', group: "gestao" },
  { name: "Relatórios", href: "/reports", icon: BarChart3, requiredFeature: 'basic_reports', permission: 'reports', group: "gestao", tourId: "reports" },
  { name: "Minhas Unidades", href: "/barbershops", icon: Building2, adminOnly: true, group: "gestao" },
  { name: "Multi-Unidade", href: "/multi-unit", icon: Building2, multiUnitOnly: true, adminOnly: true, requiredFeature: 'multi_unit', group: "gestao" },
  { name: "Relatórios Multi-Unidade", href: "/multi-unit-reports", icon: BarChart3, multiUnitOnly: true, adminOnly: true, requiredFeature: 'multi_unit_reports', group: "gestao" },
  
  // Marketing
  { name: "Marketing", href: "/marketing", icon: MessageSquare, requiredFeature: 'marketing_campaigns', permission: 'marketing', group: "marketing" },
  { name: "Avaliações", href: "/reviews", icon: StarIcon, requiredFeature: 'reviews', permission: 'reviews', group: "marketing" },
  { name: "WhatsApp", href: "/whatsapp", icon: MessageSquare, requiredFeature: 'whatsapp_notifications', permission: 'whatsapp', group: "marketing", tourId: "whatsapp" },
  { name: "Chat WhatsApp", href: "/whatsapp-chat", icon: MessageCircle, requiredFeature: 'whatsapp_chat', permission: 'whatsapp_chat', group: "marketing" },
  { name: "Chatbot IA", href: "/chatbot", icon: Bot, requiredFeature: 'whatsapp_chatbot', permission: 'chatbot', group: "marketing" },
  
  // Config
  { name: "Configurações", href: "/settings", icon: Settings, permission: 'settings', group: "config", tourId: "settings" },
  { name: "Auditoria", href: "/audit", icon: Shield, requiredFeature: 'audit_logs', permission: 'audit', group: "config" },
  { name: "Minha Assinatura", href: "/subscription/manage", icon: Wallet, adminOnly: true, group: "config" },
  { name: "Upgrade", href: "/upgrade", icon: Sparkles, adminOnly: true, group: "config" },
  
  // Admin
  { name: "Admin SaaS", href: "/saas-admin", icon: Shield, superAdminOnly: true, group: "admin" },
];

const navGroups: Omit<NavGroup, "items">[] = [
  { id: "operacoes", name: "Operações", icon: Briefcase },
  { id: "gestao", name: "Gestão", icon: BarChart3 },
  { id: "marketing", name: "Marketing", icon: Megaphone },
  { id: "config", name: "Configurações", icon: Wrench },
  { id: "admin", name: "Administração", icon: Shield },
];

// Hook para buscar contagem da lista de espera
const useWaitlistCount = () => {
  const { activeBarbershopIds } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (activeBarbershopIds.length === 0) return;

    const fetchCount = async () => {
      const { count: waitingCount } = await supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true })
        .in("barbershop_id", activeBarbershopIds)
        .eq("status", "waiting");
      
      setCount(waitingCount || 0);
    };

    fetchCount();

    // Real-time subscription
    const channel = supabase
      .channel("waitlist-sidebar-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waitlist" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBarbershopIds]);

  return count;
};

// Mobile Sidebar using Sheet
export const MobileSidebar = () => {
  const [open, setOpen] = useState(false);
  const { barbershops, userRole } = useAuth();
  const { effectiveBranding, currentLogoUrl } = useBranding();
  const { hasFeature } = useFeatureFlags();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { hasPermission } = useRolePermissions();
  const location = useLocation();
  const { theme } = useTheme();
  const waitlistCount = useWaitlistCount();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const filterNavItem = (item: NavItem) => {
    if (userRole === 'super_admin') return true;
    if (item.superAdminOnly) return false;
    if (item.adminOnly && userRole !== 'admin') return false;
    if (item.multiUnitOnly && barbershops.length <= 1) return false;
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) return false;
    if (item.permission && userRole !== 'admin' && !hasPermission(item.permission)) return false;
    return true;
  };

  const filteredNavigation = navigation.filter(filterNavItem);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
        <div className="flex flex-col h-full bg-card">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <img 
              src={currentLogoUrl || (theme === 'dark' ? logoDark : logoLight)} 
              alt={effectiveBranding?.system_name || 'Barber Smart'} 
              className="h-8 w-auto object-contain"
            />
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between px-3 py-3 text-sm font-medium rounded-lg transition-colors",
                    isActive ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )
                }
              >
                <div className="flex items-center">
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.name}</span>
                </div>
                {item.href === "/waitlist" && waitlistCount > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                    {waitlistCount > 99 ? "99+" : waitlistCount}
                  </Badge>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-border">
            <SubscriptionInfo subscription={subscription} loading={subscriptionLoading} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Subscription Info Component
const SubscriptionInfo = ({ subscription, loading }: { subscription: any; loading: boolean }) => {
  if (loading) {
    return (
      <div className="barbershop-card p-3">
        <div className="flex items-center justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="barbershop-card p-3">
        <div className="text-xs text-muted-foreground">Plano Atual</div>
        <div className="text-sm font-semibold text-muted-foreground">Não configurado</div>
      </div>
    );
  }

  return (
    <div className="barbershop-card p-3">
      <div className="text-xs text-muted-foreground">Plano Atual</div>
      <div className="text-sm font-semibold text-brand">{subscription.planName}</div>
      {subscription.isTrialing && subscription.trialEndsAt && (
        <div className="text-xs text-warning mt-1">
          Trial até {format(subscription.trialEndsAt, "dd/MM/yyyy", { locale: ptBR })}
        </div>
      )}
      {!subscription.isTrialing && subscription.validUntil && (
        <div className="text-xs text-muted-foreground mt-1">
          Válido até {format(subscription.validUntil, "dd/MM/yyyy", { locale: ptBR })}
        </div>
      )}
      {subscription.status === 'none' && (
        <div className="text-xs text-muted-foreground mt-1">Sem assinatura ativa</div>
      )}
    </div>
  );
};

// Desktop Sidebar
const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('sidebar-groups');
    return saved ? JSON.parse(saved) : { operacoes: true, gestao: true, marketing: true, config: true, admin: true };
  });
  
  const { barbershops, userRole } = useAuth();
  const { effectiveBranding, currentLogoUrl } = useBranding();
  const { hasFeature } = useFeatureFlags();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { hasPermission } = useRolePermissions();
  const location = useLocation();
  const waitlistCount = useWaitlistCount();
  const { theme } = useTheme();

  const filterNavItem = (item: NavItem) => {
    if (userRole === 'super_admin') return true;
    if (item.superAdminOnly) return false;
    if (item.adminOnly && userRole !== 'admin') return false;
    if (item.multiUnitOnly && barbershops.length <= 1) return false;
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) return false;
    if (item.permission && userRole !== 'admin' && !hasPermission(item.permission)) return false;
    return true;
  };

  // Group navigation items
  const groupedNavigation = useMemo(() => {
    return navGroups.map(group => ({
      ...group,
      items: navigation.filter(item => item.group === group.id && filterNavItem(item))
    })).filter(group => group.items.length > 0);
  }, [userRole, barbershops.length, hasFeature, hasPermission]);

  // Check if current route is in a group to auto-expand it
  useEffect(() => {
    const currentGroup = navigation.find(item => item.href === location.pathname)?.group;
    if (currentGroup && !openGroups[currentGroup]) {
      setOpenGroups(prev => ({ ...prev, [currentGroup]: true }));
    }
  }, [location.pathname]);

  // Persist open groups state
  useEffect(() => {
    localStorage.setItem('sidebar-groups', JSON.stringify(openGroups));
  }, [openGroups]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className={cn(
      "h-screen bg-card border-r border-border transition-all duration-300 flex-col hidden lg:flex sticky top-0",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo + Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed ? (
          <img 
            src={currentLogoUrl || (theme === 'dark' ? logoDark : logoLight)} 
            alt={effectiveBranding?.system_name || 'Barber Smart'} 
            className="h-8 w-auto max-w-[180px] object-contain"
          />
        ) : (
          <div className="flex items-center justify-center w-full">
            <img 
              src={currentLogoUrl || logoIcon} 
              alt={effectiveBranding?.system_name || 'Barber Smart'} 
              className="w-8 h-8 rounded-lg object-contain"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("h-8 w-8 shrink-0", collapsed && "hidden")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2">
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Navigation with Groups */}
      <ScrollArea className="flex-1">
        <nav className={cn("py-2 space-y-1", collapsed ? "px-0" : "px-2")}>
          {groupedNavigation.map((group) => (
            <div key={group.id}>
              {collapsed ? (
                // Collapsed mode: show items directly with tooltips
                <div className="space-y-1 flex flex-col items-center">
                  {group.items.map((item) => (
                    <Tooltip key={item.name} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.href}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center justify-center px-2 py-2.5 rounded-lg transition-all duration-200 relative group",
                              isActive 
                                ? "bg-primary/10 text-sidebar-icon-active" 
                                : "text-sidebar-icon hover:text-sidebar-icon-hover hover:bg-accent/10"
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-sidebar-icon-active to-primary rounded-r-full shadow-[0_0_8px_hsl(38,75%,50%,0.5)]" />
                              )}
                              <item.icon className={cn(
                                "h-5 w-5 transition-colors",
                                isActive ? "text-sidebar-icon-active" : "text-sidebar-icon group-hover:text-sidebar-icon-hover"
                              )} />
                              {item.href === "/waitlist" && waitlistCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                                  {waitlistCount > 9 ? "9+" : waitlistCount}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        className="!z-[9999] bg-zinc-900 text-amber-100 border border-amber-500/40 shadow-[0_4px_20px_rgba(245,158,11,0.25)] backdrop-blur-sm px-3 py-2 font-medium"
                      >
                        <p className="flex items-center gap-1.5">
                          <span className="text-amber-400">{item.icon && <item.icon className="h-3.5 w-3.5" />}</span>
                          {item.name} {item.href === "/waitlist" && waitlistCount > 0 && <span className="text-amber-400 text-xs">({waitlistCount})</span>}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ) : (
                // Expanded mode: show collapsible groups
                <Collapsible open={openGroups[group.id]} onOpenChange={() => toggleGroup(group.id)}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-sidebar-icon uppercase tracking-wider hover:text-sidebar-icon-hover transition-colors rounded-lg hover:bg-accent/10">
                      <div className="flex items-center gap-2">
                        <group.icon className="h-4 w-4" />
                        <span>{group.name}</span>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", openGroups[group.id] && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        data-tour={item.tourId}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ml-2 group relative",
                            isActive 
                              ? "bg-primary/10 text-sidebar-icon-active" 
                              : "text-foreground/80 hover:text-foreground hover:bg-accent/10"
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-sidebar-icon-active to-primary rounded-r-full shadow-[0_0_8px_hsl(38,75%,50%,0.5)]" />
                            )}
                            <div className="flex items-center">
                              <item.icon className={cn(
                                "h-4 w-4 mr-3 transition-colors duration-200",
                                isActive ? "text-sidebar-icon-active" : "text-sidebar-icon group-hover:text-sidebar-icon-hover"
                              )} />
                              <span>{item.name}</span>
                            </div>
                            {item.href === "/waitlist" && waitlistCount > 0 && (
                              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                                {waitlistCount > 99 ? "99+" : waitlistCount}
                              </Badge>
                            )}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Bottom Info */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <SubscriptionInfo subscription={subscription} loading={subscriptionLoading} />
        </div>
      )}
    </div>
  );
};

export default Sidebar;
