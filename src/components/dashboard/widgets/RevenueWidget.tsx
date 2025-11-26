import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardWidget } from "../DashboardWidget";
import { startOfDay, startOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const RevenueWidget = ({ onRemove }: { onRemove?: () => void }) => {
  const { user } = useAuth();
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [growth, setGrowth] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchRevenue = async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('barbershop_id')
        .eq('id', user.id)
        .single();

      if (!profile?.barbershop_id) return;

      const today = startOfDay(new Date()).toISOString();
      const monthStart = startOfMonth(new Date()).toISOString();
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
      const lastMonthEnd = startOfMonth(new Date()).toISOString();

      // Today's revenue
      const { data: todayData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('barbershop_id', profile.barbershop_id)
        .eq('type', 'receita')
        .gte('transaction_date', today);

      const todayTotal = todayData?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // This month's revenue
      const { data: monthData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('barbershop_id', profile.barbershop_id)
        .eq('type', 'receita')
        .gte('transaction_date', monthStart);

      const monthTotal = monthData?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // Last month's revenue for comparison
      const { data: lastMonthData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('barbershop_id', profile.barbershop_id)
        .eq('type', 'receita')
        .gte('transaction_date', lastMonthStart)
        .lt('transaction_date', lastMonthEnd);

      const lastMonthTotal = lastMonthData?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const growthPercent = lastMonthTotal > 0 
        ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100 
        : 0;

      setTodayRevenue(todayTotal);
      setMonthRevenue(monthTotal);
      setGrowth(growthPercent);
    } catch (error) {
      console.error('Error fetching revenue:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchRevenue();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRevenue, 30000);

    // Real-time subscription
    const channel = supabase
      .channel('revenue-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        () => {
          fetchRevenue();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <DashboardWidget
      title="Receita"
      icon={<DollarSign className="h-5 w-5 text-primary" />}
      onRemove={onRemove}
      isUpdating={isUpdating}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Hoje</p>
          <p className="text-2xl font-bold">
            R$ {todayRevenue.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Este Mês</p>
          <p className="text-3xl font-bold">
            R$ {monthRevenue.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {growth >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={growth >= 0 ? "text-green-500" : "text-red-500"}>
            {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
          </span>
          <span className="text-sm text-muted-foreground">vs mês anterior</span>
        </div>
      </div>
    </DashboardWidget>
  );
};
