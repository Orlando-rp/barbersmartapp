import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowLeft, Calendar, DollarSign, TrendingUp, Clock, Star, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, subMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  datetime?: Date | null;
  service_name: string;
  service_price: number;
  status: string;
  staff_name?: string;
}

interface ServiceStats {
  name: string;
  count: number;
  total: number;
}

interface MonthlyStats {
  month: string;
  appointments: number;
  revenue: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ClientHistory = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { allRelatedBarbershopIds, loading: loadingBarbershop } = useSharedBarbershopId();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [averageTicket, setAverageTicket] = useState(0);
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const [visitFrequency, setVisitFrequency] = useState(0);

  useEffect(() => {
    if (clientId && allRelatedBarbershopIds.length > 0 && !loadingBarbershop) {
      loadClientData();
    }
  }, [clientId, allRelatedBarbershopIds, loadingBarbershop]);

  const loadClientData = async () => {
    try {
      setLoading(true);

      // Load client info - clientes são compartilhados entre unidades
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .in('barbershop_id', allRelatedBarbershopIds)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!clientData) {
        toast.error('Cliente não encontrado');
        navigate('/clients');
        return;
      }
      setClient(clientData);

      // Load appointments - buscar de todas as unidades relacionadas
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          service_name,
          service_price,
          status,
          staff_id
        `)
        .eq('client_id', clientId)
        .in('barbershop_id', allRelatedBarbershopIds)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Get unique staff IDs
      const staffIds = [...new Set(appointmentsData.map(a => a.staff_id).filter(Boolean))];
      
      // Load staff information via staff table
      let staffMap = new Map();
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('id, user_id')
          .in('id', staffIds);

        if (staffData && staffData.length > 0) {
          const userIds = staffData.map(s => s.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

          // Create map: staff_id -> full_name
          const profileMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);
          staffData.forEach(staff => {
            staffMap.set(staff.id, profileMap.get(staff.user_id));
          });
        }
      }

      const formattedAppointments = appointmentsData.map(apt => ({
        ...apt,
        staff_name: apt.staff_id ? staffMap.get(apt.staff_id) : undefined,
        // Combine date and time for proper datetime handling
        datetime: apt.appointment_date && apt.appointment_time 
          ? new Date(`${apt.appointment_date}T${apt.appointment_time}`)
          : null,
      }));

      setAppointments(formattedAppointments);

      // Calculate statistics
      calculateStatistics(formattedAppointments, clientData.created_at);
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
      toast.error('Erro ao carregar histórico do cliente');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (appointments: Appointment[], clientCreatedAt: string) => {
    if (appointments.length === 0) return;

    // Total spent and average ticket
    const completed = appointments.filter(a => a.status === 'concluido' && a.datetime);
    const total = completed.reduce((sum, a) => sum + (a.service_price || 0), 0);
    setTotalSpent(total);
    setAverageTicket(completed.length > 0 ? total / completed.length : 0);

    // Last visit
    if (completed.length > 0 && completed[0].datetime) {
      setLastVisit(completed[0].datetime.toISOString());
    }

    // Visit frequency (average days between visits)
    if (completed.length > 1) {
      const dates = completed
        .filter(a => a.datetime)
        .map(a => a.datetime!)
        .sort((a, b) => a.getTime() - b.getTime());
      
      const daysDiffs = [];
      for (let i = 1; i < dates.length; i++) {
        daysDiffs.push(differenceInDays(dates[i], dates[i - 1]));
      }
      const avgDays = daysDiffs.reduce((sum, d) => sum + d, 0) / daysDiffs.length;
      setVisitFrequency(avgDays);
    } else {
      const daysSinceSignup = differenceInDays(new Date(), new Date(clientCreatedAt));
      setVisitFrequency(daysSinceSignup);
    }

    // Service statistics
    const serviceMap = new Map<string, { count: number; total: number }>();
    completed.forEach(apt => {
      const current = serviceMap.get(apt.service_name) || { count: 0, total: 0 };
      serviceMap.set(apt.service_name, {
        count: current.count + 1,
        total: current.total + (apt.service_price || 0),
      });
    });

    const services = Array.from(serviceMap.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        total: stats.total,
      }))
      .sort((a, b) => b.count - a.count);

    setServiceStats(services);

    // Monthly statistics (last 6 months)
    const monthlyMap = new Map<string, { appointments: number; revenue: number }>();
    const sixMonthsAgo = subMonths(new Date(), 6);

    completed
      .filter(a => a.datetime && a.datetime >= sixMonthsAgo)
      .forEach(apt => {
        const month = format(apt.datetime!, 'MMM/yy', { locale: ptBR });
        const current = monthlyMap.get(month) || { appointments: 0, revenue: 0 };
        monthlyMap.set(month, {
          appointments: current.appointments + 1,
          revenue: current.revenue + (apt.service_price || 0),
        });
      });

    // Fill in missing months
    const monthly: MonthlyStats[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const month = format(date, 'MMM/yy', { locale: ptBR });
      const stats = monthlyMap.get(month) || { appointments: 0, revenue: 0 };
      monthly.push({
        month,
        appointments: stats.appointments,
        revenue: stats.revenue,
      });
    }

    setMonthlyStats(monthly);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cliente não encontrado</p>
          <Button onClick={() => navigate('/clients')} className="mt-4">
            Voltar para Clientes
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">{client.name}</h1>
              <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                {client.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="hidden sm:flex items-center gap-1">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Total Gasto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {totalSpent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {appointments.filter(a => a.status === 'concluido').length} serviços concluídos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {averageTicket.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Por visita
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-warning" />
                Última Visita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastVisit ? format(new Date(lastVisit), 'dd/MM/yy') : '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lastVisit && `${differenceInDays(new Date(), new Date(lastVisit))} dias atrás`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-info" />
                Frequência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {visitFrequency > 0 ? Math.round(visitFrequency) : '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dias entre visitas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Frequency Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Frequência de Visitas</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="appointments" 
                      stroke="#8884d8" 
                      name="Agendamentos"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Receita por Mês</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#82ca9d" name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Services Stats Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Favorite Services Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Serviços Favoritos</CardTitle>
              <CardDescription>Distribuição por quantidade de vezes</CardDescription>
            </CardHeader>
            <CardContent>
              {serviceStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={serviceStats}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name} (${entry.count})`}
                    >
                      {serviceStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>

          {/* Services Ranking */}
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Serviços</CardTitle>
              <CardDescription>Ordenado por número de vezes</CardDescription>
            </CardHeader>
            <CardContent>
              {serviceStats.length > 0 ? (
                <div className="space-y-4">
                  {serviceStats.map((service, index) => (
                    <div key={service.name} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {service.count} {service.count === 1 ? 'vez' : 'vezes'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">R$ {service.total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Total gasto</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Agendamentos</CardTitle>
            <CardDescription>Todos os agendamentos do cliente</CardDescription>
          </CardHeader>
          <CardContent>
              {appointments.length > 0 ? (
                <div className="space-y-2">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {apt.datetime ? format(apt.datetime, 'dd') : '-'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {apt.datetime ? format(apt.datetime, 'MMM/yy', { locale: ptBR }) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">{apt.service_name}</p>
                          <div className="flex gap-2 mt-1">
                            <p className="text-sm text-muted-foreground">
                              {apt.datetime ? format(apt.datetime, "HH:mm") : apt.appointment_time}
                            </p>
                            {apt.staff_name && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <p className="text-sm text-muted-foreground">{apt.staff_name}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg">R$ {apt.service_price?.toFixed(2)}</p>
                        <Badge variant={
                          apt.status === 'concluido' ? 'default' :
                          apt.status === 'confirmado' ? 'secondary' :
                          apt.status === 'cancelado' ? 'destructive' : 'outline'
                        }>
                          {apt.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum agendamento encontrado
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ClientHistory;
