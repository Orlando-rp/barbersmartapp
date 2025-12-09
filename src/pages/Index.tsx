import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/layout/Layout";
import StatsCard from "@/components/dashboard/StatsCard";
import AppointmentList from "@/components/dashboard/AppointmentList";
import RevenueChart from "@/components/dashboard/RevenueChart";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RevenueWidget } from "@/components/dashboard/widgets/RevenueWidget";
import { AppointmentsWidget } from "@/components/dashboard/widgets/AppointmentsWidget";
import { ClientsWidget } from "@/components/dashboard/widgets/ClientsWidget";
import { OccupancyWidget } from "@/components/dashboard/widgets/OccupancyWidget";
import { WidgetSelector, defaultWidgets, WidgetConfig } from "@/components/dashboard/WidgetSelector";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Scissors,
  TrendingUp,
  UserPlus,
  Clock,
  Star,
  Settings
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

const Index = () => {
  const { barbershopId } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('dashboard-widgets');
    return saved ? JSON.parse(saved) : defaultWidgets;
  });
  const [customizeMode, setCustomizeMode] = useState(false);

  useEffect(() => {
    if (barbershopId) {
      fetchDashboardStats();
    }
  }, [barbershopId]);

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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 lg:space-y-6">
        {/* Welcome Section */}
        <div className="gradient-subtle p-4 lg:p-6 rounded-xl border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 lg:mb-2">
                Bem-vindo ao BarberSmart! 👋
              </h1>
              <p className="text-muted-foreground text-sm lg:text-lg">
                Gerencie sua barbearia de forma inteligente
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={customizeMode ? "default" : "outline"}
                size="sm"
                onClick={() => setCustomizeMode(!customizeMode)}
              >
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{customizeMode ? 'Salvar' : 'Personalizar'}</span>
              </Button>
              {customizeMode && (
                <WidgetSelector
                  widgets={widgets}
                  onToggleWidget={handleToggleWidget}
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
        </div>

        {/* Real-time Widgets */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {widgets.find(w => w.id === 'revenue')?.enabled && (
            <RevenueWidget onRemove={customizeMode ? () => handleRemoveWidget('revenue') : undefined} />
          )}
          {widgets.find(w => w.id === 'appointments')?.enabled && (
            <AppointmentsWidget onRemove={customizeMode ? () => handleRemoveWidget('appointments') : undefined} />
          )}
          {widgets.find(w => w.id === 'clients')?.enabled && (
            <ClientsWidget onRemove={customizeMode ? () => handleRemoveWidget('clients') : undefined} />
          )}
          {widgets.find(w => w.id === 'occupancy')?.enabled && (
            <OccupancyWidget onRemove={customizeMode ? () => handleRemoveWidget('occupancy') : undefined} />
          )}
        </div>

        {/* Legacy Quick Stats - Only show if no widgets are enabled */}
        {!widgets.some(w => w.enabled) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <StatsCard
              title="Agendamentos Hoje"
              value={stats?.todayAppointments || 0}
              icon={Calendar}
              variant="primary"
            />
            <StatsCard
              title="Receita do Mês"
              value={`R$ ${stats?.monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              variant="success"
            />
            <StatsCard
              title="Clientes Ativos"
              value={stats?.activeClients || 0}
              icon={Users}
              variant="default"
            />
            <StatsCard
              title="Avaliação Média"
              value={stats?.averageRating || 0}
              icon={Star}
              variant="warning"
            />
          </div>
        )}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <Card className="barbershop-card hover:shadow-medium cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5 text-primary" />
                Serviços Populares
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.popularServices && stats.popularServices.length > 0 ? (
                  stats.popularServices.map((service, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{service.name}</span>
                      <span className="text-sm font-medium">{service.percentage}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card hover:shadow-medium cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Performance do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Taxa de Ocupação</span>
                  <span className="text-sm font-medium text-success">{stats?.occupancyRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Clientes Novos</span>
                  <span className="text-sm font-medium text-primary">+{stats?.newClientsThisMonth}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fidelização</span>
                  <span className="text-sm font-medium text-warning">{stats?.retentionRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card hover:shadow-medium cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Horários de Pico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Manhã (9h-12h)</span>
                  <span className="text-sm font-medium">Alto</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tarde (14h-17h)</span>
                  <span className="text-sm font-medium">Médio</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Noite (18h-20h)</span>
                  <span className="text-sm font-medium">Baixo</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
