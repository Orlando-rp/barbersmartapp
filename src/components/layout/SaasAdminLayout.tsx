import { ReactNode } from "react";
import SaasAdminSidebar from "./SaasAdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Shield } from "lucide-react";

interface SaasAdminLayoutProps {
  children: ReactNode;
}

const SaasAdminLayout = ({ children }: SaasAdminLayoutProps) => {
  const { userRole } = useAuth();

  // Verificação de acesso
  if (userRole !== 'super_admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
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

  return (
    <div className="flex h-screen bg-slate-950">
      <SaasAdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default SaasAdminLayout;
