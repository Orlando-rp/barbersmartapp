import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

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
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (barbershops.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center px-4">
        <Building2 className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-3 sm:mb-4" />
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Dashboard Multi-Unidade</h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md">
          Este dashboard está disponível apenas para contas com múltiplas unidades de barbearia.
          Você atualmente possui acesso a apenas uma unidade.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="gradient-subtle p-4 md:p-6 rounded-xl border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl font-bold text-foreground mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
                <Building2 className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
                <span className="truncate">Dashboard Multi-Unidade</span>
              </h1>
              <p className="text-sm md:text-lg text-muted-foreground">
                Visão consolidada de {barbershops.length} unidades
              </p>
            </div>
            <Badge variant="secondary" className="text-xs md:text-lg px-2 md:px-4 py-1 md:py-2 w-fit">
              {userRole === 'super_admin' ? 'Super Admin' : 'Multi-Unidade'}
            </Badge>
          </div>
        </div>

        {/* Consolidated Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Receita (Mês)</p>
                  <p className="text-lg md:text-2xl font-bold text-success truncate">
                    R$ {consolidated?.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Agend. (Mês)</p>
                  <p className="text-lg md:text-2xl font-bold text-primary">
                    {consolidated?.totalAppointments}
                  </p>
                </div>
                <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Clientes</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">
                    {consolidated?.totalClients}
                  </p>
                </div>
                <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 md:h-6 md:w-6 text-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Avaliação</p>
                  <p className="text-lg md:text-2xl font-bold text-warning">
                    {consolidated?.averageRating.toFixed(1)} ⭐
                  </p>
                </div>
                <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <Star className="h-4 w-4 md:h-6 md:w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">Melhor Desempenho</p>
                  <p className="text-base md:text-xl font-bold text-foreground truncate">{consolidated?.bestPerformingUnit}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="h-5 w-5 md:h-6 md:w-6 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">Precisa de Atenção</p>
                  <p className="text-base md:text-xl font-bold text-foreground truncate">{consolidated?.worstPerformingUnit}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Revenue by Unit */}
          <Card className="barbershop-card">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Receita por Unidade
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0">
              <div className="h-[250px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }} 
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 10 }} width={50} />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
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
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-success" />
                Distribuição de Receita
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0">
              <div className="h-[250px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={70}
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
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments Comparison */}
        <Card className="barbershop-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Comparativo de Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="h-[250px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentsChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }} 
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 10 }} width={35} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="agendamentos" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="confirmados" name="Confirmados" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Unit Details Table */}
        <Card className="barbershop-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Detalhes por Unidade
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="space-y-3 md:space-y-4">
              {unitStats.map((unit, index) => (
                <div 
                  key={unit.id} 
                  className="p-3 md:p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
                >
                  <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <div 
                        className="h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm md:text-base flex-shrink-0"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      >
                        {unit.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm md:text-base truncate">{unit.name}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {unit.todayAppointments} agend. hoje
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm md:text-lg font-bold text-success whitespace-nowrap">
                        R$ {unit.monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[10px] md:text-sm text-muted-foreground">este mês</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                    <div>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Clientes</p>
                      <p className="text-xs md:text-sm font-medium">{unit.activeClients}</p>
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Novos</p>
                      <p className="text-xs md:text-sm font-medium text-primary">+{unit.newClientsThisMonth}</p>
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Ocupação</p>
                      <div className="flex items-center gap-1 md:gap-2">
                        <Progress value={unit.occupancyRate} className="h-1.5 md:h-2 flex-1" />
                        <span className="text-xs md:text-sm font-medium">{unit.occupancyRate}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Avaliação</p>
                      <p className="text-xs md:text-sm font-medium">
                        {unit.averageRating > 0 ? `${unit.averageRating.toFixed(1)} ⭐` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default MultiUnitDashboard;
