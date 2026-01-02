import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { supabase } from "@/lib/supabase";
import StatsCard from "@/components/dashboard/StatsCard";
import AppointmentList from "@/components/dashboard/AppointmentList";
import RevenueChart from "@/components/dashboard/RevenueChart";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/skeletons";
import { RevenueWidget } from "@/components/dashboard/widgets/RevenueWidget";
import { AppointmentsWidget } from "@/components/dashboard/widgets/AppointmentsWidget";
import { ClientsWidget } from "@/components/dashboard/widgets/ClientsWidget";
import { OccupancyWidget } from "@/components/dashboard/widgets/OccupancyWidget";
import { WaitlistWidget } from "@/components/dashboard/widgets/WaitlistWidget";
import { WidgetSelector, defaultWidgets, WidgetConfig, ColumnConfig } from "@/components/dashboard/WidgetSelector";
import { DraggableWidgetGrid } from "@/components/dashboard/DraggableWidgetGrid";
import { LayoutManager, DashboardLayout } from "@/components/dashboard/LayoutManager";
import { PublicBookingLink } from "@/components/settings/PublicBookingLink";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { useAvatarPreload } from "@/hooks/useAvatarPreload";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Scissors,
  TrendingUp,
  UserPlus,
  Clock,
  Star,
  Settings,
  GripVertical
} from "lucide-react";
import { toast } from "sonner";

interface DashboardStats {
  todayAppointments: number;
  monthRevenue: number;
  activeClients: number;
  averageRating: number;
  popularServices: { name: string; percentage: number }[];
  occupancyRate: number;
  newClientsThisMonth: number;
  retentionRate: number;
}

const defaultWidgetOrder = ['revenue', 'appointments', 'clients', 'occupancy', 'waitlist'];

