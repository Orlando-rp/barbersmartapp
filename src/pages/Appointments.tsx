import Layout from "@/components/layout/Layout";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Search, Clock, User, Scissors, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  client_name: string;
  client_phone: string;
  service_name: string;
  service_price: number;
  staff: {
    name: string;
  } | null;
}

const statusConfig = {
  pendente: { label: "Pendente", variant: "secondary" as const },
  confirmado: { label: "Confirmado", variant: "default" as const },
  concluido: { label: "Concluído", variant: "outline" as const },
  cancelado: { label: "Cancelado", variant: "destructive" as const },
};

const Appointments = () => {
  const { barbershopId } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBarber, setSelectedBarber] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    if (barbershopId) {
      fetchStaff();
      fetchAppointments();
    }
  }, [barbershopId]);

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchTerm, selectedBarber, selectedDate]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name')
        .eq('barbershop_id', barbershopId)
        .eq('active', true);

      if (error) throw error;
      setStaff(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar equipe:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          notes,
          client_name,
          client_phone,
          service_name,
          service_price,
          staff:staff_id (
            name
          )
        `)
        .eq('barbershop_id', barbershopId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      
      // Transform data to handle staff relationship
      const transformedData = (data || []).map(apt => ({
        ...apt,
        staff: Array.isArray(apt.staff) ? apt.staff[0] : apt.staff
      }));
      
      setAppointments(transformedData);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar agendamentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = [...appointments];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.client_phone.includes(searchTerm)
      );
    }

    // Filter by barber
    if (selectedBarber !== "all") {
      filtered = filtered.filter(apt => apt.staff?.name === selectedBarber);
    }

    // Filter by date
    if (selectedDate !== "all") {
      const today = format(new Date(), "yyyy-MM-dd");
      filtered = filtered.filter(apt => {
        if (selectedDate === "today") return apt.appointment_date === today;
        if (selectedDate === "upcoming") return apt.appointment_date >= today;
        return true;
      });
    }

    setFilteredAppointments(filtered);
  };

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'O status do agendamento foi atualizado com sucesso.',
      });

      fetchAppointments();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agendamentos</h1>
            <p className="text-muted-foreground">Gerencie todos os agendamentos da sua barbearia</p>
          </div>
          <AppointmentDialog onSuccess={fetchAppointments}>
            <Button 
              variant="premium" 
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo Agendamento
            </Button>
          </AppointmentDialog>
        </div>

        {/* Filters */}
        <Card className="barbershop-card">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por cliente ou telefone..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os barbeiros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os barbeiros</SelectItem>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas as datas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="upcoming">Próximos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <div className="grid gap-4">
          {loading ? (
            <Card className="barbershop-card">
              <CardContent className="py-8 text-center text-muted-foreground">
                Carregando agendamentos...
              </CardContent>
            </Card>
          ) : filteredAppointments.length === 0 ? (
            <Card className="barbershop-card">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || selectedBarber !== "all" || selectedDate !== "all"
                    ? "Tente ajustar os filtros"
                    : "Crie seu primeiro agendamento para começar"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAppointments.map((appointment) => (
              <Card key={appointment.id} className="barbershop-card hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-lg">{appointment.client_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{appointment.client_phone}</span>
                          </div>
                        </div>
                        <Badge variant={statusConfig[appointment.status as keyof typeof statusConfig].variant}>
                          {statusConfig[appointment.status as keyof typeof statusConfig].label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="font-medium">
                            {format(parseISO(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          <Clock className="h-4 w-4 text-primary ml-2" />
                          <span className="font-medium">{appointment.appointment_time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Scissors className="h-4 w-4 text-primary" />
                          <span>{appointment.service_name}</span>
                          <span className="text-muted-foreground">- R$ {appointment.service_price?.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Barbeiro: <span className="font-medium">{appointment.staff?.name}</span></span>
                      </div>

                      {appointment.notes && (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          {appointment.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col gap-2">
                      <Select
                        value={appointment.status}
                        onValueChange={(value) => updateStatus(appointment.id, value)}
                      >
                        <SelectTrigger className="w-full md:w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="concluido">Concluído</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Appointments;