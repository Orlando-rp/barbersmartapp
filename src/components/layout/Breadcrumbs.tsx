import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Route name mappings
const routeNames: Record<string, string> = {
  '': 'Dashboard',
  'appointments': 'Agendamentos',
  'clients': 'Clientes',
  'services': 'Serviços',
  'staff': 'Equipe',
  'finance': 'Financeiro',
  'reports': 'Relatórios',
  'marketing': 'Marketing',
  'settings': 'Configurações',
  'profile': 'Perfil',
  'business-hours': 'Horários',
  'reviews': 'Avaliações',
  'whatsapp': 'WhatsApp',
  'whatsapp-chat': 'Chat WhatsApp',
  'chatbot': 'Chatbot',
  'audit': 'Auditoria',
  'waitlist': 'Lista de Espera',
  'meus-ganhos': 'Meus Ganhos',
  'multi-unit': 'Multi-unidades',
  'staff-multi-unit': 'Equipe Multi-unidade',
  'multi-unit-reports': 'Relatórios Multi-unidade',
  'barbershops': 'Barbearias',
  'upgrade': 'Planos',
  'saas-admin': 'Admin SaaS',
  'client-history': 'Histórico do Cliente',
  'debug': 'Debug',
};

// Routes that should not show breadcrumbs
const hideBreadcrumbsRoutes = ['/', '/auth', '/complete-profile', '/privacy', '/terms', '/install'];

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Don't show breadcrumbs on certain routes
  if (hideBreadcrumbsRoutes.includes(location.pathname)) {
    return null;
  }

  // Don't show for public routes
  if (location.pathname.startsWith('/agendar/') || 
      location.pathname.startsWith('/b/') || 
      location.pathname.startsWith('/s/')) {
    return null;
  }

  const getBreadcrumbName = (segment: string): string => {
    // Check if it's a UUID (for dynamic routes like client-history/:id)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(segment)) {
      return 'Detalhes';
    }
    return routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Início</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pathnames.map((segment, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const name = getBreadcrumbName(segment);

          return (
            <BreadcrumbItem key={routeTo}>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
              {isLast ? (
                <BreadcrumbPage className="font-medium text-foreground">
                  {name}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={routeTo} className="text-muted-foreground hover:text-foreground transition-colors">
                    {name}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
