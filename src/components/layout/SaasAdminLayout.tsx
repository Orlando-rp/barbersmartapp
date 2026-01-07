import { ReactNode, useState } from "react";
import SaasAdminSidebar from "./SaasAdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { Shield, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface SaasAdminLayoutProps {
  children: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const SaasAdminLayout = ({ children, activeTab = "overview", onTabChange }: SaasAdminLayoutProps) => {
  const { userRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { effectiveBranding, currentLogoUrl } = useBranding();
  const systemName = effectiveBranding?.system_name || "Admin SaaS";

  // Verificação de acesso
  if (userRole !== 'super_admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            Este portal é exclusivo para administradores do sistema (Super Admin).
          </p>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    onTabChange?.(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <SaasAdminSidebar activeTab={activeTab} onTabChange={onTabChange} />
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border px-3 py-2.5 safe-area-top">
        <div className="flex items-center justify-between gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-9 w-9 flex-shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-72 p-0 bg-card border-border">
              <SaasAdminSidebar 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
                isMobile 
              />
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            {currentLogoUrl ? (
              <img 
                src={currentLogoUrl} 
                alt={systemName} 
                className="h-7 w-auto max-w-[120px] object-contain" 
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <Shield className="h-5 w-5 text-warning flex-shrink-0" />
                <span className="font-bold text-foreground text-sm">{systemName}</span>
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0 w-9">
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize block text-center truncate">
              {activeTab === 'overview' ? 'Geral' : 
               activeTab === 'tenants' ? 'Lojas' :
               activeTab === 'plans' ? 'Planos' :
               activeTab === 'integrations' ? 'Integ.' :
               activeTab === 'branding' ? 'Brand' :
               activeTab === 'docs' ? 'Docs' : activeTab?.slice(0, 5)}
            </span>
          </div>
        </div>
      </div>
      
      <main className="flex-1 overflow-auto md:pt-0 pt-16">
        {children}
      </main>
    </div>
  );
};

export default SaasAdminLayout;
