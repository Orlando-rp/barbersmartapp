import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  Calendar as CalendarIcon,
  Users,
  Percent,
  Download,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  Legend
} from "recharts";

interface StaffCommission {
  staffId: string;
  name: string;
  avatar: string;
  totalRevenue: number;
  commissionRate: number;
  totalCommission: number;
  transactionsCount: number;
  avgCommission: number;
}

interface CommissionTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  staffName: string;
}

interface Props {
  period: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const CommissionReport = ({ period }: Props) => {
  const { barbershopId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staffCommissions, setStaffCommissions] = useState<StaffCommission[]>([]);
  const [transactions, setTransactions] = useState<CommissionTransaction[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [totals, setTotals] = useState({
    totalRevenue: 0,
    totalCommissions: 0,
    avgCommissionRate: 0,
    transactionsCount: 0
  });

  useEffect(() => {
    if (barbershopId) {
      // Update date range based on period
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
    }
  }, [period, barbershopId]);

  useEffect(() => {
    if (barbershopId) {
      fetchCommissionData();
    }
  }, [barbershopId, dateRange, selectedStaff]);

  const fetchCommissionData = async () => {
    try {
      setLoading(true);

      // Fetch staff list
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, user_id, commission_rate')
        .eq('barbershop_id', barbershopId)
        .eq('active', true);

      if (staffError) throw staffError;

      // Fetch profiles for staff names
      const userIds = staffData?.map(s => s.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.id, p]) || []
      );

      const staffListData = staffData?.map(s => ({
        id: s.id,
        name: profilesMap.get(s.user_id)?.full_name || 'Profissional'
      })) || [];
      
      setStaffList(staffListData);

      // Fetch transactions with commission data
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('type', 'receita')
        .gte('transaction_date', dateRange.from.toISOString().split('T')[0])
        .lte('transaction_date', dateRange.to.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false });

      if (selectedStaff !== 'all') {
        query = query.eq('staff_id', selectedStaff);
      }

      const { data: transactionsData, error: transError } = await query;

      if (transError) throw transError;

      // Process transactions
      const staffCommissionsMap = new Map<string, StaffCommission>();

      const processedTransactions: CommissionTransaction[] = (transactionsData || []).map(t => {
        const staffInfo = staffData?.find(s => s.id === t.staff_id);
        const profile = staffInfo ? profilesMap.get(staffInfo.user_id) : null;
        const staffName = profile?.full_name || 'N/A';
        
        // Use stored commission values or calculate from staff rate
        const commissionRate = t.commission_rate || staffInfo?.commission_rate || 0;
        const commissionAmount = t.commission_amount || (t.amount * commissionRate / 100);

        // Aggregate by staff
        if (t.staff_id) {
          const existing = staffCommissionsMap.get(t.staff_id) || {
            staffId: t.staff_id,
            name: staffName,
            avatar: profile?.avatar_url || '',
            totalRevenue: 0,
            commissionRate: commissionRate,
            totalCommission: 0,
            transactionsCount: 0,
            avgCommission: 0
          };

          existing.totalRevenue += t.amount;
          existing.totalCommission += commissionAmount;
          existing.transactionsCount += 1;
          staffCommissionsMap.set(t.staff_id, existing);
        }

        return {
          id: t.id,
          date: t.transaction_date,
          description: t.description || 'Serviço',
          amount: t.amount,
          commissionRate: commissionRate,
          commissionAmount: commissionAmount,
          staffName
        };
      });

      // Calculate averages
      const staffCommissionsArray = Array.from(staffCommissionsMap.values()).map(s => ({
        ...s,
        avgCommission: s.transactionsCount > 0 ? s.totalCommission / s.transactionsCount : 0
      })).sort((a, b) => b.totalCommission - a.totalCommission);

      setStaffCommissions(staffCommissionsArray);
      setTransactions(processedTransactions);

      // Calculate totals
      const totalRevenue = processedTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalCommissions = processedTransactions.reduce((sum, t) => sum + t.commissionAmount, 0);
      const avgCommissionRate = totalRevenue > 0 ? (totalCommissions / totalRevenue) * 100 : 0;

      setTotals({
        totalRevenue,
        totalCommissions,
        avgCommissionRate,
        transactionsCount: processedTransactions.length
      });

    } catch (error) {
      console.error('Erro ao buscar dados de comissão:', error);
      toast.error('Erro ao carregar relatório de comissões');
    } finally {
      setLoading(false);
    }
  };

  const chartData = staffCommissions.map(s => ({
    name: s.name.split(' ')[0],
    receita: s.totalRevenue,
    comissao: s.totalCommission
  }));

  const pieData = staffCommissions.map(s => ({
    name: s.name.split(' ')[0],
    value: s.totalCommission
  }));

  if (loading) {
    return (
      <Card className="barbershop-card">
        <CardHeader>
          <CardTitle>Relatório de Comissões</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="barbershop-card">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos profissionais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos profissionais</SelectItem>
                  {staffList.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, 'dd/MM/yy', { locale: ptBR })} - {format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}
                  <ChevronDown className="h-4 w-4" />
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
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="barbershop-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold text-success">
                  R$ {totals.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="barbershop-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Wallet className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Comissões</p>
                <p className="text-2xl font-bold text-warning">
                  R$ {totals.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="barbershop-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Percent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa Média</p>
                <p className="text-2xl font-bold text-foreground">
                  {totals.avgCommissionRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="barbershop-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transações</p>
                <p className="text-2xl font-bold text-foreground">
                  {totals.transactionsCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle className="text-lg">Receita vs Comissão por Profissional</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                  />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="comissao" name="Comissão" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle className="text-lg">Distribuição de Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Comissão']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff Commissions Table */}
      <Card className="barbershop-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Resumo por Profissional
          </CardTitle>
        </CardHeader>
        <CardContent>
          {staffCommissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-center">Serviços</TableHead>
                  <TableHead className="text-right">Receita Gerada</TableHead>
                  <TableHead className="text-center">Taxa %</TableHead>
                  <TableHead className="text-right">Total Comissão</TableHead>
                  <TableHead className="text-right">Média/Serviço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffCommissions.map((staff) => (
                  <TableRow key={staff.staffId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={staff.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {staff.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{staff.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{staff.transactionsCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      R$ {staff.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{staff.commissionRate}%</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-warning">
                      R$ {staff.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      R$ {staff.avgCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhuma comissão registrada no período</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="barbershop-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Últimas Transações com Comissão
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Taxa</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 10).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(t.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell>{t.staffName}</TableCell>
                    <TableCell className="text-right text-success">
                      R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{t.commissionRate}%</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-warning">
                      R$ {t.commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma transação encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
