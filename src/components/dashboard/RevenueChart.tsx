import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface DayRevenue {
  day: string;
  revenue: number;
}

const RevenueChart = () => {
  const { barbershopId } = useAuth();
  const [revenueData, setRevenueData] = useState<DayRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxRevenue, setMaxRevenue] = useState(0);
  const [totalWeek, setTotalWeek] = useState(0);

  useEffect(() => {
    if (barbershopId) {
      fetchWeekRevenue();
    }
  }, [barbershopId]);

  const fetchWeekRevenue = async () => {
    try {
      setLoading(true);
      
      // Últimos 7 dias
      const days = [];
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = dayNames[date.getDay()];
        
        days.push({ date: dateStr, day: dayName });
      }

      // Buscar receitas de cada dia
      const revenuePromises = days.map(async ({ date, day }) => {
        const { data, error } = await supabase
          .from('transactions')
          .select('amount')
          .eq('barbershop_id', barbershopId)
          .eq('type', 'receita')
          .eq('transaction_date', date);

        if (error) throw error;

        const dayRevenue = data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        return { day, revenue: dayRevenue };
      });

      const results = await Promise.all(revenuePromises);
      
      const max = Math.max(...results.map(d => d.revenue), 100); // Mínimo 100 para evitar divisão por zero
      const total = results.reduce((sum, d) => sum + d.revenue, 0);

      setRevenueData(results);
      setMaxRevenue(max);
      setTotalWeek(total);
    } catch (error) {
      console.error('Erro ao buscar receita da semana:', error);
      toast.error('Erro ao carregar receita da semana');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="barbershop-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Receita da Semana
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="barbershop-card">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Receita da Semana
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="flex items-end justify-between gap-1 sm:space-x-2 h-32 sm:h-40">
          {revenueData.map((data) => {
            const height = (data.revenue / maxRevenue) * 100;
            return (
              <div key={data.day} className="flex flex-col items-center flex-1 min-w-0">
                <div className="w-full flex flex-col items-center">
                  <div
                    className="w-4 sm:w-8 bg-gradient-to-t from-primary to-primary-glow rounded-t transition-all duration-300 hover:from-primary-glow hover:to-primary"
                    style={{ height: `${height}%`, minHeight: '8px' }}
                  />
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">{data.day}</div>
                  <div className="text-[10px] sm:text-xs font-medium text-foreground">
                    <span className="hidden sm:inline">R$ </span>{data.revenue.toFixed(0)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold text-success">
              R$ {totalWeek.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
