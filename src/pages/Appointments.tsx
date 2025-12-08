import Layout from "@/components/layout/Layout";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Search, Clock, User, Scissors, Phone, Edit } from "lucide-react";
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
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (barbershopId) {
      fetchStaff();
      fetchAppointments();
    }
  }, [barbershopId]);

  // Real-time updates for appointments list
  useEffect(() => {
    if (!barbershopId) return;

    const channel = supabase
      .channel('appointments-list-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          console.log('Appointment list changed:', payload);
          // Recarregar lista quando houver mudanças
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchTerm, selectedBarber, selectedDate]);

  const fetchStaff = async () => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, user_id')
        .eq('barbershop_id', barbershopId)
        .eq('active', true);

      if (staffError) throw staffError;

      if (!staffData || staffData.length === 0) {
        setStaff([]);
        return;
      }

      // Fetch profiles for these staff members
      const userIds = staffData.map(s => s.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine staff with their profiles
      const transformedStaff = staffData.map((member) => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        return {
          id: member.id,
          name: profile?.full_name || 'Nome não disponível'
        };
      });
      
      setStaff(transformedStaff);
    } catch (error: any) {
      console.error('Erro ao carregar equipe:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
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
          staff_id
        `)
        .eq('barbershop_id', barbershopId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([]);
        return;
      }

      // Get unique staff IDs
      const staffIds = [...new Set(appointmentsData.map(a => a.staff_id).filter(Boolean))];

      if (staffIds.length === 0) {
        setAppointments(appointmentsData.map(apt => ({ ...apt, staff: null })));
        return;
      }

      // Fetch staff data
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, user_id')
        .in('id', staffIds);

      if (staffError) throw staffError;

      // Fetch profiles for staff
      const userIds = staffData?.map(s => s.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create staff name lookup
      const staffNameMap = new Map();
      staffData?.forEach(staff => {
        const profile = profilesData?.find(p => p.id === staff.user_id);
        if (profile) {
          staffNameMap.set(staff.id, profile.full_name);
        }
      });

      // Transform appointments with staff names
      const transformedData = appointmentsData.map(apt => ({
        ...apt,
        staff: apt.staff_id ? { name: staffNameMap.get(apt.staff_id) || 'Nome não disponível' } : null
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

  const sendWhatsAppNotification = async (appointment: Appointment, type: 'confirmed' | 'cancelled' | 'completed') => {
    try {
      const { data: whatsappConfig, error: configError } = await supabase
        .from('whatsapp_config')
        .select('config, is_active')
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution')
        .maybeSingle();

      if (configError || !whatsappConfig?.is_active || !whatsappConfig?.config) {
        console.log('WhatsApp não configurado, pulando notificação');
        return;
      }

      const evolutionConfig = whatsappConfig.config as {
        api_url: string;
        api_key: string;
        instance_name: string;
      };

      const formattedDate = format(parseISO(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR });

      const messages = {
        confirmed: `Olá ${appointment.client_name}! ✅

Ótima notícia! Seu agendamento foi confirmado:

📅 Data: ${formattedDate}
⏰ Horário: ${appointment.appointment_time}
✂️ Serviço: ${appointment.service_name}
👤 Profissional: ${appointment.staff?.name || 'Não especificado'}

Aguardamos você! 💈`,
        cancelled: `Olá ${appointment.client_name}! 😔

Infelizmente seu agendamento foi cancelado:

📅 Data: ${formattedDate}
⏰ Horário: ${appointment.appointment_time}
✂️ Serviço: ${appointment.service_name}

Se desejar reagendar, entre em contato conosco. Ficaremos felizes em atendê-lo! 💈`,
        completed: `Olá ${appointment.client_name}! 🎉

Obrigado por nos visitar hoje! Esperamos que tenha gostado do atendimento.

✂️ Serviço: ${appointment.service_name}
👤 Profissional: ${appointment.staff?.name || 'Não especificado'}

⭐ Sua opinião é muito importante para nós!
Que tal deixar uma avaliação sobre o serviço?

Agradecemos a preferência e esperamos vê-lo em breve! 💈`
      };

      await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'sendText',
          apiUrl: evolutionConfig.api_url,
          apiKey: evolutionConfig.api_key,
          instanceName: evolutionConfig.instance_name,
          to: appointment.client_phone,
          message: messages[type],
          barbershopId,
          recipientName: appointment.client_name,
          appointmentId: appointment.id
        }
      });

      const typeLabels = { confirmed: 'confirmação', cancelled: 'cancelamento', completed: 'solicitação de avaliação' };
      console.log(`✅ Notificação de ${typeLabels[type]} enviada`);
    } catch (error) {
      console.error('Erro ao enviar notificação WhatsApp:', error);
    }
  };

  const createRevenueTransaction = async (appointment: Appointment) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('transactions')
        .insert({
          barbershop_id: barbershopId,
          type: 'receita',
          amount: appointment.service_price,
          description: `${appointment.service_name} - ${appointment.client_name}`,
          category: 'servico',
          payment_method: 'dinheiro',
          date: appointment.appointment_date,
          created_by: user?.id
        });

      if (error) throw error;

      console.log('✅ Transação de receita criada automaticamente');
    } catch (error) {
      console.error('Erro ao criar transação:', error);
    }
  };

  const updateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const appointmentToUpdate = appointments.find(apt => apt.id === appointmentId);

      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'O status do agendamento foi atualizado com sucesso.',
      });

      // Send notifications and create transaction based on status change
      if (appointmentToUpdate) {
        if (newStatus === 'confirmado') {
          sendWhatsAppNotification(appointmentToUpdate, 'confirmed');
        } else if (newStatus === 'cancelado') {
          sendWhatsAppNotification(appointmentToUpdate, 'cancelled');
        } else if (newStatus === 'concluido') {
          sendWhatsAppNotification(appointmentToUpdate, 'completed');
          // Criar lançamento de receita automaticamente
          await createRevenueTransaction(appointmentToUpdate);
        }
      }

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
          <AppointmentDialog 
            appointment={editingAppointment} 
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingAppointment(null);
              }
            }}
            onSuccess={() => {
              fetchAppointments();
              setEditingAppointment(null);
              setIsDialogOpen(false);
            }}
          >
            <Button 
              variant="premium" 
              size="lg"
              onClick={() => {
                setEditingAppointment(null);
                setIsDialogOpen(true);
              }}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingAppointment(appointment);
                          setIsDialogOpen(true);
                        }}
                        className="w-full md:w-[140px]"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
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