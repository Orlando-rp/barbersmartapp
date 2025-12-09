import { ReactNode, useState } from "react";
import SaasAdminSidebar from "./SaasAdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Menu, X } from "lucide-react";
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

  // Verificação de acesso
  if (userRole !== 'super_admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-slate-400 max-w-md">
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
    <div className="flex min-h-screen w-full bg-slate-950">
      {/* Desktop Sidebar */}
      <SaasAdminSidebar activeTab={activeTab} onTabChange={onTabChange} />
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-amber-500" />
            <span className="font-bold text-white">Admin SaaS</span>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-slate-900 border-slate-800">
              <SaasAdminSidebar 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
                isMobile 
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      <main className="flex-1 overflow-auto md:pt-0 pt-16">
        {children}
      </main>
    </div>
  );
};

export default SaasAdminLayout;
