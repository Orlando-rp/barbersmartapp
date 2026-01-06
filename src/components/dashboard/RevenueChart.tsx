import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Building2 } from "lucide-react";
import { toast } from "sonner";

interface DayRevenue {
  day: string;
  revenue: number;
}

const RevenueChart = () => {
  const { activeBarbershopIds, selectedBarbershopId, barbershops } = useAuth();
  const [revenueData, setRevenueData] = useState<DayRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxRevenue, setMaxRevenue] = useState(0);
  const [totalWeek, setTotalWeek] = useState(0);

  const isConsolidatedView = barbershops.length > 1 && selectedBarbershopId === null;

  useEffect(() => {
    if (activeBarbershopIds.length > 0) {
      fetchWeekRevenue();
    } else {
      setLoading(false);
    }
  }, [activeBarbershopIds]);

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

      // Buscar receitas de cada dia - usando range de data para suportar TIMESTAMP
      const revenuePromises = days.map(async ({ date, day }) => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('transactions')
          .select('amount')
          .in('barbershop_id', activeBarbershopIds)
          .eq('type', 'receita')
          .gte('transaction_date', date)
          .lt('transaction_date', nextDateStr);

        if (error) throw error;

        const dayRevenue = data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        return { day, revenue: dayRevenue };
      });

      const results = await Promise.all(revenuePromises);
      
      const max = Math.max(...results.map(d => d.revenue), 100);
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
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Receita da Semana
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4 sm:py-6">
          <LoadingSpinner size="sm" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="barbershop-card">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base flex-wrap">
          <BarChart3 className="h-4 w-4 text-primary" />
          Receita da Semana
          {isConsolidatedView && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex items-center gap-1 ml-auto">
              <Building2 className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">{barbershops.length} unidades</span>
              <span className="sm:hidden">{barbershops.length}</span>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="flex items-end justify-between gap-1 sm:space-x-2 h-24 sm:h-32">
          {revenueData.map((data) => {
            const height = (data.revenue / maxRevenue) * 100;
            return (
              <div key={data.day} className="flex flex-col items-center flex-1 min-w-0">
                <div className="w-full flex flex-col items-center">
                  <div
                    className="w-3 sm:w-6 bg-gradient-to-t from-primary to-primary-glow rounded-t transition-all duration-300 hover:from-primary-glow hover:to-primary"
                    style={{ height: `${height}%`, minHeight: '6px' }}
                  />
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-1">{data.day}</div>
                  <div className="text-[9px] sm:text-[10px] font-medium text-foreground">
                    <span className="hidden sm:inline">R$ </span>{data.revenue.toFixed(0)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border">
          <div className="flex justify-between text-[10px] sm:text-xs">
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
