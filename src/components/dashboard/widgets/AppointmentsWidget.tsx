import { useState, useEffect } from "react";
import { Calendar, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardWidget } from "../DashboardWidget";
import { startOfDay, endOfDay, format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const AppointmentsWidget = ({
  onRemove
}: {
  onRemove?: () => void;
}) => {
  const { user, activeBarbershopIds } = useAuth();
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [weekGrowth, setWeekGrowth] = useState(0);

  const fetchAppointments = async () => {
    if (!user || activeBarbershopIds.length === 0) return;
    setIsUpdating(true);
    try {
      const today = startOfDay(new Date()).toISOString();
      const endToday = endOfDay(new Date()).toISOString();

      // Count today's appointments
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .in('barbershop_id', activeBarbershopIds)
        .gte('appointment_time', today)
        .lte('appointment_time', endToday);

      // Get next appointment
      const { data: nextApt } = await supabase
        .from('appointments')
        .select('*, profiles!staff_user_id_fkey(full_name)')
        .in('barbershop_id', activeBarbershopIds)
        .gte('appointment_time', new Date().toISOString())
        .order('appointment_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      // Fetch last 7 days data for sparkline
      const last7Days: number[] = [];
      let thisWeekTotal = 0;
      let lastWeekTotal = 0;

      for (let i = 6; i >= 0; i--) {
        const dayStart = startOfDay(subDays(new Date(), i)).toISOString();
        const dayEnd = endOfDay(subDays(new Date(), i)).toISOString();
        
        const { count: dayCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .in('barbershop_id', activeBarbershopIds)
          .gte('appointment_time', dayStart)
          .lte('appointment_time', dayEnd);
        
        last7Days.push(dayCount || 0);
        thisWeekTotal += dayCount || 0;
      }

      // Get last week data for comparison
      for (let i = 13; i >= 7; i--) {
        const dayStart = startOfDay(subDays(new Date(), i)).toISOString();
        const dayEnd = endOfDay(subDays(new Date(), i)).toISOString();
        
        const { count: dayCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .in('barbershop_id', activeBarbershopIds)
          .gte('appointment_time', dayStart)
          .lte('appointment_time', dayEnd);
        
        lastWeekTotal += dayCount || 0;
      }

      const growth = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;

      setTodayAppointments(count || 0);
      setNextAppointment(nextApt);
      setSparklineData(last7Days);
      setWeekGrowth(growth);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchAppointments();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAppointments, 30000);

    // Real-time subscription
    const channel = supabase.channel('appointments-updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'appointments'
    }, () => {
      fetchAppointments();
    }).subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, activeBarbershopIds]);

  const sparklineTrend = weekGrowth >= 0 ? "up" : "down";

  return (
    <DashboardWidget 
      title="Agendamentos" 
      icon={<Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />} 
      onRemove={onRemove} 
      isUpdating={isUpdating}
    >
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Hoje</p>
            <p className="font-bold text-lg sm:text-2xl">{todayAppointments}</p>
          </div>
          <div className="flex items-center gap-1">
            {weekGrowth >= 0 ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <span className={`text-xs font-medium ${weekGrowth >= 0 ? "text-success" : "text-destructive"}`}>
              {weekGrowth >= 0 ? '+' : ''}{weekGrowth.toFixed(0)}%
            </span>
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
                  height={32}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Agendamentos dos últimos 7 dias</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {nextAppointment && (
          <div className="border-t border-border pt-2 sm:pt-3">
            <p className="text-xs text-muted-foreground mb-1">Próximo</p>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-xs sm:text-sm">
                {format(new Date(nextAppointment.appointment_time), "HH:mm", { locale: ptBR })}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {nextAppointment.client_name}
              </span>
            </div>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
};
