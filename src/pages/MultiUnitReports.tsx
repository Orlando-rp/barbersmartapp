import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Star,
  UserCheck,
  Clock,
  Target,
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
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UnitMetrics {
  id: string;
  name: string;
  revenue: number;
  appointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  clients: number;
  newClients: number;
  averageTicket: number;
  occupancyRate: number;
  rating: number;
  topServices: { name: string; count: number }[];
  topStaff: { name: string; revenue: number; appointments: number }[];
}

interface ComparisonData {
  metric: string;
  [key: string]: string | number;
}

type PeriodType = 'week' | 'month' | '3months' | 'year';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const MultiUnitReports = () => {
  const { barbershops, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>('month');
  const [unitMetrics, setUnitMetrics] = useState<UnitMetrics[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (barbershops.length > 0) {
      calculateDateRange();
    } else {
      setLoading(false);
    }
  }, [barbershops, period]);

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchAllMetrics();
    }
  }, [dateRange]);

  const calculateDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (period) {
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case '3months':
        start = subMonths(startOfMonth(now), 2);
        end = endOfMonth(now);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    });
  };

  const fetchAllMetrics = async () => {
    try {
      setLoading(true);

      const metricsPromises = barbershops.map(async (barbershop) => {
        // Receita
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('barbershop_id', barbershop.id)
          .eq('type', 'receita')
          .gte('transaction_date', dateRange.start)
          .lte('transaction_date', dateRange.end);

        const revenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        // Agendamentos
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id, status, service_name, service_price, staff_id')
          .eq('barbershop_id', barbershop.id)
          .gte('appointment_date', dateRange.start)
          .lte('appointment_date', dateRange.end);

        const totalAppointments = appointments?.length || 0;
        const completedAppointments = appointments?.filter(a => a.status === 'concluido').length || 0;
        const cancelledAppointments = appointments?.filter(a => a.status === 'cancelado').length || 0;

        // Ticket médio
        const averageTicket = completedAppointments > 0 
          ? revenue / completedAppointments 
          : 0;

        // Taxa de ocupação
        const occupancyRate = totalAppointments > 0 
          ? Math.round((completedAppointments / totalAppointments) * 100) 
          : 0;

        // Clientes
        const { count: clientCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', barbershop.id)
          .eq('active', true);

        const { count: newClientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', barbershop.id)
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);

        // Avaliação média
        let rating = 0;
        try {
          const { data: avgRating } = await supabase
            .rpc('get_barbershop_average_rating', { barbershop_uuid: barbershop.id });
          rating = avgRating || 0;
        } catch (e) {
          console.log('Reviews not configured');
        }

        // Top serviços
        const serviceCounts: Record<string, number> = {};
        appointments?.forEach(apt => {
          if (apt.service_name) {
            serviceCounts[apt.service_name] = (serviceCounts[apt.service_name] || 0) + 1;
          }
        });
        const topServices = Object.entries(serviceCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        // Top profissionais
        const { data: staffData } = await supabase
          .from('staff')
          .select(`
            id,
            profiles!staff_user_id_fkey(full_name)
          `)
          .eq('barbershop_id', barbershop.id);

        const staffRevenue: Record<string, { name: string; revenue: number; appointments: number }> = {};
        
        if (staffData) {
          for (const staff of staffData) {
            const staffAppointments = appointments?.filter(a => a.staff_id === staff.id) || [];
            const staffRev = staffAppointments
              .filter(a => a.status === 'concluido')
              .reduce((sum, a) => sum + Number(a.service_price || 0), 0);
            
            staffRevenue[staff.id] = {
              name: (staff.profiles as any)?.full_name || 'Profissional',
              revenue: staffRev,
              appointments: staffAppointments.length,
            };
          }
        }

        const topStaff = Object.values(staffRevenue)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        return {
          id: barbershop.id,
          name: barbershop.name,
          revenue,
          appointments: totalAppointments,
          completedAppointments,
          cancelledAppointments,
          clients: clientCount || 0,
          newClients: newClientsCount || 0,
          averageTicket,
          occupancyRate,
          rating,
          topServices,
          topStaff,
        };
      });

      const allMetrics = await Promise.all(metricsPromises);
      setUnitMetrics(allMetrics);
    } catch (error: any) {
      console.error('Erro ao buscar métricas:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mês';
      case '3months': return 'Últimos 3 Meses';
      case 'year': return 'Este Ano';
    }
  };

  const getTotalMetrics = () => {
    return {
      revenue: unitMetrics.reduce((sum, u) => sum + u.revenue, 0),
      appointments: unitMetrics.reduce((sum, u) => sum + u.appointments, 0),
      clients: unitMetrics.reduce((sum, u) => sum + u.clients, 0),
      avgRating: unitMetrics.length > 0 
        ? unitMetrics.reduce((sum, u) => sum + u.rating, 0) / unitMetrics.length 
        : 0,
    };
  };

  const getComparisonTableData = (): ComparisonData[] => {
    const metrics = [
      { key: 'revenue', label: 'Receita', format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      { key: 'appointments', label: 'Agendamentos', format: (v: number) => v.toString() },
      { key: 'completedAppointments', label: 'Concluídos', format: (v: number) => v.toString() },
      { key: 'cancelledAppointments', label: 'Cancelados', format: (v: number) => v.toString() },
      { key: 'clients', label: 'Clientes Ativos', format: (v: number) => v.toString() },
      { key: 'newClients', label: 'Novos Clientes', format: (v: number) => v.toString() },
      { key: 'averageTicket', label: 'Ticket Médio', format: (v: number) => `R$ ${v.toFixed(2)}` },
      { key: 'occupancyRate', label: 'Taxa de Ocupação', format: (v: number) => `${v}%` },
      { key: 'rating', label: 'Avaliação', format: (v: number) => v > 0 ? `${v.toFixed(1)} ⭐` : 'Sem avaliações' },
    ];

    return metrics.map(({ key, label, format }) => {
      const row: ComparisonData = { metric: label };
      unitMetrics.forEach(unit => {
        row[unit.name] = format((unit as any)[key]);
      });
      return row;
    });
  };

  // Dados para gráfico de barras comparativo
  const revenueChartData = unitMetrics.map(u => ({
    name: u.name,
    receita: u.revenue,
    agendamentos: u.appointments,
  }));

  // Dados para radar chart
  const getRadarData = () => {
    const maxRevenue = Math.max(...unitMetrics.map(u => u.revenue), 1);
    const maxAppointments = Math.max(...unitMetrics.map(u => u.appointments), 1);
    const maxClients = Math.max(...unitMetrics.map(u => u.clients), 1);

    return [
      { subject: 'Receita', ...unitMetrics.reduce((acc, u) => ({ ...acc, [u.name]: (u.revenue / maxRevenue) * 100 }), {}) },
      { subject: 'Agendamentos', ...unitMetrics.reduce((acc, u) => ({ ...acc, [u.name]: (u.appointments / maxAppointments) * 100 }), {}) },
      { subject: 'Clientes', ...unitMetrics.reduce((acc, u) => ({ ...acc, [u.name]: (u.clients / maxClients) * 100 }), {}) },
      { subject: 'Ocupação', ...unitMetrics.reduce((acc, u) => ({ ...acc, [u.name]: u.occupancyRate }), {}) },
      { subject: 'Avaliação', ...unitMetrics.reduce((acc, u) => ({ ...acc, [u.name]: (u.rating / 5) * 100 }), {}) },
    ];
  };

  const exportToCSV = () => {
    const headers = ['Métrica', ...unitMetrics.map(u => u.name)];
    const data = getComparisonTableData();
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => [row.metric, ...unitMetrics.map(u => row[u.name])].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-multi-unidade-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('Relatório exportado com sucesso');
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

  if (barbershops.length <= 1 && userRole !== 'super_admin') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Relatórios Multi-Unidade</h2>
          <p className="text-muted-foreground max-w-md">
            Esta funcionalidade está disponível apenas para contas com múltiplas unidades de barbearia.
          </p>
        </div>
      </Layout>
    );
  }

  const totals = getTotalMetrics();

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              Relatórios Multi-Unidade
            </h1>
            <p className="text-muted-foreground">
              Comparativo de desempenho entre {barbershops.length} unidades
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="3months">Últimos 3 Meses</SelectItem>
                <SelectItem value="year">Este Ano</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Period Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            <Calendar className="h-3 w-3 mr-1" />
            {format(new Date(dateRange.start), "dd 'de' MMM", { locale: ptBR })} - {format(new Date(dateRange.end), "dd 'de' MMM, yyyy", { locale: ptBR })}
          </Badge>
        </div>

        {/* Consolidated Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Total</p>
                  <p className="text-2xl font-bold text-success">
                    R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                  <p className="text-sm text-muted-foreground">Total Agendamentos</p>
                  <p className="text-2xl font-bold text-primary">{totals.appointments}</p>
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
                  <p className="text-2xl font-bold text-foreground">{totals.clients}</p>
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
                    {totals.avgRating.toFixed(1)} ⭐
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <Star className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="comparison">
              <FileText className="h-4 w-4 mr-2" />
              Tabela Comparativa
            </TabsTrigger>
            <TabsTrigger value="ranking">
              <Target className="h-4 w-4 mr-2" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="staff">
              <UserCheck className="h-4 w-4 mr-2" />
              Equipe
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <Card className="barbershop-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-success" />
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

              {/* Radar Chart */}
              <Card className="barbershop-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Performance Comparativa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={getRadarData()}>
                        <PolarGrid className="stroke-muted" />
                        <PolarAngleAxis dataKey="subject" className="text-xs" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs" />
                        {unitMetrics.map((unit, index) => (
                          <Radar
                            key={unit.id}
                            name={unit.name}
                            dataKey={unit.name}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            fillOpacity={0.2}
                          />
                        ))}
                        <Legend />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Appointments Chart */}
              <Card className="barbershop-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Agendamentos por Unidade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={unitMetrics.map(u => ({
                        name: u.name,
                        total: u.appointments,
                        concluidos: u.completedAppointments,
                        cancelados: u.cancelledAppointments,
                      }))}>
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
                        <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="concluidos" name="Concluídos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cancelados" name="Cancelados" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Comparison Table Tab */}
          <TabsContent value="comparison">
            <Card className="barbershop-card">
              <CardHeader>
                <CardTitle>Tabela Comparativa</CardTitle>
                <CardDescription>Comparação detalhada de métricas entre unidades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Métrica</TableHead>
                        {unitMetrics.map(unit => (
                          <TableHead key={unit.id} className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Building2 className="h-4 w-4 text-primary" />
                              {unit.name}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getComparisonTableData().map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{row.metric}</TableCell>
                          {unitMetrics.map(unit => (
                            <TableCell key={unit.id} className="text-center">
                              {row[unit.name]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Ranking por Receita */}
              <Card className="barbershop-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-success" />
                    Ranking por Receita
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...unitMetrics]
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((unit, idx) => (
                        <div key={unit.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
                          <div className="flex items-center gap-3">
                            <span className={`
                              w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                              ${idx === 0 ? 'bg-yellow-500 text-yellow-900' : 
                                idx === 1 ? 'bg-gray-300 text-gray-700' : 
                                idx === 2 ? 'bg-amber-600 text-amber-100' : 'bg-muted text-muted-foreground'}
                            `}>
                              {idx + 1}
                            </span>
                            <span className="font-medium">{unit.name}</span>
                          </div>
                          <span className="font-bold text-success">
                            R$ {unit.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ranking por Agendamentos */}
              <Card className="barbershop-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Ranking por Agendamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...unitMetrics]
                      .sort((a, b) => b.appointments - a.appointments)
                      .map((unit, idx) => (
                        <div key={unit.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
                          <div className="flex items-center gap-3">
                            <span className={`
                              w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                              ${idx === 0 ? 'bg-yellow-500 text-yellow-900' : 
                                idx === 1 ? 'bg-gray-300 text-gray-700' : 
                                idx === 2 ? 'bg-amber-600 text-amber-100' : 'bg-muted text-muted-foreground'}
                            `}>
                              {idx + 1}
                            </span>
                            <span className="font-medium">{unit.name}</span>
                          </div>
                          <span className="font-bold text-primary">{unit.appointments}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ranking por Ocupação */}
              <Card className="barbershop-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    Ranking por Ocupação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...unitMetrics]
                      .sort((a, b) => b.occupancyRate - a.occupancyRate)
                      .map((unit, idx) => (
                        <div key={unit.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
                          <div className="flex items-center gap-3">
                            <span className={`
                              w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                              ${idx === 0 ? 'bg-yellow-500 text-yellow-900' : 
                                idx === 1 ? 'bg-gray-300 text-gray-700' : 
                                idx === 2 ? 'bg-amber-600 text-amber-100' : 'bg-muted text-muted-foreground'}
                            `}>
                              {idx + 1}
                            </span>
                            <span className="font-medium">{unit.name}</span>
                          </div>
                          <span className="font-bold text-warning">{unit.occupancyRate}%</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {unitMetrics.map((unit) => (
                <Card key={unit.id} className="barbershop-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {unit.name} - Top Profissionais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {unit.topStaff.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        Sem dados de profissionais para este período
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {unit.topStaff.map((staff, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
                            <div className="flex items-center gap-3">
                              <span className={`
                                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                ${idx === 0 ? 'bg-yellow-500 text-yellow-900' : 
                                  idx === 1 ? 'bg-gray-300 text-gray-700' : 
                                  idx === 2 ? 'bg-amber-600 text-amber-100' : 'bg-muted text-muted-foreground'}
                              `}>
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-medium">{staff.name}</p>
                                <p className="text-xs text-muted-foreground">{staff.appointments} agendamentos</p>
                              </div>
                            </div>
                            <span className="font-bold text-success">
                              R$ {staff.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default MultiUnitReports;
