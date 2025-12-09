import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  Calendar as CalendarIcon,
  Scissors,
  Percent,
  ChevronDown,
  Target,
  Award
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

interface EarningsData {
  date: string;
  receita: number;
  comissao: number;
}

interface ServiceStats {
  name: string;
  count: number;
  revenue: number;
  commission: number;
}

interface RecentTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
}

const MyEarnings = () => {
  const { user, barbershopId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffInfo, setStaffInfo] = useState<{ name: string; commissionRate: number } | null>(null);
  const [period, setPeriod] = useState("month");
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [totals, setTotals] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    servicesCount: 0,
    avgCommission: 0,
    completionRate: 0
  });

  const [earningsData, setEarningsData] = useState<EarningsData[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);

  useEffect(() => {
    if (user && barbershopId) {
      fetchStaffInfo();
    }
  }, [user, barbershopId]);

  useEffect(() => {
    const now = new Date();
    let from: Date;
    switch (period) {
      case 'week':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        from = subMonths(now, 12);
        break;
      default:
        from = subMonths(now, 1);
    }
    setDateRange({ from, to: now });
  }, [period]);

  useEffect(() => {
    if (staffId && barbershopId) {
      fetchEarningsData();
    }
  }, [staffId, barbershopId, dateRange]);

  const fetchStaffInfo = async () => {
    try {
      const { data: staffData, error } = await supabase
        .from('staff')
        .select('id, commission_rate')
        .eq('barbershop_id', barbershopId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (!staffData) {
        toast.error('Você não está cadastrado como profissional nesta barbearia');
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      setStaffId(staffData.id);
      setStaffInfo({
        name: profileData?.full_name || 'Profissional',
        commissionRate: staffData.commission_rate || 0
      });
    } catch (error) {
      console.error('Erro ao buscar informações do staff:', error);
      toast.error('Erro ao carregar informações do profissional');
      setLoading(false);
    }
  };

  const fetchEarningsData = async () => {
    try {
      setLoading(true);

      // Fetch transactions with commission
      const { data: transactionsData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('staff_id', staffId)
        .eq('type', 'receita')
        .gte('transaction_date', dateRange.from.toISOString().split('T')[0])
        .lte('transaction_date', dateRange.to.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false });

      if (transError) throw transError;

      // Fetch appointments for completion rate
      const { data: appointmentsData, error: aptError } = await supabase
        .from('appointments')
        .select('id, status, service_name, service_price')
        .eq('barbershop_id', barbershopId)
        .eq('staff_id', staffId)
        .gte('appointment_date', dateRange.from.toISOString().split('T')[0])
        .lte('appointment_date', dateRange.to.toISOString().split('T')[0]);

      if (aptError) throw aptError;

      // Process transactions
      const transactions = transactionsData || [];
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
      const totalCommission = transactions.reduce((sum, t) => 
        sum + (t.commission_amount || (t.amount * (t.commission_rate || staffInfo?.commissionRate || 0) / 100)), 0);

      // Calculate completion rate
      const totalAppointments = appointmentsData?.length || 0;
      const completedAppointments = appointmentsData?.filter(a => a.status === 'concluido').length || 0;
      const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

      setTotals({
        totalRevenue,
        totalCommission,
        servicesCount: transactions.length,
        avgCommission: transactions.length > 0 ? totalCommission / transactions.length : 0,
        completionRate
      });

      // Process daily earnings for chart
      const dailyData = new Map<string, { receita: number; comissao: number }>();
      
      // Initialize all days in range
      const daysInRange = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      daysInRange.forEach(day => {
        const dateKey = format(day, 'dd/MM');
        dailyData.set(dateKey, { receita: 0, comissao: 0 });
      });

      transactions.forEach(t => {
        const dateKey = format(new Date(t.transaction_date), 'dd/MM');
        const existing = dailyData.get(dateKey) || { receita: 0, comissao: 0 };
        existing.receita += t.amount;
        existing.comissao += t.commission_amount || (t.amount * (t.commission_rate || 0) / 100);
        dailyData.set(dateKey, existing);
      });

      const chartData = Array.from(dailyData.entries())
        .map(([date, data]) => ({ date, ...data }))
        .slice(-14); // Last 14 days for readability

      setEarningsData(chartData);

      // Process service stats
      const serviceStatsMap = new Map<string, ServiceStats>();
      transactions.forEach(t => {
        const serviceName = t.description?.split(' - ')[0] || 'Serviço';
        const existing = serviceStatsMap.get(serviceName) || {
          name: serviceName,
          count: 0,
          revenue: 0,
          commission: 0
        };
        existing.count += 1;
        existing.revenue += t.amount;
        existing.commission += t.commission_amount || (t.amount * (t.commission_rate || 0) / 100);
        serviceStatsMap.set(serviceName, existing);
      });

      setServiceStats(
        Array.from(serviceStatsMap.values())
          .sort((a, b) => b.commission - a.commission)
          .slice(0, 5)
      );

      // Recent transactions
      setRecentTransactions(
        transactions.slice(0, 10).map(t => ({
          id: t.id,
          date: t.transaction_date,
          description: t.description || 'Serviço',
          amount: t.amount,
          commissionRate: t.commission_rate || staffInfo?.commissionRate || 0,
          commissionAmount: t.commission_amount || (t.amount * (t.commission_rate || 0) / 100)
        }))
      );

    } catch (error) {
      console.error('Erro ao buscar dados de ganhos:', error);
      toast.error('Erro ao carregar dados de ganhos');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !staffInfo) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!staffId) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            Esta página é exclusiva para profissionais cadastrados na barbearia.
            Entre em contato com o administrador se você deveria ter acesso.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Meus Ganhos</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Olá, {staffInfo?.name}! Acompanhe suas comissões.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Último Mês</SelectItem>
                <SelectItem value="year">Último Ano</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 w-full sm:w-auto justify-between sm:justify-start">
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{format(dateRange.from, 'dd/MM', { locale: ptBR })} - {format(dateRange.to, 'dd/MM', { locale: ptBR })}</span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                      setShowDatePicker(false);
                    }
                  }}
                  numberOfMonths={1}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="barbershop-card">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-success/10">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Receita</p>
                  <p className="text-lg sm:text-2xl font-bold text-success truncate">
                    R$ {totals.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card border-warning/30 bg-warning/5">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Comissão</p>
                  <p className="text-lg sm:text-2xl font-bold text-warning truncate">
                    R$ {totals.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Scissors className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Serviços</p>
                  <p className="text-2xl font-bold text-foreground">
                    {totals.servicesCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Percent className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa</p>
                  <p className="text-2xl font-bold text-foreground">
                    {staffInfo?.commissionRate || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Target className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Conclusão</p>
                  <p className="text-2xl font-bold text-foreground">
                    {totals.completionRate.toFixed(0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Earnings Chart */}
          <Card className="barbershop-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Evolução dos Ganhos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <LoadingSpinner />
                </div>
              ) : earningsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => [
                        `R$ ${value.toFixed(2)}`, 
                        name === 'comissao' ? 'Comissão' : 'Receita'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="receita" 
                      stackId="1"
                      stroke="hsl(var(--success))" 
                      fill="hsl(var(--success))"
                      fillOpacity={0.2}
                      name="Receita"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="comissao" 
                      stackId="2"
                      stroke="hsl(var(--warning))" 
                      fill="hsl(var(--warning))"
                      fillOpacity={0.6}
                      name="Comissão"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services Breakdown */}
          <Card className="barbershop-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Top Serviços por Comissão
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <LoadingSpinner />
                </div>
              ) : serviceStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serviceStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      type="number"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      width={100}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Comissão']}
                    />
                    <Bar dataKey="commission" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Últimos Serviços Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : recentTransactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Taxa</TableHead>
                    <TableHead className="text-right">Minha Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(t.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell className="text-right text-success">
                        R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{t.commissionRate}%</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-warning">
                        R$ {t.commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Nenhum serviço encontrado no período</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MyEarnings;
