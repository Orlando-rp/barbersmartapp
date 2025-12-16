import { useState, useEffect } from "react";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardWidget } from "../DashboardWidget";
import { Progress } from "@/components/ui/progress";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { Sparkline } from "@/components/ui/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const OccupancyWidget = ({
  onRemove
}: {
  onRemove?: () => void;
}) => {
  const { user, activeBarbershopIds } = useAuth();
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [totalSlots, setTotalSlots] = useState(0);
  const [bookedSlots, setBookedSlots] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [weekTrend, setWeekTrend] = useState(0);

  const fetchOccupancy = async () => {
    if (!user || activeBarbershopIds.length === 0) return;
    setIsUpdating(true);
    try {
      const today = startOfDay(new Date()).toISOString();
      const endToday = endOfDay(new Date()).toISOString();

      // Get active staff count
      const { count: staffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .in('barbershop_id', activeBarbershopIds)
        .eq('active', true);

      // Assuming 8 hours of work per day, 30-minute slots
      const slotsPerStaff = 16; // 8 hours / 0.5 hour
      const total = (staffCount || 0) * slotsPerStaff;

      // Get today's appointments
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .in('barbershop_id', activeBarbershopIds)
        .gte('appointment_time', today)
        .lte('appointment_time', endToday)
        .neq('status', 'cancelado');

      const booked = appointmentsCount || 0;
      const rate = total > 0 ? (booked / total) * 100 : 0;

      // Fetch last 7 days occupancy for sparkline
      const last7Days: number[] = [];
      let thisWeekAvg = 0;
      let lastWeekAvg = 0;

      for (let i = 6; i >= 0; i--) {
        const dayStart = startOfDay(subDays(new Date(), i)).toISOString();
        const dayEnd = endOfDay(subDays(new Date(), i)).toISOString();
        
        const { count: dayCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .in('barbershop_id', activeBarbershopIds)
          .gte('appointment_time', dayStart)
          .lte('appointment_time', dayEnd)
          .neq('status', 'cancelado');
        
        const dayRate = total > 0 ? ((dayCount || 0) / total) * 100 : 0;
        last7Days.push(Math.round(dayRate));
        thisWeekAvg += dayRate;
      }
      thisWeekAvg = thisWeekAvg / 7;

      // Get last week average for comparison
      for (let i = 13; i >= 7; i--) {
        const dayStart = startOfDay(subDays(new Date(), i)).toISOString();
        const dayEnd = endOfDay(subDays(new Date(), i)).toISOString();
        
        const { count: dayCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .in('barbershop_id', activeBarbershopIds)
          .gte('appointment_time', dayStart)
          .lte('appointment_time', dayEnd)
          .neq('status', 'cancelado');
        
        const dayRate = total > 0 ? ((dayCount || 0) / total) * 100 : 0;
        lastWeekAvg += dayRate;
      }
      lastWeekAvg = lastWeekAvg / 7;

      const trend = lastWeekAvg > 0 ? ((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100 : 0;

      setTotalSlots(total);
      setBookedSlots(booked);
      setOccupancyRate(rate);
      setSparklineData(last7Days);
      setWeekTrend(trend);
    } catch (error) {
      console.error('Error fetching occupancy:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchOccupancy();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOccupancy, 30000);

    // Real-time subscription
    const channel = supabase.channel('occupancy-updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'appointments'
    }, () => {
      fetchOccupancy();
    }).subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, activeBarbershopIds]);

  const getOccupancyColor = (rate: number) => {
    if (rate >= 70) return "success";
    if (rate >= 40) return "warning";
    return "primary";
  };

  const sparklineColor = getOccupancyColor(occupancyRate);

  return (
    <DashboardWidget 
      title="Ocupação" 
      icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />} 
      onRemove={onRemove} 
      isUpdating={isUpdating}
    >
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-lg sm:text-2xl">{occupancyRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </div>
          {weekTrend !== 0 && (
            <div className="flex items-center gap-1">
              {weekTrend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={`text-xs font-medium ${weekTrend >= 0 ? "text-success" : "text-destructive"}`}>
                {weekTrend >= 0 ? '+' : ''}{weekTrend.toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        <Progress value={occupancyRate} className="h-1.5 sm:h-2" />

        {/* Sparkline - Last 7 days occupancy */}
        {sparklineData.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <Sparkline 
                  data={sparklineData} 
                  color={sparklineColor} 
                  height={32}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Taxa de ocupação dos últimos 7 dias</p>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{bookedSlots} agendamentos</span>
          <span>{totalSlots} slots disponíveis</span>
        </div>
      </div>
    </DashboardWidget>
  );
};
