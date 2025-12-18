import { Navigate, useLocation } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { PageLoader } from '@/components/ui/page-loader';

interface ClientProtectedRouteProps {
  children: React.ReactNode;
}

export const ClientProtectedRoute = ({ children }: ClientProtectedRouteProps) => {
  const { user, client, loading } = useClientAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  // Se não está logado, redireciona para login do cliente
  if (!user) {
    return <Navigate to="/cliente/auth" state={{ from: location }} replace />;
  }

  // Se está logado mas não é cliente vinculado
  if (!client) {
    return <Navigate to="/cliente/auth" state={{ error: 'not_client' }} replace />;
  }

  return <>{children}</>;
};
