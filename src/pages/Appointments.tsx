import Layout from "@/components/layout/Layout";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Plus, Search, Clock, User, Scissors, Phone, Edit, MapPin } from "lucide-react";
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
  client_id: string | null;
  client_name: string;
  client_phone: string;
  service_name: string;
  service_price: number;
  staff_id: string | null;
  staff_name: string | null;
  staff_avatar_url: string | null;
  barbershop_id: string;
  barbershop_name: string | null;
  staff: {
    name: string;
    avatar_url: string | null;
  } | null;
}

const statusConfig = {
  pendente: { label: "Pendente", variant: "secondary" as const },
  confirmado: { label: "Confirmado", variant: "default" as const },
  concluido: { label: "Concluído", variant: "outline" as const },
  cancelado: { label: "Cancelado", variant: "destructive" as const },
};

const Appointments = () => {
  const { activeBarbershopIds, barbershops } = useAuth();
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
  
  // Map barbershop IDs to names for quick lookup
  const barbershopNamesMap = new Map(barbershops.map(b => [b.id, b.name]));

  useEffect(() => {
    if (activeBarbershopIds.length > 0) {
      fetchStaff();
      fetchAppointments();
    }
  }, [activeBarbershopIds]);

  // Real-time updates for appointments list
  useEffect(() => {
    if (activeBarbershopIds.length === 0) return;

    const channel = supabase
      .channel('appointments-list-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload: any) => {
          // Only refetch if the change is for one of our barbershops
          if (payload.new?.barbershop_id && activeBarbershopIds.includes(payload.new.barbershop_id)) {
            fetchAppointments();
          } else if (payload.old?.barbershop_id && activeBarbershopIds.includes(payload.old.barbershop_id)) {
            fetchAppointments();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBarbershopIds]);

  useEffect(() => {
    filterAppointments();
  }, [appointments, searchTerm, selectedBarber, selectedDate]);

  const fetchStaff = async () => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, user_id')
        .in('barbershop_id', activeBarbershopIds)
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
          client_id,
          client_name,
          client_phone,
          service_name,
          service_price,
          staff_id,
          barbershop_id
        `)
        .in('barbershop_id', activeBarbershopIds)
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
        setAppointments(appointmentsData.map(apt => ({ 
          ...apt, 
          staff: null, 
          staff_name: null, 
          staff_avatar_url: null,
          barbershop_name: barbershopNamesMap.get(apt.barbershop_id) || null
        })));
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
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create staff lookup with name and avatar
      const staffLookupMap = new Map<string, { name: string; avatar_url: string | null }>();
      staffData?.forEach(staff => {
        const profile = profilesData?.find(p => p.id === staff.user_id);
        if (profile) {
          staffLookupMap.set(staff.id, { 
            name: profile.full_name, 
            avatar_url: profile.avatar_url 
          });
        }
      });

      // Transform appointments with staff names, avatars and barbershop names
      const transformedData = appointmentsData.map(apt => {
        const staffInfo = apt.staff_id ? staffLookupMap.get(apt.staff_id) : null;
        const staffName = staffInfo?.name || 'Nome não disponível';
        const staffAvatarUrl = staffInfo?.avatar_url || null;
        return {
          ...apt,
          staff_name: apt.staff_id ? staffName : null,
          staff_avatar_url: staffAvatarUrl,
          staff: apt.staff_id ? { name: staffName, avatar_url: staffAvatarUrl } : null,
          barbershop_name: barbershopNamesMap.get(apt.barbershop_id) || null
        };
      });
      
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
      // Verificar configurações de notificação da barbearia
      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('settings')
        .eq('id', appointment.barbershop_id)
        .single();

      const notificationConfig = barbershopData?.settings?.notification_config || {};
      const typeMapping = {
        confirmed: 'appointment_confirmed',
        cancelled: 'appointment_cancelled',
        completed: 'appointment_completed'
      };
      
      const barbershopNotificationSetting = notificationConfig[typeMapping[type]];
      if (barbershopNotificationSetting && !barbershopNotificationSetting.enabled) {
        console.log(`Notificações de ${type} desabilitadas nas configurações da barbearia`);
        return;
      }

      // Verificar preferências de notificação do cliente
      if (appointment.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('notification_enabled, notification_types')
          .eq('id', appointment.client_id)
          .maybeSingle();

        if (clientData) {
          // Cliente não quer receber notificações
          if (!clientData.notification_enabled) {
            console.log('Cliente optou por não receber notificações');
            return;
          }

          // Verificar se o tipo específico está habilitado
          const notificationTypes = clientData.notification_types as Record<string, boolean> | null;
          if (notificationTypes && !notificationTypes[typeMapping[type]]) {
            console.log(`Cliente não deseja receber notificações de ${type}`);
            return;
          }
        }
      }

      const { data: whatsappConfig, error: configError } = await supabase
        .from('whatsapp_config')
        .select('config, is_active')
        .eq('barbershop_id', appointment.barbershop_id)
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

⭐ Como foi seu atendimento? Por favor, responda com uma nota de 1 a 5:

1 ⭐ - Muito ruim
2 ⭐⭐ - Ruim  
3 ⭐⭐⭐ - Regular
4 ⭐⭐⭐⭐ - Bom
5 ⭐⭐⭐⭐⭐ - Excelente`
      };

      // Para mensagem de conclusão, iniciar modo de avaliação via chatbot
      if (type === 'completed') {
        await supabase.functions.invoke('whatsapp-chatbot', {
          body: {
            message: 'iniciar_avaliacao',
            from: appointment.client_phone,
            barbershopId: appointment.barbershop_id,
            instanceName: evolutionConfig.instance_name,
            apiUrl: evolutionConfig.api_url,
            apiKey: evolutionConfig.api_key,
            appointmentId: appointment.id,
            reviewMode: true
          }
        });

        // Enviar mensagem de conclusão
        await supabase.functions.invoke('send-whatsapp-evolution', {
          body: {
            action: 'sendText',
            apiUrl: evolutionConfig.api_url,
            apiKey: evolutionConfig.api_key,
            instanceName: evolutionConfig.instance_name,
            to: appointment.client_phone,
            message: messages[type],
            barbershopId: appointment.barbershop_id,
            recipientName: appointment.client_name,
            appointmentId: appointment.id
          }
        });
      } else {
        await supabase.functions.invoke('send-whatsapp-evolution', {
          body: {
            action: 'sendText',
            apiUrl: evolutionConfig.api_url,
            apiKey: evolutionConfig.api_key,
            instanceName: evolutionConfig.instance_name,
            to: appointment.client_phone,
            message: messages[type],
            barbershopId: appointment.barbershop_id,
            recipientName: appointment.client_name,
            appointmentId: appointment.id
          }
        });
      }

      const typeLabels = { confirmed: 'confirmação', cancelled: 'cancelamento', completed: 'solicitação de avaliação' };
      console.log(`✅ Notificação de ${typeLabels[type]} enviada`);
    } catch (error) {
      console.error('Erro ao enviar notificação WhatsApp:', error);
    }
  };

  const createRevenueTransaction = async (appointment: Appointment) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Buscar taxa de comissão do profissional
      let commissionRate = 0;
      if (appointment.staff_id) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('commission_rate')
          .eq('id', appointment.staff_id)
          .single();
        
        if (staffData?.commission_rate) {
          commissionRate = parseFloat(staffData.commission_rate);
        }
      }

      const commissionAmount = (appointment.service_price * commissionRate) / 100;

      const { error } = await supabase
        .from('transactions')
        .insert({
          barbershop_id: appointment.barbershop_id,
          appointment_id: appointment.id,
          type: 'receita',
          amount: appointment.service_price,
          description: `${appointment.service_name} - ${appointment.client_name}`,
          category: 'servico',
          payment_method: 'dinheiro',
          transaction_date: appointment.appointment_date,
          staff_id: appointment.staff_id,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          created_by: user?.id
        });

      if (error) throw error;

      console.log(`✅ Transação criada - Valor: R$ ${appointment.service_price} | Comissão: R$ ${commissionAmount.toFixed(2)}`);
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
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Agendamentos</h1>
            <p className="text-muted-foreground text-sm lg:text-base">Gerencie todos os agendamentos</p>
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
              // Não precisa setar isDialogOpen aqui pois o handleClose já faz isso
            }}
          >
            <Button 
              variant="premium" 
              size="default"
              onClick={() => {
                setEditingAppointment(null);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Agendamento</span>
            </Button>
          </AppointmentDialog>
        </div>

        {/* Filters */}
        <Card className="barbershop-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar cliente..." 
                  className="pl-10 text-sm h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                  <SelectTrigger className="flex-1 sm:w-32 text-xs sm:text-sm h-9">
                    <SelectValue placeholder="Barbeiro" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todos</SelectItem>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.name}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="flex-1 sm:w-32 text-xs sm:text-sm h-9">
                    <SelectValue placeholder="Data" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="upcoming">Próximos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <CardContent className="py-8 sm:py-12 text-center px-4">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm || selectedBarber !== "all" || selectedDate !== "all"
                    ? "Tente ajustar os filtros"
                    : "Crie seu primeiro agendamento para começar"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAppointments.map((appointment) => (
              <Card key={appointment.id} className="barbershop-card hover:shadow-lg transition-shadow">
                <CardContent className="p-3 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    <div className="flex-1 space-y-2 md:space-y-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 md:mb-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-semibold text-base md:text-lg truncate">{appointment.client_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{appointment.client_phone}</span>
                          </div>
                        </div>
                        <Badge 
                          variant={statusConfig[appointment.status as keyof typeof statusConfig].variant}
                          className="text-[10px] md:text-xs flex-shrink-0"
                        >
                          {statusConfig[appointment.status as keyof typeof statusConfig].label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs md:text-sm">
                        <div className="flex items-center gap-1 md:gap-2">
                          <Calendar className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                          <span className="font-medium">
                            {format(parseISO(appointment.appointment_date), "dd/MM/yy", { locale: ptBR })}
                          </span>
                          <Clock className="h-3 w-3 md:h-4 md:w-4 text-primary ml-1" />
                          <span className="font-medium">{appointment.appointment_time}</span>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <Scissors className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                          <span className="truncate max-w-[120px] md:max-w-none">{appointment.service_name}</span>
                          <span className="text-muted-foreground whitespace-nowrap">R$ {appointment.service_price?.toFixed(0)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 md:h-8 md:w-8">
                            <AvatarImage src={appointment.staff?.avatar_url || undefined} alt={appointment.staff?.name || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] md:text-xs">
                              {appointment.staff?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || <User className="h-3 w-3 md:h-4 md:w-4" />}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">
                            <span className="hidden sm:inline">Barbeiro: </span>
                            <span className="font-medium">{appointment.staff?.name || 'Não especificado'}</span>
                          </span>
                        </div>
                        {activeBarbershopIds.length > 1 && appointment.barbershop_name && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="truncate max-w-[150px]">{appointment.barbershop_name}</span>
                          </div>
                        )}
                      </div>

                      {appointment.notes && (
                        <div className="text-xs md:text-sm text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2">
                          {appointment.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingAppointment(appointment);
                          setIsDialogOpen(true);
                        }}
                        className="flex-1 md:flex-none md:w-[130px] text-xs md:text-sm h-8 md:h-9"
                      >
                        <Edit className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                        Editar
                      </Button>
                      <Select
                        value={appointment.status}
                        onValueChange={(value) => updateStatus(appointment.id, value)}
                      >
                        <SelectTrigger className="flex-1 md:flex-none md:w-[130px] text-xs md:text-sm h-8 md:h-9">
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