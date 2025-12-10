import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Calendar,
  Users,
  Scissors,
  UserCog,
  DollarSign,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
  Shield,
  Clock,
  StarIcon,
  ListChecks,
  Wallet,
  Building2,
  Bot,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { PlanFeatures } from "@/components/saas/PlanFeaturesSelector";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  multiUnitOnly?: boolean;
  superAdminOnly?: boolean;
  requiredFeature?: keyof PlanFeatures;
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Minhas Unidades", href: "/barbershops", icon: Building2 },
  { name: "Multi-Unidade", href: "/multi-unit", icon: Building2, multiUnitOnly: true, requiredFeature: 'multi_unit' },
  { name: "Relatórios Multi-Unidade", href: "/multi-unit-reports", icon: BarChart3, multiUnitOnly: true, requiredFeature: 'multi_unit' },
  { name: "Agendamentos", href: "/appointments", icon: Calendar },
  { name: "Lista de Espera", href: "/waitlist", icon: ListChecks },
  { name: "Clientes", href: "/clients", icon: Users },
  { name: "Serviços", href: "/services", icon: Scissors },
  { name: "Equipe", href: "/staff", icon: UserCog },
  { name: "Financeiro", href: "/finance", icon: DollarSign },
  { name: "Meus Ganhos", href: "/meus-ganhos", icon: Wallet },
  { name: "Relatórios", href: "/reports", icon: BarChart3 },
  { name: "Marketing", href: "/marketing", icon: MessageSquare, requiredFeature: 'marketing_campaigns' },
  { name: "Avaliações", href: "/reviews", icon: StarIcon },
  { name: "WhatsApp", href: "/whatsapp", icon: MessageSquare, requiredFeature: 'whatsapp_notifications' },
  { name: "Chatbot IA", href: "/chatbot", icon: Bot, requiredFeature: 'whatsapp_chatbot' },
  { name: "Horários", href: "/business-hours", icon: Clock },
  { name: "Auditoria", href: "/audit", icon: Shield },
  { name: "Configurações", href: "/settings", icon: Settings },
  { name: "Admin SaaS", href: "/saas-admin", icon: Shield, superAdminOnly: true },
];

// Mobile Sidebar using Sheet
export const MobileSidebar = () => {
  const [open, setOpen] = useState(false);
  const { barbershops, userRole } = useAuth();
  const { branding } = useBranding();
  const { hasFeature } = useFeatureFlags();
  const location = useLocation();

  // Fechar sidebar ao mudar de rota
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const filteredNavigation = navigation.filter(item => {
    if (item.superAdminOnly) {
      return userRole === 'super_admin';
    }
    if (item.multiUnitOnly) {
      if (!(barbershops.length > 1 || userRole === 'super_admin')) return false;
    }
    // Check feature flag requirement
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
      return false;
    }
    return true;
  });

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
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-2">
              {branding?.logo_url ? (
                <img 
                  src={branding.logo_url} 
                  alt={branding.system_name || 'Logo'} 
                  className="w-8 h-8 rounded-lg object-contain"
                />
              ) : (
                <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">
                    {branding?.system_name?.substring(0, 2).toUpperCase() || 'BS'}
                  </span>
                </div>
              )}
              <span className="font-bold text-lg">{branding?.system_name || 'BarberSmart'}</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom Info */}
          <div className="p-4 border-t border-border">
            <div className="barbershop-card p-3">
              <div className="text-xs text-muted-foreground">Plano Atual</div>
              <div className="text-sm font-semibold text-brand">Premium</div>
              <div className="text-xs text-muted-foreground mt-1">
                Válido até 15/08/2025
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Desktop Sidebar
const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { barbershops, userRole } = useAuth();
  const { hasFeature } = useFeatureFlags();

  const filteredNavigation = navigation.filter(item => {
    if (item.superAdminOnly) {
      return userRole === 'super_admin';
    }
    if (item.multiUnitOnly) {
      if (!(barbershops.length > 1 || userRole === 'super_admin')) return false;
    }
    // Check feature flag requirement
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
      return false;
    }
    return true;
  });

  return (
    <div className={cn(
      "h-screen bg-card border-r border-border transition-all duration-300 flex-col hidden lg:flex",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Toggle Button */}
      <div className="flex justify-end p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-2 overflow-y-auto">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
                collapsed && "justify-center px-2"
              )
            }
          >
            <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Info */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="barbershop-card p-3">
            <div className="text-xs text-muted-foreground">Plano Atual</div>
            <div className="text-sm font-semibold text-brand">Premium</div>
            <div className="text-xs text-muted-foreground mt-1">
              Válido até 15/08/2025
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
