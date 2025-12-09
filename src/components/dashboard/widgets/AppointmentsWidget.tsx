import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardWidget } from "../DashboardWidget";
import { startOfDay, endOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
export const AppointmentsWidget = ({
  onRemove
}: {
  onRemove?: () => void;
}) => {
  const {
    user
  } = useAuth();
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const fetchAppointments = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const {
        data: profile
      } = await supabase.from('profiles').select('barbershop_id').eq('id', user.id).single();
      if (!profile?.barbershop_id) return;
      const today = startOfDay(new Date()).toISOString();
      const endToday = endOfDay(new Date()).toISOString();

      // Count today's appointments
      const {
        count
      } = await supabase.from('appointments').select('*', {
        count: 'exact',
        head: true
      }).eq('barbershop_id', profile.barbershop_id).gte('appointment_time', today).lte('appointment_time', endToday);

      // Get next appointment
      const {
        data: nextApt
      } = await supabase.from('appointments').select('*, profiles!staff_user_id_fkey(full_name)').eq('barbershop_id', profile.barbershop_id).gte('appointment_time', new Date().toISOString()).order('appointment_time', {
        ascending: true
      }).limit(1).single();
      setTodayAppointments(count || 0);
      setNextAppointment(nextApt);
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
  }, [user]);
  return <DashboardWidget title="Agendamentos" icon={<Calendar className="h-5 w-5 text-primary" />} onRemove={onRemove} isUpdating={isUpdating}>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Hoje</p>
          <p className="font-bold text-lg">{todayAppointments}</p>
        </div>
        
        {nextAppointment && <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Próximo Agendamento</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(new Date(nextAppointment.appointment_time), "HH:mm", {
                locale: ptBR
              })}
                </span>
              </div>
              <p className="text-sm">{nextAppointment.client_name}</p>
              <p className="text-sm text-muted-foreground">{nextAppointment.service_name}</p>
              <Badge variant={nextAppointment.status === 'confirmado' ? 'default' : nextAppointment.status === 'pendente' ? 'secondary' : 'destructive'}>
                {nextAppointment.status}
              </Badge>
            </div>
          </div>}
      </div>
    </DashboardWidget>;
};