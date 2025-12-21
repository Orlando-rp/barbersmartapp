import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UserX, 
  RefreshCw, 
  CheckCircle2, 
  TrendingUp,
  Calendar,
  MessageSquare
} from "lucide-react";
import { format, subDays, subMonths, subYears, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

interface RecoveryStats {
  totalNoShows: number;
  suggestionsSent: number;
  rescheduled: number;
  confirmed: number;
  recoveryRate: number;
  confirmationRate: number;
}

interface DailyRecovery {
  date: string;
  noShows: number;
  recovered: number;
}

interface NoShowRecoveryReportProps {
  period: string;
}

export function NoShowRecoveryReport({ period }: NoShowRecoveryReportProps) {
  const { activeBarbershopIds } = useAuth();
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [dailyData, setDailyData] = useState<DailyRecovery[]>([]);
  const [recentRecoveries, setRecentRecoveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeBarbershopIds.length > 0) {
      loadData();
    }
  }, [activeBarbershopIds, period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return subDays(now, 7);
      case 'year':
        return subYears(now, 1);
      default:
        return subMonths(now, 1);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = getDateRange().toISOString();

      // Fetch all no-show appointments
      const { data: noShowAppointments, error: noShowError } = await supabase
        .from('appointments')
        .select('id, date, time, created_at')
        .in('barbershop_id', activeBarbershopIds)
        .eq('status', 'falta')
        .gte('date', startDate.split('T')[0]);

      if (noShowError) throw noShowError;

      // Fetch reschedule suggestions sent
      const { data: suggestionLogs, error: suggestionError } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .in('barbershop_id', activeBarbershopIds)
        .eq('message_type', 'no_show_reschedule')
        .gte('created_at', startDate);

      if (suggestionError) throw suggestionError;

      // Fetch successful reschedules (pending confirmation)
      const { data: pendingLogs, error: pendingError } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .in('barbershop_id', activeBarbershopIds)
        .eq('message_type', 'reschedule_pending_confirmation')
        .gte('created_at', startDate);

      if (pendingError) throw pendingError;

      // Fetch confirmed reschedules
      const { data: confirmedLogs, error: confirmedError } = await supabase
        .from('whatsapp_logs')
        .select('*, metadata')
        .in('barbershop_id', activeBarbershopIds)
        .in('message_type', ['reschedule_confirmed', 'reschedule_client_confirmed'])
        .gte('created_at', startDate);

      if (confirmedError) throw confirmedError;

      // Calculate stats
      const totalNoShows = noShowAppointments?.length || 0;
      const suggestionsSent = suggestionLogs?.length || 0;
      const rescheduled = pendingLogs?.length || 0;
      const confirmed = confirmedLogs?.length || 0;

      const recoveryRate = suggestionsSent > 0 
        ? (rescheduled / suggestionsSent) * 100 
        : 0;
      
      const confirmationRate = rescheduled > 0 
        ? (confirmed / rescheduled) * 100 
        : 0;

      setStats({
        totalNoShows,
        suggestionsSent,
        rescheduled,
        confirmed,
        recoveryRate,
        confirmationRate,
      });

      // Process daily data
      const dailyMap = new Map<string, { noShows: number; recovered: number }>();
      
      noShowAppointments?.forEach((apt) => {
        const date = apt.date;
        const existing = dailyMap.get(date) || { noShows: 0, recovered: 0 };
        existing.noShows++;
        dailyMap.set(date, existing);
      });

      confirmedLogs?.forEach((log) => {
        const date = format(parseISO(log.created_at), 'yyyy-MM-dd');
        const existing = dailyMap.get(date) || { noShows: 0, recovered: 0 };
        existing.recovered++;
        dailyMap.set(date, existing);
      });

      const sortedDailyData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date: format(parseISO(date), 'dd/MM', { locale: ptBR }),
          noShows: data.noShows,
          recovered: data.recovered,
        }))
        .slice(-14); // Last 14 days

      setDailyData(sortedDailyData);

      // Get recent recoveries with details
      const recentRecoveriesData = confirmedLogs?.slice(0, 5).map((log) => ({
        id: log.id,
        phone: log.phone,
        date: format(parseISO(log.created_at), "dd/MM 'às' HH:mm", { locale: ptBR }),
        newDate: log.metadata?.new_date 
          ? format(parseISO(log.metadata.new_date), 'dd/MM', { locale: ptBR })
          : '-',
        newTime: log.metadata?.new_time || '-',
      })) || [];

      setRecentRecoveries(recentRecoveriesData);

    } catch (error) {
      console.error('Error loading no-show recovery data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const pieData = [
    { name: 'Recuperados', value: stats?.confirmed || 0, color: 'hsl(var(--chart-2))' },
    { name: 'Não Recuperados', value: (stats?.suggestionsSent || 0) - (stats?.confirmed || 0), color: 'hsl(var(--muted))' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="barbershop-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <UserX className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total No-Shows</p>
                <p className="text-2xl font-bold">{stats?.totalNoShows || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="barbershop-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sugestões Enviadas</p>
                <p className="text-2xl font-bold">{stats?.suggestionsSent || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="barbershop-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <RefreshCw className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reagendaram</p>
                <p className="text-2xl font-bold">{stats?.rescheduled || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="barbershop-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Confirmados</p>
                <p className="text-2xl font-bold">{stats?.confirmed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="barbershop-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Taxa de Recuperação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-primary">
                  {stats?.recoveryRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  De {stats?.suggestionsSent} sugestões, {stats?.rescheduled} reagendaram
                </p>
              </div>
              <div className="h-20 w-20">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={35}
                      strokeWidth={0}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="barbershop-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Taxa de Confirmação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-500">
                  {stats?.confirmationRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  De {stats?.rescheduled} reagendamentos, {stats?.confirmed} confirmaram
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Chart */}
      <Card className="barbershop-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium">No-Shows vs Recuperados por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar 
                  dataKey="noShows" 
                  name="No-Shows" 
                  fill="hsl(var(--destructive))" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="recovered" 
                  name="Recuperados" 
                  fill="hsl(var(--chart-2))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Recoveries */}
      {recentRecoveries.length > 0 && (
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recuperações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRecoveries.map((recovery) => (
                <div 
                  key={recovery.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {recovery.phone?.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') || 'Cliente'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reagendou em {recovery.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">
                      {recovery.newDate} às {recovery.newTime}
                    </p>
                    <p className="text-xs text-muted-foreground">Novo horário</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