const Index = () => {
  const { barbershopId, barbershops, selectedBarbershopId, activeBarbershopIds, user } = useAuth();
  const { branding } = useBranding();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [consolidatedStats, setConsolidatedStats] = useState<DashboardStats | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    return saved ? JSON.parse(saved) : defaultWidgets;
  });
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard-widget-order');
    return saved ? JSON.parse(saved) : defaultWidgetOrder;
  });
  const [columns, setColumns] = useState<ColumnConfig>(() => {
    const saved = localStorage.getItem('dashboard-columns');
    return saved ? (parseInt(saved) as ColumnConfig) : 4;
  });
  const [customizeMode, setCustomizeMode] = useState(false);

  // Preload critical avatars for better UX
  useAvatarPreload({
    currentUser: true,
    todayStaff: true,
    allStaff: false,
    topClients: 10,
    barbershopIds: activeBarbershopIds,
    userId: user?.id,
  });

  const handleColumnsChange = (cols: ColumnConfig) => {
    setColumns(cols);
    localStorage.setItem('dashboard-columns', cols.toString());
  };

  const handleLoadLayout = (layout: DashboardLayout) => {
    setWidgets(layout.widgets);
    setWidgetOrder(layout.widgetOrder);
    setColumns(layout.columns);
    localStorage.setItem('dashboard-widgets', JSON.stringify(layout.widgets));
    localStorage.setItem('dashboard-widget-order', JSON.stringify(layout.widgetOrder));
    localStorage.setItem('dashboard-columns', layout.columns.toString());
  };

  // Visão consolidada quando múltiplas unidades selecionáveis e nenhuma selecionada
  const hasMultipleUnits = activeBarbershopIds.length > 1;
  const isConsolidatedView = hasMultipleUnits && selectedBarbershopId === null;

  // Fetch user profile for display name
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('preferred_name, full_name')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data) {
        const displayName = data.preferred_name?.trim() 
          || data.full_name?.split(' ')[0] 
          || null;
        setUserDisplayName(displayName);
      }
    };
    
    fetchUserProfile();
  }, [user?.id]);

  useEffect(() => {
    if (barbershopId && !isConsolidatedView) {
      fetchDashboardStats();
    }
  }, [barbershopId, isConsolidatedView]);

  useEffect(() => {
    if (isConsolidatedView && activeBarbershopIds.length > 0) {
      fetchConsolidatedStats();
    }
  }, [isConsolidatedView, activeBarbershopIds]);

  const fetchConsolidatedStats = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      let totalTodayAppointments = 0;
      let totalMonthRevenue = 0;
      let totalActiveClients = 0;
      let totalRating = 0;
      let totalOccupancy = 0;
      let totalNewClients = 0;
      let totalRetention = 0;
      const allServiceCounts: Record<string, number> = {};
      let totalAppointments = 0;

      // Usar apenas unidades operacionais (exclui matrizes com filhos)
      for (const unitId of activeBarbershopIds) {
        // Agendamentos hoje
        const { count: todayCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', unitId)
          .eq('appointment_date', today);
        totalTodayAppointments += todayCount || 0;

        // Receita do mês
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('barbershop_id', unitId)
          .eq('type', 'receita')
          .gte('transaction_date', firstDayOfMonth);
        totalMonthRevenue += transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        // Clientes ativos
        const { count: clientCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', unitId)
          .eq('active', true);
        totalActiveClients += clientCount || 0;

        // Serviços e agendamentos
        const { data: appointments } = await supabase
          .from('appointments')
          .select('service_name, client_id')
          .eq('barbershop_id', unitId)
          .gte('appointment_date', firstDayOfMonth);

        appointments?.forEach(apt => {
          if (apt.service_name) {
            allServiceCounts[apt.service_name] = (allServiceCounts[apt.service_name] || 0) + 1;
          }
        });
        totalAppointments += appointments?.length || 0;

        // Taxa de ocupação
        const { count: confirmedCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', unitId)
          .gte('appointment_date', firstDayOfMonth)
          .in('status', ['confirmado', 'concluido']);
        totalOccupancy += confirmedCount || 0;

        // Novos clientes
        const { count: newClientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', unitId)
          .gte('created_at', firstDayOfMonth);
        totalNewClients += newClientsCount || 0;

        // Avaliação
        try {
          const { data: avgRating } = await supabase
            .rpc('get_barbershop_average_rating', { barbershop_uuid: unitId });
          totalRating += avgRating || 0;
        } catch (e) {}
      }

      const popularServices = Object.entries(allServiceCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({
          name,
          percentage: Math.round((count / Math.max(totalAppointments, 1)) * 100)
        }));

      setConsolidatedStats({
        todayAppointments: totalTodayAppointments,
        monthRevenue: totalMonthRevenue,
        activeClients: totalActiveClients,
        averageRating: activeBarbershopIds.length > 0 ? Math.round((totalRating / activeBarbershopIds.length) * 10) / 10 : 0,
        popularServices,
        occupancyRate: totalAppointments > 0 ? Math.round((totalOccupancy / totalAppointments) * 100) : 0,
        newClientsThisMonth: totalNewClients,
        retentionRate: 0
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas consolidadas:', error);
      toast.error('Erro ao carregar estatísticas consolidadas');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Agendamentos hoje
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId)
        .eq('appointment_date', today);

      // Receita do mês
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('barbershop_id', barbershopId)
        .eq('type', 'receita')
        .gte('transaction_date', firstDayOfMonth);

      const monthRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Clientes ativos
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId)
        .eq('active', true);

      // Serviços populares e dados de agendamentos para retenção
      const { data: appointments } = await supabase
        .from('appointments')
        .select('service_name, client_id')
        .eq('barbershop_id', barbershopId)
        .gte('appointment_date', firstDayOfMonth);

      const serviceCounts: Record<string, number> = {};
      appointments?.forEach(apt => {
        if (apt.service_name) {
          serviceCounts[apt.service_name] = (serviceCounts[apt.service_name] || 0) + 1;
        }
      });

      const totalAppointments = appointments?.length || 1;
      const popularServices = Object.entries(serviceCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({
          name,
          percentage: Math.round((count / totalAppointments) * 100)
        }));

      // Taxa de ocupação (agendamentos confirmados vs total de slots)
      const { count: confirmedCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId)
        .gte('appointment_date', firstDayOfMonth)
        .in('status', ['confirmado', 'concluido']);

      const occupancyRate = totalAppointments > 0 
        ? Math.round(((confirmedCount || 0) / totalAppointments) * 100)
        : 0;

      // Taxa de retenção (clientes com mais de 1 agendamento no período)
      const clientAppointmentCounts = new Map<string, number>();
      appointments?.forEach(apt => {
        if (apt.client_id) {
          const count = clientAppointmentCounts.get(apt.client_id) || 0;
          clientAppointmentCounts.set(apt.client_id, count + 1);
        }
      });

      const clientsWithMultipleAppointments = Array.from(clientAppointmentCounts.values())
        .filter(count => count > 1).length;
      
      const retentionRate = (clientCount || 0) > 0 
        ? Math.round((clientsWithMultipleAppointments / (clientCount || 1)) * 100)
        : 0;

      // Novos clientes este mês
      const { count: newClientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId)
        .gte('created_at', firstDayOfMonth);

      // Avaliação média real do banco de dados
      let averageRating = 0;
      try {
        const { data: avgRating } = await supabase
          .rpc('get_barbershop_average_rating', { barbershop_uuid: barbershopId });
        averageRating = avgRating || 0;
      } catch (e) {
        // Tabela reviews ainda não existe ou função não disponível
        console.log('Sistema de avaliações não configurado');
      }

      setStats({
        todayAppointments: todayCount || 0,
        monthRevenue,
        activeClients: clientCount || 0,
        averageRating,
        popularServices,
        occupancyRate,
        newClientsThisMonth: newClientsCount || 0,
        retentionRate
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWidget = (widgetId: string) => {
    const updated = widgets.map(w => 
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );
    setWidgets(updated);
    localStorage.setItem('dashboard-widgets', JSON.stringify(updated));
  };

  const handleRemoveWidget = (widgetId: string) => {
    const updated = widgets.map(w => 
      w.id === widgetId ? { ...w, enabled: false } : w
    );
    setWidgets(updated);
    localStorage.setItem('dashboard-widgets', JSON.stringify(updated));
    toast.success('Widget removido');
  };

  const handleReorderWidgets = useCallback((newOrder: string[]) => {
    setWidgetOrder(newOrder);
    localStorage.setItem('dashboard-widget-order', JSON.stringify(newOrder));
    toast.success('Ordem dos widgets atualizada');
  }, []);

  // Render widget by ID
  const renderWidget = useCallback((widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget?.enabled) return null;

    switch (widgetId) {
      case 'revenue':
        return <RevenueWidget onRemove={customizeMode ? () => handleRemoveWidget('revenue') : undefined} />;
      case 'appointments':
        return <AppointmentsWidget onRemove={customizeMode ? () => handleRemoveWidget('appointments') : undefined} />;
      case 'clients':
        return <ClientsWidget onRemove={customizeMode ? () => handleRemoveWidget('clients') : undefined} />;
      case 'occupancy':
        return <OccupancyWidget onRemove={customizeMode ? () => handleRemoveWidget('occupancy') : undefined} />;
      case 'waitlist':
        return <WaitlistWidget onRemove={customizeMode ? () => handleRemoveWidget('waitlist') : undefined} />;
      default:
        return null;
    }
  }, [widgets, customizeMode]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const currentStats = isConsolidatedView ? consolidatedStats : stats;

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Trial Banner */}
      <TrialBanner />
      {/* Welcome Section */}
      <div className="gradient-subtle p-4 lg:p-6 rounded-xl border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 lg:mb-2">
                {userDisplayName 
                  ? `Bem-vindo, ${userDisplayName}!` 
                  : `Bem-vindo ao ${branding?.system_name || 'Barber Smart'}!`
                } 👋
              </h1>
              <p className="text-muted-foreground text-sm lg:text-lg">
                {isConsolidatedView 
                  ? `Visão consolidada de ${activeBarbershopIds.length} unidades`
                  : (branding?.tagline || 'Gerencie sua barbearia de forma inteligente')
                }
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LayoutManager
                currentWidgets={widgets}
                currentOrder={widgetOrder}
                currentColumns={columns}
                onLoadLayout={handleLoadLayout}
              />
              <Button
                variant={customizeMode ? "default" : "outline"}
                size="sm"
                onClick={() => setCustomizeMode(!customizeMode)}
              >
                {customizeMode ? (
                  <>
                    <GripVertical className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Arraste para reorganizar</span>
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Personalizar</span>
                  </>
                )}
              </Button>
              {customizeMode && (
                <WidgetSelector
                  widgets={widgets}
                  onToggleWidget={handleToggleWidget}
                  columns={columns}
                  onColumnsChange={handleColumnsChange}
                />
              )}
              <AppointmentDialog>
                <Button variant="premium" size="sm" className="shadow-gold">
                  <UserPlus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Novo Agendamento</span>
                </Button>
              </AppointmentDialog>
            </div>
          </div>
          {customizeMode && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <GripVertical className="h-3 w-3" />
              Arraste os widgets pelo ícone para reorganizá-los
            </p>
          )}
        </div>

        {/* Real-time Widgets with Drag & Drop */}
        <DraggableWidgetGrid
          widgetOrder={widgetOrder}
          onReorder={handleReorderWidgets}
          isCustomizeMode={customizeMode}
          columns={columns}
        >
          {renderWidget}
        </DraggableWidgetGrid>

        {/* Legacy Quick Stats - Only show if no widgets are enabled OR consolidated view */}
        {(!widgets.some(w => w.enabled) || isConsolidatedView) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <StatsCard
              title={isConsolidatedView ? "Agendamentos Hoje (Total)" : "Agendamentos Hoje"}
              value={currentStats?.todayAppointments || 0}
              icon={Calendar}
              variant="primary"
            />
            <StatsCard
              title={isConsolidatedView ? "Receita do Mês (Total)" : "Receita do Mês"}
              value={`R$ ${(currentStats?.monthRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              variant="success"
            />
            <StatsCard
              title={isConsolidatedView ? "Clientes Ativos (Total)" : "Clientes Ativos"}
              value={currentStats?.activeClients || 0}
              icon={Users}
              variant="default"
            />
            <StatsCard
              title={isConsolidatedView ? "Avaliação Média (Geral)" : "Avaliação Média"}
              value={currentStats?.averageRating || 0}
              icon={Star}
              variant="warning"
            />
          </div>
        )}

        {/* Public Booking Link */}
        <PublicBookingLink />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <div>
            <AppointmentList />
          </div>
          <div>
            <RevenueChart />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <Card className="barbershop-card hover:shadow-medium cursor-pointer">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Scissors className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Serviços Populares
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-2 sm:space-y-3">
                {currentStats?.popularServices && currentStats.popularServices.length > 0 ? (
                  currentStats.popularServices.map((service, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-2">
                      <span className="text-xs sm:text-sm text-muted-foreground truncate">{service.name}</span>
                      <span className="text-xs sm:text-sm font-medium flex-shrink-0">{service.percentage}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground">Nenhum dado disponível</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card hover:shadow-medium cursor-pointer">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                Performance do Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Ocupação</span>
                  <span className="text-xs sm:text-sm font-medium text-success">{currentStats?.occupancyRate ?? 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Novos</span>
                  <span className="text-xs sm:text-sm font-medium text-primary">+{currentStats?.newClientsThisMonth ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Fidelização</span>
                  <span className="text-xs sm:text-sm font-medium text-warning">{currentStats?.retentionRate ?? 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card hover:shadow-medium cursor-pointer sm:col-span-2 lg:col-span-1">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                Horários de Pico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Manhã (9h-12h)</span>
                  <span className="text-xs sm:text-sm font-medium">Alto</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Tarde (14h-17h)</span>
                  <span className="text-xs sm:text-sm font-medium">Médio</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Noite (18h-20h)</span>
                  <span className="text-xs sm:text-sm font-medium">Baixo</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
