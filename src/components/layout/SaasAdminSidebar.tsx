import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
];

interface SaasAdminSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const SaasAdminSidebar = ({ activeTab = "overview", onTabChange }: SaasAdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleBackToApp = () => {
    navigate('/');
  };

  const handleNavClick = (tab: string) => {
    onTabChange?.(tab);
  };

  return (
    <div className={cn(
      "h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-amber-500" />
              <span className="font-bold text-white">Admin SaaS</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
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
                ? "bg-amber-500/20 text-amber-500"
                : "text-slate-400 hover:text-white hover:bg-slate-800",
              collapsed && "justify-center px-2"
            )}
          >
            <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
            {!collapsed && <span>{item.name}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <Button
          variant="ghost"
          onClick={handleBackToApp}
          className={cn(
            "w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800",
            collapsed && "justify-center px-2"
          )}
        >
          <Home className={cn("h-5 w-5", !collapsed && "mr-3")} />
          {!collapsed && <span>Voltar ao App</span>}
        </Button>
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
          {!collapsed && <span>Sair</span>}
        </Button>
      </div>

      {/* Version Info */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800">
          <div className="text-xs text-slate-500 text-center">
            BarberSmart SaaS v1.0.0
          </div>
        </div>
      )}
    </div>
  );
};

export default SaasAdminSidebar;
