import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardWidget } from "../DashboardWidget";
import { startOfDay, startOfMonth, subMonths, subDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const RevenueWidget = ({
  onRemove
}: {
  onRemove?: () => void;
}) => {
  const { activeBarbershopIds, selectedBarbershopId, barbershops } = useAuth();
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [growth, setGrowth] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sparklineData, setSparklineData] = useState<number[]>([]);

  const isConsolidatedView = barbershops.length > 1 && selectedBarbershopId === null;

  const fetchRevenue = async () => {
    if (activeBarbershopIds.length === 0) return;
    setIsUpdating(true);
    try {
      const today = startOfDay(new Date()).toISOString();
      const monthStart = startOfMonth(new Date()).toISOString();
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
      const lastMonthEnd = startOfMonth(new Date()).toISOString();

      // Today's revenue
      const { data: todayData } = await supabase
        .from('transactions')
        .select('amount')
        .in('barbershop_id', activeBarbershopIds)
        .eq('type', 'receita')
        .gte('transaction_date', today);
      const todayTotal = todayData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // This month's revenue
      const { data: monthData } = await supabase
        .from('transactions')
        .select('amount')
        .in('barbershop_id', activeBarbershopIds)
        .eq('type', 'receita')
        .gte('transaction_date', monthStart);
      const monthTotal = monthData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Last month's revenue for comparison
      const { data: lastMonthData } = await supabase
        .from('transactions')
        .select('amount')
        .in('barbershop_id', activeBarbershopIds)
        .eq('type', 'receita')
        .gte('transaction_date', lastMonthStart)
        .lt('transaction_date', lastMonthEnd);
      const lastMonthTotal = lastMonthData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Fetch last 7 days data for sparkline
      const last7Days: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = startOfDay(subDays(new Date(), i)).toISOString();
        const dayEnd = startOfDay(subDays(new Date(), i - 1)).toISOString();
        
        const { data: dayData } = await supabase
          .from('transactions')
          .select('amount')
          .in('barbershop_id', activeBarbershopIds)
          .eq('type', 'receita')
          .gte('transaction_date', dayStart)
          .lt('transaction_date', i === 0 ? new Date().toISOString() : dayEnd);
        
        const dayTotal = dayData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        last7Days.push(dayTotal);
      }

      const growthPercent = lastMonthTotal > 0 ? (monthTotal - lastMonthTotal) / lastMonthTotal * 100 : 0;
      setTodayRevenue(todayTotal);
      setMonthRevenue(monthTotal);
      setGrowth(growthPercent);
      setSparklineData(last7Days);
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
    const channel = supabase.channel('revenue-updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'transactions'
    }, () => {
      fetchRevenue();
    }).subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [activeBarbershopIds]);

  const title = (
    <div className="flex items-center gap-2 flex-wrap">
      <span>Receita</span>
      {isConsolidatedView && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex items-center gap-1">
          <Building2 className="h-2.5 w-2.5" />
          <span className="hidden sm:inline">{barbershops.length} unidades</span>
          <span className="sm:hidden">{barbershops.length}</span>
        </Badge>
      )}
    </div>
  );

  const sparklineTrend = growth >= 0 ? "up" : "down";

  return (
    <DashboardWidget 
      title={title} 
      icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />} 
      onRemove={onRemove} 
      isUpdating={isUpdating}
    >
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Hoje</p>
            <p className="font-bold text-sm sm:text-lg truncate">
              R$ {todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Este Mês</p>
            <p className="font-bold text-sm sm:text-lg truncate">
              R$ {monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Sparkline - Last 7 days */}
        {sparklineData.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <Sparkline 
                  data={sparklineData} 
                  color={sparklineTrend === "up" ? "success" : sparklineTrend === "down" ? "destructive" : "primary"} 
                  height={36}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Receita dos últimos 7 dias</p>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {growth >= 0 ? (
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
          ) : (
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
          )}
          <span className={`text-xs sm:text-sm font-medium ${growth >= 0 ? "text-success" : "text-destructive"}`}>
            {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">vs mês anterior</span>
        </div>
      </div>
    </DashboardWidget>
  );
};
