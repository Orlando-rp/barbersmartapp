import { useState, useEffect } from "react";

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
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!staffId) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center px-4">
        <Wallet className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Esta página é exclusiva para profissionais cadastrados na barbearia.
          Entre em contato com o administrador se você deveria ter acesso.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="space-y-3 sm:space-y-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Meus Ganhos</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Olá, {staffInfo?.name}! Acompanhe suas comissões.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9 text-sm sm:w-40">
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
                <Button variant="outline" size="sm" className="h-9 gap-2 justify-between sm:justify-start">
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{format(dateRange.from, 'dd/MM', { locale: ptBR })} - {format(dateRange.to, 'dd/MM', { locale: ptBR })}</span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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

        {/* Summary Cards - 2 columns on mobile, 5 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <Card className="barbershop-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-success/10">
                    <DollarSign className="h-3.5 w-3.5 text-success" />
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Receita</p>
                </div>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-success">
                  R$ {totals.totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card border-warning/30 bg-warning/5">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-warning/10">
                    <Wallet className="h-3.5 w-3.5 text-warning" />
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Comissão</p>
                </div>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-warning">
                  R$ {totals.totalCommission.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Scissors className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Serviços</p>
                </div>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-foreground">
                  {totals.servicesCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-muted">
                    <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Taxa</p>
                </div>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-foreground">
                  {staffInfo?.commissionRate || 0}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-success/10">
                    <Target className="h-3.5 w-3.5 text-success" />
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Conclusão</p>
                </div>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-foreground">
                  {totals.completionRate.toFixed(0)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Earnings Chart */}
          <Card className="barbershop-card">
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Evolução dos Ganhos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              {loading ? (
                <div className="flex items-center justify-center h-[200px] sm:h-[280px]">
                  <LoadingSpinner />
                </div>
              ) : earningsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200} className="sm:!h-[280px]">
                  <AreaChart data={earningsData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(value) => `${value}`}
                      width={35}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
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
                <div className="flex items-center justify-center h-[200px] sm:h-[280px] text-sm text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services Breakdown */}
          <Card className="barbershop-card">
            <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Award className="h-4 w-4 text-primary" />
                Top Serviços por Comissão
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              {loading ? (
                <div className="flex items-center justify-center h-[200px] sm:h-[280px]">
                  <LoadingSpinner />
                </div>
              ) : serviceStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={200} className="sm:!h-[280px]">
                  <BarChart data={serviceStats} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      type="number"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickFormatter={(value) => `${value}`}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      width={70}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Comissão']}
                    />
                    <Bar dataKey="commission" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] sm:h-[280px] text-sm text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="barbershop-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Últimos Serviços Realizados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : recentTransactions.length > 0 ? (
              <>
                {/* Mobile View - Cards */}
                <div className="space-y-3 md:hidden">
                  {recentTransactions.map((t) => (
                    <div key={t.id} className="p-3 rounded-lg border bg-card space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">{t.commissionRate}%</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="text-success font-medium">
                          R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm border-t pt-2">
                        <span className="text-muted-foreground">Minha Comissão:</span>
                        <span className="font-bold text-warning">
                          R$ {t.commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View - Table */}
                <div className="hidden md:block overflow-x-auto">
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
                </div>
              </>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <Scissors className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm text-muted-foreground">Nenhum serviço encontrado no período</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default MyEarnings;
