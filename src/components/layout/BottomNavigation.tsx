import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Home,
  Calendar,
  Users,
  DollarSign,
  MoreHorizontal,
  Scissors,
  UserCog,
  BarChart3,
  MessageSquare,
  Settings,
  X,
  Clock,
  StarIcon,
  Wallet,
  ListChecks,
  MessageCircle,
  Bot,
  Building2,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { Button } from "@/components/ui/button";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tourId?: string;
}

// Main bottom navigation items (always visible)
const mainNavItems: NavItem[] = [
  { name: "Início", href: "/dashboard", icon: Home, tourId: "dashboard" },
  { name: "Agenda", href: "/appointments", icon: Calendar, tourId: "appointments" },
  { name: "Clientes", href: "/clients", icon: Users, tourId: "clients" },
  { name: "Financeiro", href: "/finance", icon: DollarSign, tourId: "finance" },
];

// Extended menu items
const extendedNavItems: NavItem[] = [
  { name: "Serviços", href: "/services", icon: Scissors, tourId: "services" },
  { name: "Equipe", href: "/staff", icon: UserCog, tourId: "staff" },
  { name: "Relatórios", href: "/reports", icon: BarChart3, tourId: "reports" },
  { name: "Marketing", href: "/marketing", icon: MessageSquare },
  { name: "Avaliações", href: "/reviews", icon: StarIcon },
  { name: "Lista de Espera", href: "/waitlist", icon: ListChecks },
  { name: "WhatsApp", href: "/whatsapp", icon: MessageSquare, tourId: "whatsapp" },
  { name: "Chat WhatsApp", href: "/whatsapp-chat", icon: MessageCircle },
  { name: "Chatbot IA", href: "/chatbot", icon: Bot },
  { name: "Horários", href: "/business-hours", icon: Clock, tourId: "hours" },
  { name: "Meus Ganhos", href: "/meus-ganhos", icon: Wallet },
  { name: "Minhas Unidades", href: "/barbershops", icon: Building2 },
  { name: "Multi-Unidade", href: "/multi-unit", icon: Building2 },
  { name: "Auditoria", href: "/audit", icon: Shield },
  { name: "Upgrade", href: "/upgrade", icon: Sparkles },
  { name: "Configurações", href: "/settings", icon: Settings, tourId: "settings" },
  { name: "Admin SaaS", href: "/saas-admin", icon: Shield },
];

const BottomNavigation = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const { userRole, barbershops } = useAuth();
  const { hasFeature } = useFeatureFlags();
  const { hasPermission } = useRolePermissions();

  // Filter extended items based on permissions
  const filteredExtendedItems = extendedNavItems.filter(item => {
    // Super admin has access to everything
    if (userRole === 'super_admin') return true;
    
    // Admin SaaS only for super admin
    if (item.href === '/saas-admin') return false;
    
    // Multi-unit pages only if multiple barbershops
    if (item.href === '/multi-unit' || item.href === '/multi-unit-reports') {
      return barbershops.length > 1;
    }
    
    // Admin only pages
    if (item.href === '/barbershops' || item.href === '/upgrade') {
      return userRole === 'admin';
    }
    
    return true;
  });

  const isActiveInMore = filteredExtendedItems.some(
    item => location.pathname === item.href
  );

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              data-tour={item.tourId}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-xl transition-all",
                    isActive && "bg-primary/10"
                  )}>
                    <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  </div>
                  <span className="text-[10px] font-medium mt-0.5">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
          
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors",
              isActiveInMore || moreOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl transition-all",
              (isActiveInMore || moreOpen) && "bg-primary/10"
            )}>
              <MoreHorizontal className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium mt-0.5">Mais</span>
          </button>
        </div>
      </nav>

      {/* Extended Menu Sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl p-0">
          <SheetTitle className="sr-only">Menu Completo</SheetTitle>
          
          {/* Handle bar */}
          <div className="flex justify-center py-3">
            <div className="w-12 h-1.5 rounded-full bg-muted" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4 border-b border-border">
            <h2 className="text-lg font-semibold">Menu Completo</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMoreOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Grid of menu items */}
          <div className="p-4 overflow-y-auto max-h-[calc(70vh-80px)]">
            <div className="grid grid-cols-4 gap-3">
              {filteredExtendedItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent/50 text-foreground hover:bg-accent"
                    )
                  }
                >
                  <item.icon className="h-6 w-6 mb-2" />
                  <span className="text-[11px] font-medium text-center leading-tight">
                    {item.name}
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-16 lg:hidden" />
    </>
  );
};

export default BottomNavigation;
