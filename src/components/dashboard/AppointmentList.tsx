import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Calendar, Clock, User, Scissors, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
interface Appointment {
  id: string;
  client_name: string;
  service_name: string;
  appointment_time: string;
  status: "pendente" | "confirmado" | "concluido" | "cancelado";
  staff_id: string;
  barber_name?: string;
}
const AppointmentList = () => {
  const {
    barbershopId
  } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (barbershopId) {
      fetchTodayAppointments();

      // Realtime subscription
      const channel = supabase.channel('dashboard-appointments').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `barbershop_id=eq.${barbershopId}`
      }, () => {
        fetchTodayAppointments();
      }).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [barbershopId]);
  const fetchTodayAppointments = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const {
        data: appointmentsData,
        error
      } = await supabase.from('appointments').select('id, client_name, service_name, appointment_time, status, staff_id').eq('barbershop_id', barbershopId).eq('appointment_date', today).order('appointment_time', {
        ascending: true
      }).limit(5);
      if (error) throw error;

      // Buscar nomes dos barbeiros
      if (appointmentsData && appointmentsData.length > 0) {
        const staffIds = [...new Set(appointmentsData.map(apt => apt.staff_id))];
        const {
          data: staffData
        } = await supabase.from('staff').select('id, user_id').in('id', staffIds);
        if (staffData) {
          const userIds = staffData.map(s => s.user_id);
          const {
            data: profilesData
          } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
          const staffMap = new Map(staffData.map(s => {
            const profile = profilesData?.find(p => p.id === s.user_id);
            return [s.id, profile?.full_name || 'Barbeiro'];
          }));
          const appointmentsWithBarbers = appointmentsData.map(apt => ({
            ...apt,
            barber_name: staffMap.get(apt.staff_id) || 'Barbeiro'
          }));
          setAppointments(appointmentsWithBarbers);
        } else {
          setAppointments(appointmentsData);
        }
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };
  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmado":
        return "bg-success/10 text-success border-success/20";
      case "pendente":
        return "bg-warning/10 text-warning border-warning/20";
      case "concluido":
        return "bg-primary/10 text-primary border-primary/20";
      case "cancelado":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };
  const getStatusText = (status: Appointment["status"]) => {
    const statusMap = {
      pendente: "Pendente",
      confirmado: "Confirmado",
      concluido: "Concluído",
      cancelado: "Cancelado"
    };
    return statusMap[status];
  };
  if (loading) {
    return <Card className="barbershop-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Agendamentos de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </CardContent>
      </Card>;
  }
  return <Card className="barbershop-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Agendamentos de Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Nenhum agendamento para hoje</p>
          </div> : <div className="space-y-4">
            {appointments.map(appointment => <div key={appointment.id} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-smooth cursor-pointer">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{appointment.client_name}</span>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>
                      {getStatusText(appointment.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Scissors className="h-3 w-3" />
                      <span>{appointment.service_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{appointment.appointment_time}</span>
                    </div>
                    {appointment.barber_name && <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{appointment.barber_name}</span>
                      </div>}
                  </div>
                </div>
              </div>)}
          </div>}
        <div className="mt-4 pt-4 border-t border-border">
          <Button variant="outline" className="w-full" onClick={() => navigate('/appointments')}>
            Ver Todos os Agendamentos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>;
};
export default AppointmentList;