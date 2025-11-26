import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SalesData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface Props {
  period: string; // 'week' | 'month' | 'year'
}

export const SalesChart = ({ period }: Props) => {
  const { barbershopId } = useAuth();
  const [data, setData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    growth: 0
  });

  useEffect(() => {
    if (barbershopId) {
      fetchSalesData();
    }
  }, [barbershopId, period]);

  const getDaysForPeriod = () => {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    return days;
  };

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const days = getDaysForPeriod();
      const datePoints = [];

      // Gerar array de datas
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        datePoints.push({
          date: date.toISOString().split('T')[0],
          label: format(date, period === 'week' ? 'EEE' : 'dd/MM', { locale: ptBR })
        });
      }

      // Buscar transações do período
      const startDate = subDays(new Date(), days).toISOString().split('T')[0];
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('type, amount, transaction_date')
        .eq('barbershop_id', barbershopId)
        .gte('transaction_date', startDate)
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      // Agrupar por data
      const dataMap = new Map<string, { revenue: number; expenses: number }>();
      
      datePoints.forEach(dp => {
        dataMap.set(dp.date, { revenue: 0, expenses: 0 });
      });

      transactions?.forEach(t => {
        const existing = dataMap.get(t.transaction_date);
        if (existing) {
          if (t.type === 'receita') {
            existing.revenue += Number(t.amount);
          } else {
            existing.expenses += Number(t.amount);
          }
        }
      });

      // Converter para array
      const chartData: SalesData[] = datePoints.map(dp => {
        const values = dataMap.get(dp.date) || { revenue: 0, expenses: 0 };
        return {
          date: dp.label,
          revenue: values.revenue,
          expenses: values.expenses,
          profit: values.revenue - values.expenses
        };
      });

      setData(chartData);

      // Calcular sumário
      const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
      const totalExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0);
      const totalProfit = totalRevenue - totalExpenses;

      // Calcular crescimento comparado ao período anterior
      const midPoint = Math.floor(chartData.length / 2);
      const firstHalfRevenue = chartData.slice(0, midPoint).reduce((sum, d) => sum + d.revenue, 0);
      const secondHalfRevenue = chartData.slice(midPoint).reduce((sum, d) => sum + d.revenue, 0);
      const growth = firstHalfRevenue > 0 
        ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 
        : 0;

      setSummary({
        totalRevenue,
        totalExpenses,
        totalProfit,
        growth: Math.round(growth * 10) / 10
      });

    } catch (error) {
      console.error('Erro ao buscar dados de vendas:', error);
      toast.error('Erro ao carregar relatório de vendas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="barbershop-card">
        <CardHeader>
          <CardTitle>Relatório de Vendas</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="barbershop-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Relatório de Vendas</span>
          <div className="flex items-center gap-2 text-sm">
            {summary.growth >= 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-success">+{summary.growth}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-destructive">{summary.growth}%</span>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Receita Total</p>
            <p className="text-2xl font-bold text-success">
              R$ {summary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Despesas Totais</p>
            <p className="text-2xl font-bold text-destructive">
              R$ {summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Lucro Líquido</p>
            <p className="text-2xl font-bold text-primary">
              R$ {summary.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `R$ ${value}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number) => `R$ ${value.toFixed(2)}`}
            />
            <Legend />
            <Bar dataKey="revenue" name="Receita" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
