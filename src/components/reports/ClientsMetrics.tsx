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
      <CardHeader>
        <CardTitle>Métricas de Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics?.totalClients}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCheck className="h-4 w-4" />
              <span className="text-sm">Ativos</span>
            </div>
            <p className="text-2xl font-bold text-success">{metrics?.activeClients}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserPlus className="h-4 w-4" />
              <span className="text-sm">Novos (mês)</span>
            </div>
            <p className="text-2xl font-bold text-primary">{metrics?.newClientsThisMonth}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Retenção</span>
            </div>
            <p className="text-2xl font-bold text-warning">{metrics?.retentionRate}%</p>
          </div>
        </div>

        {/* Top Clients Table */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Clientes Mais Frequentes</h3>
          {metrics?.topClients && metrics.topClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Agendamentos</TableHead>
                  <TableHead className="text-right">Total Gasto</TableHead>
                  <TableHead className="text-right">Última Visita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topClients.map((client, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{client.appointmentsCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-success font-medium">
                      R$ {client.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(client.lastVisit).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum dado disponível para o período selecionado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
