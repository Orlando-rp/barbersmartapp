import { useClientAuth } from '@/contexts/ClientAuthContext';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, MapPin, Plus, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, parseISO, isAfter, startOfToday, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function ClientDashboard() {
  const { client, barbershop } = useClientAuth();

  // Fetch upcoming appointments
  const { data: upcomingAppointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ['client-upcoming-appointments', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];

      const today = startOfToday();
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          staff:staff_id(id, user_id, profiles:user_id(full_name, preferred_name, avatar_url)),
          service:service_id(name, duration, price)
        `)
        .eq('client_id', client.id)
        .in('status', ['pendente', 'confirmado'])
        .gte('appointment_date', format(today, 'yyyy-MM-dd'))
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.id,
  });

  // Fetch appointment history count
  const { data: historyCount } = useQuery({
    queryKey: ['client-history-count', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;

      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('status', 'concluido');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!client?.id,
  });

  // Fetch pending reviews
  const { data: pendingReviews } = useQuery({
    queryKey: ['client-pending-reviews', client?.id],
    queryFn: async () => {
      if (!client?.id) return 0;

      // Get completed appointments without reviews
      const { data: completedAppointments, error: apptError } = await supabase
        .from('appointments')
        .select('id')
        .eq('client_id', client.id)
        .eq('status', 'concluido');

      if (apptError) throw apptError;

      const appointmentIds = completedAppointments?.map(a => a.id) || [];
      if (appointmentIds.length === 0) return 0;

      // Get reviews for these appointments
      const { data: reviews, error: reviewError } = await supabase
        .from('reviews')
        .select('appointment_id')
        .in('appointment_id', appointmentIds);

      if (reviewError) throw reviewError;

      const reviewedIds = reviews?.map(r => r.appointment_id) || [];
      return appointmentIds.filter(id => !reviewedIds.includes(id)).length;
    },
    enabled: !!client?.id,
  });

  const nextAppointment = upcomingAppointments?.[0];

  const getTimeUntil = (date: string, time: string) => {
    const appointmentDate = parseISO(`${date}T${time}`);
    const now = new Date();
    const days = differenceInDays(appointmentDate, now);
    const hours = differenceInHours(appointmentDate, now) % 24;

    if (days > 0) {
      return `em ${days} dia${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `em ${hours} hora${hours > 1 ? 's' : ''}`;
    } else {
      return 'em breve';
    }
  };

  const displayName = client?.preferred_name || client?.name?.split(' ')[0] || 'Cliente';

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-bold">Bem-vindo, {displayName}! 👋</h1>
          <p className="text-muted-foreground">
            Seu portal de agendamentos
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/cliente/agendamentos?new=true">
            <Button className="w-full h-auto py-4 flex flex-col gap-2">
              <Plus className="h-5 w-5" />
              <span>Novo Agendamento</span>
            </Button>
          </Link>
          <Link to="/cliente/agendamentos">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
              <History className="h-5 w-5" />
              <span>Meus Agendamentos</span>
            </Button>
          </Link>
        </div>

        {/* Next Appointment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Próximo Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAppointments ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : nextAppointment ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-lg">
                      {nextAppointment.service?.name || nextAppointment.service_name}
                    </p>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                      <User className="h-4 w-4" />
                      <span className="text-sm">
                        {nextAppointment.staff?.profiles?.preferred_name || nextAppointment.staff?.profiles?.full_name || 'Profissional'}
                      </span>
                    </div>
                  </div>
                  <Badge variant={nextAppointment.status === 'confirmado' ? 'default' : 'secondary'}>
                    {nextAppointment.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(parseISO(nextAppointment.appointment_date), "EEE, d 'de' MMM", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{nextAppointment.appointment_time.slice(0, 5)}</span>
                  </div>
                </div>

                <div className="bg-primary/10 rounded-lg px-4 py-3 text-center">
                  <p className="text-sm text-muted-foreground">Seu agendamento é</p>
                  <p className="font-semibold text-primary">
                    {getTimeUntil(nextAppointment.appointment_date, nextAppointment.appointment_time)}
                  </p>
                </div>

                {barbershop?.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{barbershop.address}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">
                  Você não tem agendamentos próximos
                </p>
                <Link to="/cliente/agendamentos?new=true">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Fazer Agendamento
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{historyCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">Visitas realizadas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-500">{pendingReviews ?? 0}</p>
                <p className="text-sm text-muted-foreground">Avaliações pendentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments List */}
        {upcomingAppointments && upcomingAppointments.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Próximos Agendamentos</CardTitle>
              <CardDescription>Seus agendamentos futuros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingAppointments.slice(1).map((apt) => (
                <div 
                  key={apt.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{apt.service?.name || apt.service_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(apt.appointment_date), "d 'de' MMM", { locale: ptBR })} às {apt.appointment_time.slice(0, 5)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {apt.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
