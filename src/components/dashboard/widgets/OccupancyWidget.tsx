import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardWidget } from "../DashboardWidget";
import { Progress } from "@/components/ui/progress";
import { startOfDay, endOfDay } from "date-fns";

export const OccupancyWidget = ({ onRemove }: { onRemove?: () => void }) => {
  const { user } = useAuth();
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [totalSlots, setTotalSlots] = useState(0);
  const [bookedSlots, setBookedSlots] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOccupancy = async () => {
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
      const endToday = endOfDay(new Date()).toISOString();

      // Get active staff count
      const { count: staffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', profile.barbershop_id)
        .eq('active', true);

      // Assuming 8 hours of work per day, 30-minute slots
      const slotsPerStaff = 16; // 8 hours / 0.5 hour
      const total = (staffCount || 0) * slotsPerStaff;

      // Get today's appointments
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', profile.barbershop_id)
        .gte('appointment_time', today)
        .lte('appointment_time', endToday)
        .neq('status', 'cancelado');

      const booked = appointmentsCount || 0;
      const rate = total > 0 ? (booked / total) * 100 : 0;

      setTotalSlots(total);
      setBookedSlots(booked);
      setOccupancyRate(rate);
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
    const channel = supabase
      .channel('occupancy-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          fetchOccupancy();
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
      title="Taxa de Ocupação"
      icon={<Activity className="h-5 w-5 text-primary" />}
      onRemove={onRemove}
      isUpdating={isUpdating}
    >
      <div className="space-y-4">
        <div>
          <p className="text-3xl font-bold">{occupancyRate.toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground">Hoje</p>
        </div>
        <Progress value={occupancyRate} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{bookedSlots} agendados</span>
          <span>{totalSlots} slots disponíveis</span>
        </div>
      </div>
    </DashboardWidget>
  );
};
