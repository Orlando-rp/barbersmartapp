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
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {currentLogoUrl ? (
              <img 
                src={currentLogoUrl} 
                alt={systemName} 
                className="h-7 w-auto max-w-[100px] object-contain flex-shrink-0" 
              />
            ) : (
              <>
                <Shield className="h-5 w-5 text-warning flex-shrink-0" />
                <span className="font-bold text-foreground text-sm">Admin</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded capitalize truncate max-w-[100px]">
              {activeTab === 'overview' ? 'Visão Geral' : 
               activeTab === 'tenants' ? 'Barbearias' :
               activeTab === 'plans' ? 'Planos' :
               activeTab === 'integrations' ? 'Integrações' :
               activeTab === 'branding' ? 'Branding' :
               activeTab === 'docs' ? 'Docs' : activeTab}
            </span>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-card border-border">
                <SaasAdminSidebar 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                  isMobile 
                />
              </SheetContent>
            </Sheet>
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
