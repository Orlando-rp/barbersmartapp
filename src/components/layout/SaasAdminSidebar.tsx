import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Building2,
  Package,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  LogOut,
  Home,
  LayoutDashboard,
  Smartphone,
  Moon,
  Sun,
  Palette,
  BookOpen,
  Rocket,
  Stethoscope,
  Plug,
  Wrench,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useSidebarGroups } from "@/hooks/useSidebarGroups";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  name: string;
  tab: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const saasNavGroups: NavGroup[] = [
  {
    id: "principal",
    name: "Principal",
    icon: LayoutDashboard,
    items: [
      { name: "Visão Geral", tab: "overview", icon: LayoutDashboard },
    ],
  },
  {
    id: "clientes",
    name: "Clientes",
    icon: Users,
    items: [
      { name: "Barbearias", tab: "tenants", icon: Building2 },
      { name: "Planos", tab: "plans", icon: Package },
      { name: "Mensagens", tab: "messages", icon: MessageSquare },
    ],
  },
  {
    id: "aparencia",
    name: "Aparência",
    icon: Palette,
    items: [
      { name: "Branding", tab: "branding", icon: Palette },
    ],
  },
  {
    id: "integracoes",
    name: "Integrações",
    icon: Plug,
    items: [
      { name: "Integrações", tab: "integrations", icon: Smartphone },
    ],
  },
  {
    id: "sistema",
    name: "Sistema",
    icon: Wrench,
    items: [
      { name: "Diagnóstico", tab: "diagnostic", icon: Stethoscope },
      { name: "Deploy", tab: "deploy", icon: Rocket },
      { name: "Documentação", tab: "docs", icon: BookOpen },
    ],
  },
];

interface SaasAdminSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isMobile?: boolean;
}

const SaasAdminSidebar = ({ activeTab = "overview", onTabChange, isMobile = false }: SaasAdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { effectiveBranding, currentLogoUrl } = useBranding();
  const systemName = effectiveBranding?.system_name || "Admin SaaS";
  const logoIconUrl = effectiveBranding?.logo_icon_url;
  const faviconUrl = effectiveBranding?.favicon_url;

  const { openGroups, toggleGroup, openGroup } = useSidebarGroups(
    "saas-sidebar-groups",
    { principal: true, clientes: true, aparencia: true, integracoes: true, sistema: true }
  );

  // Find current group based on active tab
  const currentGroup = useMemo(() => {
    for (const group of saasNavGroups) {
      if (group.items.some(item => item.tab === activeTab)) {
        return group.id;
      }
    }
    return null;
  }, [activeTab]);

  // Auto-expand current group
  useMemo(() => {
    if (currentGroup) {
      openGroup(currentGroup);
    }
  }, [currentGroup, openGroup]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleBackToApp = () => {
    navigate('/dashboard');
  };

  const handleNavClick = (tab: string) => {
    onTabChange?.(tab);
  };

  // For mobile, always show expanded
  const isCollapsed = isMobile ? false : collapsed;

  return (
    <aside className={cn(
      "bg-card border-r border-border transition-all duration-300 flex flex-col shrink-0",
      isMobile ? "w-full h-full" : (isCollapsed ? "w-16" : "w-64"),
      !isMobile && "sticky top-0 h-screen hidden md:flex"
    )}>
      {/* Header */}
      <div className="relative px-4 py-5 border-b border-border min-h-[88px]">
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-center flex-1")}>
          {!isCollapsed && (
            <div className="flex items-center justify-center flex-1">
              {currentLogoUrl ? (
                <img 
                  src={currentLogoUrl} 
                  alt={systemName} 
                  className="h-20 w-auto max-w-[200px] object-contain mx-auto" 
                />
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Shield className="h-8 w-8 text-warning" />
                  <span className="text-xl font-bold text-foreground">Admin SaaS</span>
                </div>
              )}
            </div>
          )}
          {isCollapsed && !isMobile && (
            <div className="flex items-center justify-center w-full">
              {logoIconUrl ? (
                <img 
                  src={logoIconUrl} 
                  alt={systemName} 
                  className="h-14 w-14 rounded-lg object-contain" 
                />
              ) : faviconUrl ? (
                <img 
                  src={faviconUrl} 
                  alt={systemName} 
                  className="h-14 w-14 rounded-lg object-contain" 
                />
              ) : currentLogoUrl ? (
                <img 
                  src={currentLogoUrl} 
                  alt={systemName} 
                  className="h-14 w-14 rounded-lg object-contain" 
                />
              ) : (
                <Shield className="h-10 w-10 text-warning" />
              )}
            </div>
          )}
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation with Groups */}
      <ScrollArea className="flex-1">
        <nav className={cn("py-2 space-y-1", isCollapsed ? "px-0" : "px-2")}>
          {saasNavGroups.map((group) => (
            <div key={group.id}>
              {isCollapsed && !isMobile ? (
                // Collapsed mode: show items directly with tooltips
                <div className="space-y-1 flex flex-col items-center">
                  {group.items.map((item) => (
                    <Tooltip key={item.name} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleNavClick(item.tab)}
                          className={cn(
                            "flex items-center justify-center px-2 py-2.5 rounded-lg transition-all duration-200 relative group",
                            activeTab === item.tab
                              ? "bg-warning/20 text-warning"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          {activeTab === item.tab && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-warning to-warning/50 rounded-r-full" />
                          )}
                          <item.icon className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        className="bg-popover text-popover-foreground border border-border px-3 py-2"
                      >
                        <p>{item.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ) : (
                // Expanded mode: show collapsible groups
                <Collapsible open={openGroups[group.id]} onOpenChange={() => toggleGroup(group.id)}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <group.icon className="h-4 w-4" />
                        <span>{group.name}</span>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", openGroups[group.id] && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    {group.items.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => handleNavClick(item.tab)}
                        className={cn(
                          "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ml-2 relative",
                          activeTab === item.tab
                            ? "bg-warning/20 text-warning"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {activeTab === item.tab && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-warning to-warning/50 rounded-r-full" />
                        )}
                        <item.icon className="h-4 w-4 mr-3" />
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-border space-y-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          onClick={toggleTheme}
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted",
            isCollapsed && !isMobile && "justify-center px-2"
          )}
        >
          {theme === 'dark' ? (
            <Sun className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          ) : (
            <Moon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          )}
          {!isCollapsed && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
        </Button>
        
        <Button
          variant="ghost"
          onClick={handleBackToApp}
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted",
            isCollapsed && !isMobile && "justify-center px-2"
          )}
        >
          <Home className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span>Voltar ao App</span>}
        </Button>
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
            isCollapsed && !isMobile && "justify-center px-2"
          )}
        >
          <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span>Sair</span>}
        </Button>
      </div>

      {/* Version Info */}
      {!isCollapsed && (
        <div className="p-3 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            {systemName} v1.0.0
          </div>
        </div>
      )}
    </aside>
  );
};

export default SaasAdminSidebar;
