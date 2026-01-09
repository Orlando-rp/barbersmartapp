import { useState, useEffect } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Plus, X, RefreshCw, Star, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, parseISO, startOfToday, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useSearchParams, Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';

type AppointmentStatus = 'pendente' | 'confirmado' | 'concluido' | 'cancelado' | 'falta';

const statusConfig: Record<AppointmentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  confirmado: { label: 'Confirmado', variant: 'default' },
  concluido: { label: 'Concluído', variant: 'outline' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
  falta: { label: 'Falta', variant: 'destructive' },
};

export default function ClientAppointments() {
  const { client, barbershop } = useClientAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false);

  // Check for ?new=true parameter
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setNewAppointmentOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch upcoming appointments
  const { data: upcomingAppointments, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['client-appointments-upcoming', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const today = format(startOfToday(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          staff:staff_id(id, user_id, profiles:user_id(full_name, preferred_name, avatar_url)),
          service:service_id(name, duration, price)
        `)
        .eq('client_id', client.id)
        .in('status', ['pendente', 'confirmado'])
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.id,
  });

  // Fetch past appointments
  const { data: pastAppointments, isLoading: loadingPast } = useQuery({
    queryKey: ['client-appointments-past', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          staff:staff_id(id, user_id, profiles:user_id(full_name, preferred_name, avatar_url)),
          service:service_id(name, duration, price),
          reviews:reviews(id, rating)
        `)
        .eq('client_id', client.id)
        .in('status', ['concluido', 'cancelado', 'falta'])
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.id,
  });

  // Cancel appointment mutation
  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelado' })
        .eq('id', appointmentId)
        .eq('client_id', client?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-appointments'] });
      toast.success('Agendamento cancelado com sucesso');
      setCancelDialogOpen(false);
      setSelectedAppointment(null);
    },
    onError: () => {
      toast.error('Erro ao cancelar agendamento');
    },
  });

  const handleCancelClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const canCancel = (appointment: any) => {
    const appointmentDate = parseISO(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const now = new Date();
    const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil > 2; // Can cancel if more than 2 hours before
  };

  const renderAppointmentCard = (appointment: any, showActions = true) => {
    const status = statusConfig[appointment.status as AppointmentStatus];
    const hasReview = appointment.reviews?.length > 0;
    const canReview = appointment.status === 'concluido' && !hasReview;

    return (
      <Card key={appointment.id} className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold truncate">
                  {appointment.service?.name || appointment.service_name}
                </h3>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(parseISO(appointment.appointment_date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{appointment.appointment_time.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{appointment.staff?.profiles?.preferred_name || appointment.staff?.profiles?.full_name || 'Profissional'}</span>
                </div>
              </div>

              {hasReview && (
                <div className="flex items-center gap-1 mt-2 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-medium">
                    Avaliado: {appointment.reviews[0].rating}/5
                  </span>
                </div>
              )}
            </div>

            {showActions && (
              <div className="flex flex-col gap-2">
                {['pendente', 'confirmado'].includes(appointment.status) && (
                  <>
                    {canCancel(appointment) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelClick(appointment)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Não é possível cancelar
                      </p>
                    )}
                  </>
                )}

                {canReview && (
                  <Link to={`/cliente/avaliacoes?appointment=${appointment.id}`}>
                    <Button variant="outline" size="sm">
                      <Star className="h-4 w-4 mr-1" />
                      Avaliar
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Meus Agendamentos</h1>
            <p className="text-muted-foreground">Gerencie seus agendamentos</p>
          </div>
          <Button onClick={() => setNewAppointmentOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Agendar</span>
          </Button>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">
              Próximos ({upcomingAppointments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history">
              Histórico ({pastAppointments?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-4">
            {loadingUpcoming ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))
            ) : upcomingAppointments?.length === 0 ? (
              <IllustratedEmptyState
                illustration="calendar"
                title="Nenhum agendamento"
                description="Você não tem agendamentos futuros. Que tal marcar um horário?"
                actionLabel="Fazer Agendamento"
                onAction={() => setNewAppointmentOpen(true)}
              />
            ) : (
              upcomingAppointments?.map((apt) => renderAppointmentCard(apt))
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-4">
            {loadingPast ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))
            ) : pastAppointments?.length === 0 ? (
              <IllustratedEmptyState
                illustration="calendar"
                title="Sem histórico"
                description="Você ainda não tem agendamentos concluídos."
              />
            ) : (
              pastAppointments?.map((apt) => renderAppointmentCard(apt, true))
            )}
          </TabsContent>
        </Tabs>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja cancelar este agendamento?
                {selectedAppointment && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <p className="font-medium">
                      {selectedAppointment.service?.name || selectedAppointment.service_name}
                    </p>
                    <p className="text-sm">
                      {format(parseISO(selectedAppointment.appointment_date), "d 'de' MMMM", { locale: ptBR })} às {selectedAppointment.appointment_time?.slice(0, 5)}
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedAppointment && cancelMutation.mutate(selectedAppointment.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirmar Cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* New Appointment Dialog - Redirect to public booking */}
        <Dialog open={newAppointmentOpen} onOpenChange={setNewAppointmentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>
                Escolha o serviço e horário desejado
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Você será redirecionado para nossa página de agendamento onde poderá escolher o serviço, profissional e horário.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setNewAppointmentOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    // Get the root barbershop ID
                    const barbershopId = client?.barbershop_id;
                    if (barbershopId) {
                      window.open(`/agendar/${barbershopId}`, '_blank');
                    }
                    setNewAppointmentOpen(false);
                  }}
                  className="flex-1"
                >
                  Continuar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
}
