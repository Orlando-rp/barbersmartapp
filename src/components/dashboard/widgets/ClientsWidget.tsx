import { useState, useEffect } from "react";
import { Users, UserPlus, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardWidget } from "../DashboardWidget";
import { startOfMonth, subDays, startOfDay, endOfDay } from "date-fns";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";
import { Sparkline } from "@/components/ui/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const ClientsWidget = ({
  onRemove
}: {
  onRemove?: () => void;
}) => {
  const { user } = useAuth();
  const { sharedBarbershopId, loading: loadingBarbershop } = useSharedBarbershopId();
  const [totalClients, setTotalClients] = useState(0);
  const [newClients, setNewClients] = useState(0);
  const [activeClients, setActiveClients] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [weekGrowth, setWeekGrowth] = useState(0);

  const fetchClients = async () => {
    if (!user || !sharedBarbershopId || loadingBarbershop) return;
    setIsUpdating(true);
    try {
      const monthStart = startOfMonth(new Date()).toISOString();
      
      // Buscar clientes da matriz E de todas as unidades filhas
      const { data: childUnits } = await supabase
        .from('barbershops')
        .select('id')
        .eq('parent_id', sharedBarbershopId);
      
      const allBarbershopIds = [sharedBarbershopId, ...(childUnits?.map(u => u.id) || [])];

      // Total clients
      const { count: total } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .in('barbershop_id', allBarbershopIds);

      // Active clients
      const { count: active } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .in('barbershop_id', allBarbershopIds)
        .eq('active', true);

      // New clients this month
      const { count: newMonth } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .in('barbershop_id', allBarbershopIds)
        .gte('created_at', monthStart);

      // Fetch last 7 days new clients for sparkline
      const last7Days: number[] = [];
      let thisWeekTotal = 0;
      let lastWeekTotal = 0;

      for (let i = 6; i >= 0; i--) {
        const dayStart = startOfDay(subDays(new Date(), i)).toISOString();
        const dayEnd = endOfDay(subDays(new Date(), i)).toISOString();
        
        const { count: dayCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .in('barbershop_id', allBarbershopIds)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd);
        
        last7Days.push(dayCount || 0);
        thisWeekTotal += dayCount || 0;
      }

      // Get last week data for comparison
      for (let i = 13; i >= 7; i--) {
        const dayStart = startOfDay(subDays(new Date(), i)).toISOString();
        const dayEnd = endOfDay(subDays(new Date(), i)).toISOString();
        
        const { count: dayCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .in('barbershop_id', allBarbershopIds)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd);
        
        lastWeekTotal += dayCount || 0;
      }

      const growth = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;

      setTotalClients(total || 0);
      setActiveClients(active || 0);
      setNewClients(newMonth || 0);
      setSparklineData(last7Days);
      setWeekGrowth(growth);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (!loadingBarbershop && sharedBarbershopId) {
      fetchClients();
    }

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchClients, 60000);

    // Real-time subscription
    const channel = supabase.channel('clients-updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'clients'
    }, () => {
      fetchClients();
    }).subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, sharedBarbershopId, loadingBarbershop]);

  const sparklineTrend = weekGrowth >= 0 ? "up" : "down";

  return (
    <DashboardWidget 
      title="Clientes" 
      icon={<Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />} 
      onRemove={onRemove} 
      isUpdating={isUpdating}
    >
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Total Ativos</p>
            <p className="font-bold text-lg sm:text-2xl">{activeClients}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <UserPlus className="h-3 w-3 text-success" />
              <span className="text-xs text-muted-foreground">Novos</span>
            </div>
            <p className="font-semibold text-success text-sm">{newClients}</p>
          </div>
        </div>

        {/* Sparkline - Last 7 days new clients */}
        {sparklineData.length > 0 && sparklineData.some(v => v > 0) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <Sparkline 
                  data={sparklineData} 
                  color={sparklineTrend === "up" ? "success" : "primary"} 
                  height={32}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Novos clientes nos últimos 7 dias</p>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
          <span>Total cadastrados: {totalClients}</span>
          {weekGrowth !== 0 && (
            <div className="flex items-center gap-1">
              {weekGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={weekGrowth >= 0 ? "text-success" : "text-destructive"}>
                {weekGrowth >= 0 ? '+' : ''}{weekGrowth.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </DashboardWidget>
  );
};
