import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, UserCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { subDays, subMonths } from "date-fns";

interface ClientMetrics {
  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;
  retentionRate: number;
  topClients: {
    name: string;
    appointmentsCount: number;
    totalSpent: number;
    lastVisit: string;
  }[];
}

interface Props {
  period: string;
}

export const ClientsMetrics = ({ period }: Props) => {
  const { barbershopId } = useAuth();
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      fetchClientMetrics();
    }
  }, [barbershopId, period]);

  const fetchClientMetrics = async () => {
    try {
      setLoading(true);
      
      const startDate = period === 'week' 
        ? subDays(new Date(), 7).toISOString().split('T')[0]
        : period === 'month'
        ? subMonths(new Date(), 1).toISOString().split('T')[0]
        : subMonths(new Date(), 12).toISOString().split('T')[0];

      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Total de clientes
      const { count: totalCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId);

      // Clientes ativos
      const { count: activeCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId)
        .eq('active', true);

      // Novos clientes este mês
      const { count: newClientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId)
        .gte('created_at', firstDayOfMonth);

      // Top clientes (mais agendamentos)
      const { data: appointments } = await supabase
        .from('appointments')
        .select('client_name, service_price, appointment_date')
        .eq('barbershop_id', barbershopId)
        .gte('appointment_date', startDate)
        .in('status', ['confirmado', 'concluido']);

      // Agrupar por cliente
      const clientsMap = new Map<string, { count: number; total: number; lastVisit: string }>();
      
      appointments?.forEach(apt => {
        const existing = clientsMap.get(apt.client_name);
        if (existing) {
          existing.count++;
          existing.total += Number(apt.service_price || 0);
          if (apt.appointment_date > existing.lastVisit) {
            existing.lastVisit = apt.appointment_date;
          }
        } else {
          clientsMap.set(apt.client_name, {
            count: 1,
            total: Number(apt.service_price || 0),
            lastVisit: apt.appointment_date
          });
        }
      });

      const topClients = Array.from(clientsMap.entries())
        .map(([name, data]) => ({
          name,
          appointmentsCount: data.count,
          totalSpent: data.total,
          lastVisit: data.lastVisit
        }))
        .sort((a, b) => b.appointmentsCount - a.appointmentsCount)
        .slice(0, 5);

      // Taxa de retenção (clientes que voltaram no período)
      const clientsWithMultipleVisits = Array.from(clientsMap.values())
        .filter(c => c.count > 1).length;
      const retentionRate = clientsMap.size > 0 
        ? (clientsWithMultipleVisits / clientsMap.size) * 100 
        : 0;

      setMetrics({
        totalClients: totalCount || 0,
        activeClients: activeCount || 0,
        newClientsThisMonth: newClientsCount || 0,
        retentionRate: Math.round(retentionRate * 10) / 10,
        topClients
      });

    } catch (error) {
      console.error('Erro ao buscar métricas de clientes:', error);
      toast.error('Erro ao carregar métricas de clientes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="barbershop-card">
        <CardHeader>
          <CardTitle>Métricas de Clientes</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="barbershop-card">
      <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
        <CardTitle className="text-sm sm:text-base">Métricas de Clientes</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0">
        {/* Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="text-[10px] sm:text-xs">Total</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{metrics?.totalClients}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <UserCheck className="h-3.5 w-3.5" />
              <span className="text-[10px] sm:text-xs">Ativos</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-success">{metrics?.activeClients}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <UserPlus className="h-3.5 w-3.5" />
              <span className="text-[10px] sm:text-xs">Novos</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-primary">{metrics?.newClientsThisMonth}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[10px] sm:text-xs">Retenção</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-warning">{metrics?.retentionRate}%</p>
          </div>
        </div>

        {/* Top Clients */}
        <div className="space-y-2">
          <h3 className="text-xs sm:text-sm font-medium text-foreground">Clientes Frequentes</h3>
          {metrics?.topClients && metrics.topClients.length > 0 ? (
            <>
              {/* Mobile View - Cards */}
              <div className="space-y-2 sm:hidden">
                {metrics.topClients.map((client, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm truncate">{client.name}</span>
                      <Badge variant="outline" className="text-[10px]">{client.appointmentsCount}x</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>R$ {client.totalSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                      <span>{new Date(client.lastVisit).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-center text-xs">Agend.</TableHead>
                      <TableHead className="text-right text-xs">Total</TableHead>
                      <TableHead className="text-right text-xs">Última</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.topClients.map((client, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-sm">{client.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">{client.appointmentsCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-success font-medium text-sm">
                          R$ {client.totalSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {new Date(client.lastVisit).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
              Nenhum dado disponível
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
