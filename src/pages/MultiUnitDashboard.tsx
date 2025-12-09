import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Star,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface UnitStats {
  id: string;
  name: string;
  monthRevenue: number;
  todayAppointments: number;
  monthAppointments: number;
  activeClients: number;
  averageRating: number;
  occupancyRate: number;
  newClientsThisMonth: number;
}

interface ConsolidatedStats {
  totalRevenue: number;
  totalAppointments: number;
  totalClients: number;
  averageRating: number;
  bestPerformingUnit: string;
  worstPerformingUnit: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const MultiUnitDashboard = () => {
  const { barbershops, userRole } = useAuth();
  const [unitStats, setUnitStats] = useState<UnitStats[]>([]);
  const [consolidated, setConsolidated] = useState<ConsolidatedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barbershops.length > 0) {
      fetchAllUnitsStats();
    } else {
      setLoading(false);
    }
  }, [barbershops]);

  const fetchAllUnitsStats = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const statsPromises = barbershops.map(async (barbershop) => {
        // Agendamentos hoje
        const { count: todayCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', barbershop.id)
          .eq('appointment_date', today);

        // Agendamentos do mês
        const { count: monthAppointments } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', barbershop.id)
          .gte('appointment_date', firstDayOfMonth);

        // Receita do mês
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('barbershop_id', barbershop.id)
          .eq('type', 'receita')
          .gte('transaction_date', firstDayOfMonth);

        const monthRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        // Clientes ativos
        const { count: clientCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', barbershop.id)
          .eq('active', true);

        // Novos clientes do mês
        const { count: newClientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', barbershop.id)
          .gte('created_at', firstDayOfMonth);

        // Taxa de ocupação
        const { count: confirmedCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', barbershop.id)
          .gte('appointment_date', firstDayOfMonth)
          .in('status', ['confirmado', 'concluido']);

        const occupancyRate = (monthAppointments || 0) > 0 
          ? Math.round(((confirmedCount || 0) / (monthAppointments || 1)) * 100)
          : 0;

        // Avaliação média
        let averageRating = 0;
        try {
          const { data: avgRating } = await supabase
            .rpc('get_barbershop_average_rating', { barbershop_uuid: barbershop.id });
          averageRating = avgRating || 0;
        } catch (e) {
          console.log('Reviews not configured for', barbershop.name);
        }

        return {
          id: barbershop.id,
          name: barbershop.name,
          monthRevenue,
          todayAppointments: todayCount || 0,
          monthAppointments: monthAppointments || 0,
          activeClients: clientCount || 0,
          averageRating,
          occupancyRate,
          newClientsThisMonth: newClientsCount || 0,
        };
      });

      const allStats = await Promise.all(statsPromises);
      setUnitStats(allStats);

      // Calcular estatísticas consolidadas
      const totalRevenue = allStats.reduce((sum, u) => sum + u.monthRevenue, 0);
      const totalAppointments = allStats.reduce((sum, u) => sum + u.monthAppointments, 0);
      const totalClients = allStats.reduce((sum, u) => sum + u.activeClients, 0);
      const avgRating = allStats.length > 0 
        ? allStats.reduce((sum, u) => sum + u.averageRating, 0) / allStats.length 
        : 0;

      const sortedByRevenue = [...allStats].sort((a, b) => b.monthRevenue - a.monthRevenue);
      
      setConsolidated({
        totalRevenue,
        totalAppointments,
        totalClients,
        averageRating: Math.round(avgRating * 10) / 10,
        bestPerformingUnit: sortedByRevenue[0]?.name || '-',
        worstPerformingUnit: sortedByRevenue[sortedByRevenue.length - 1]?.name || '-',
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas das unidades');
    } finally {
      setLoading(false);
    }
  };

  // Dados para gráfico de receita por unidade
  const revenueChartData = unitStats.map(u => ({
    name: u.name,
    receita: u.monthRevenue,
  }));

  // Dados para gráfico de pizza (distribuição de receita)
  const pieChartData = unitStats.map(u => ({
    name: u.name,
    value: u.monthRevenue,
  }));

  // Dados para gráfico de agendamentos
  const appointmentsChartData = unitStats.map(u => ({
    name: u.name,
    agendamentos: u.monthAppointments,
    confirmados: Math.round(u.monthAppointments * u.occupancyRate / 100),
  }));

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (barbershops.length <= 1) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard Multi-Unidade</h2>
          <p className="text-muted-foreground max-w-md">
            Este dashboard está disponível apenas para contas com múltiplas unidades de barbearia.
            Você atualmente possui acesso a apenas uma unidade.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="gradient-subtle p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                Dashboard Multi-Unidade
              </h1>
              <p className="text-muted-foreground text-lg">
                Visão consolidada de {barbershops.length} unidades
              </p>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {userRole === 'super_admin' ? 'Super Admin' : 'Multi-Unidade'}
            </Badge>
          </div>
        </div>

        {/* Consolidated Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Total (Mês)</p>
                  <p className="text-2xl font-bold text-success">
                    R$ {consolidated?.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agendamentos (Mês)</p>
                  <p className="text-2xl font-bold text-primary">
                    {consolidated?.totalAppointments}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                  <p className="text-2xl font-bold text-foreground">
                    {consolidated?.totalClients}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-6 w-6 text-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avaliação Média</p>
                  <p className="text-2xl font-bold text-warning">
                    {consolidated?.averageRating.toFixed(1)} ⭐
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <Star className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Melhor Desempenho</p>
                  <p className="text-xl font-bold text-foreground">{consolidated?.bestPerformingUnit}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Precisa de Atenção</p>
                  <p className="text-xl font-bold text-foreground">{consolidated?.worstPerformingUnit}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Unit */}
          <Card className="barbershop-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Receita por Unidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Distribution Pie */}
          <Card className="barbershop-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                Distribuição de Receita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments Comparison */}
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Comparativo de Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentsChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="agendamentos" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="confirmados" name="Confirmados" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Unit Details Table */}
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Detalhes por Unidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unitStats.map((unit, index) => (
                <div 
                  key={unit.id} 
                  className="p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-10 w-10 rounded-full flex items-center justify-center text-primary-foreground font-bold"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      >
                        {unit.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{unit.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {unit.todayAppointments} agendamentos hoje
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-success">
                        R$ {unit.monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground">este mês</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Clientes Ativos</p>
                      <p className="text-sm font-medium">{unit.activeClients}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Novos Clientes</p>
                      <p className="text-sm font-medium text-primary">+{unit.newClientsThisMonth}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Taxa de Ocupação</p>
                      <div className="flex items-center gap-2">
                        <Progress value={unit.occupancyRate} className="h-2 flex-1" />
                        <span className="text-sm font-medium">{unit.occupancyRate}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avaliação</p>
                      <p className="text-sm font-medium">
                        {unit.averageRating > 0 ? `${unit.averageRating.toFixed(1)} ⭐` : 'Sem avaliações'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MultiUnitDashboard;
