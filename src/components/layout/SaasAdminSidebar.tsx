import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Building2,
  CreditCard,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  Home,
  Package,
  LayoutDashboard,
  Smartphone,
  Moon,
  Sun,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  name: string;
  tab: string;
  icon: React.ComponentType<{ className?: string }>;
}

const saasNavigation: NavItem[] = [
  { name: "Visão Geral", tab: "overview", icon: LayoutDashboard },
  { name: "Barbearias", tab: "tenants", icon: Building2 },
  { name: "Planos", tab: "plans", icon: Package },
  { name: "Mensagens", tab: "messages", icon: MessageSquare },
  { name: "Branding", tab: "branding", icon: Palette },
  { name: "Integrações", tab: "integrations", icon: Smartphone },
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

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleBackToApp = () => {
    navigate('/');
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
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-warning" />
              <span className="font-bold text-foreground">Admin SaaS</span>
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {saasNavigation.map((item) => (
          <button
            key={item.name}
            onClick={() => handleNavClick(item.tab)}
            className={cn(
              "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
              activeTab === item.tab
                ? "bg-warning/20 text-warning"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
              isCollapsed && !isMobile && "justify-center px-2"
            )}
          >
            <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
            {!isCollapsed && <span>{item.name}</span>}
          </button>
        ))}
      </nav>

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
            Barber Smart SaaS v1.0.0
          </div>
        </div>
      )}
    </aside>
  );
};

export default SaasAdminSidebar;
