import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRolePermissions, ROUTE_PERMISSIONS } from '@/hooks/useRolePermissions';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string; // Permissão específica para a rota
}

export const ProtectedRoute = ({ children, requiredPermission }: ProtectedRouteProps) => {
  const { user, loading, needsProfileCompletion, userRole } = useAuth();
  const { hasPermission, hasRoutePermission, loading: permissionsLoading } = useRolePermissions();
  const location = useLocation();

  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to complete profile if needed (except if already on that page)
  if (needsProfileCompletion && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  // Super admin e admin têm acesso total
  if (userRole === 'super_admin' || userRole === 'admin') {
    return <>{children}</>;
  }

  // Verificar permissão específica passada como prop
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Verificar permissão baseada na rota atual
  const routePermission = ROUTE_PERMISSIONS[location.pathname];
  if (routePermission && !hasPermission(routePermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Componente para rotas que exigem role específico
interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const { user, loading, needsProfileCompletion, userRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (needsProfileCompletion && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  // Super admin sempre tem acesso
  if (userRole === 'super_admin') {
    return <>{children}</>;
  }

  // Verificar se o role do usuário está na lista de permitidos
  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Componente para rotas exclusivas de admin
export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
      {children}
    </RoleProtectedRoute>
  );
};

// Componente para rotas exclusivas de super admin
export const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <RoleProtectedRoute allowedRoles={['super_admin']}>
      {children}
    </RoleProtectedRoute>
  );
};
