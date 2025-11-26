import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip 
} from "recharts";
import { Scissors, TrendingUp, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";
import { subDays, subMonths } from "date-fns";

interface ServiceData {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface Props {
  period: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--accent))',
];

export const ServicesChart = ({ period }: Props) => {
  const { barbershopId } = useAuth();
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);

  useEffect(() => {
    if (barbershopId) {
      fetchServicesData();
    }
  }, [barbershopId, period]);

  const fetchServicesData = async () => {
    try {
      setLoading(true);
      
      const startDate = period === 'week' 
        ? subDays(new Date(), 7).toISOString().split('T')[0]
        : period === 'month'
        ? subMonths(new Date(), 1).toISOString().split('T')[0]
        : subMonths(new Date(), 12).toISOString().split('T')[0];

      // Buscar agendamentos do período
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('service_name, service_price')
        .eq('barbershop_id', barbershopId)
        .gte('appointment_date', startDate)
        .in('status', ['confirmado', 'concluido']);

      if (error) throw error;

      // Agrupar por serviço
      const servicesMap = new Map<string, { count: number; revenue: number }>();
      
      appointments?.forEach(apt => {
        if (apt.service_name) {
          const existing = servicesMap.get(apt.service_name);
          if (existing) {
            existing.count++;
            existing.revenue += Number(apt.service_price || 0);
          } else {
            servicesMap.set(apt.service_name, {
              count: 1,
              revenue: Number(apt.service_price || 0)
            });
          }
        }
      });

      const total = appointments?.length || 0;
      const revenue = appointments?.reduce((sum, apt) => sum + Number(apt.service_price || 0), 0) || 0;

      // Converter para array e calcular percentuais
      const servicesData: ServiceData[] = Array.from(servicesMap.entries())
        .map(([name, data]) => ({
          name,
          count: data.count,
          revenue: data.revenue,
          percentage: total > 0 ? Math.round((data.count / total) * 100 * 10) / 10 : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setServices(servicesData);
      setTotalRevenue(revenue);
      setTotalAppointments(total);

    } catch (error) {
      console.error('Erro ao buscar dados de serviços:', error);
      toast.error('Erro ao carregar relatório de serviços');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="barbershop-card">
        <CardHeader>
          <CardTitle>Serviços Mais Populares</CardTitle>
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
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-primary" />
          Serviços Mais Populares
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Total de Serviços</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalAppointments}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Receita Total</span>
            </div>
            <p className="text-2xl font-bold text-success">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {services.length > 0 ? (
          <>
            {/* Pie Chart */}
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={services}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {services.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Services List */}
            <div className="space-y-3 mt-6">
              {services.map((service, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <div>
                      <p className="font-medium text-foreground">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.count} agendamentos ({service.percentage}%)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-success">
                      R$ {service.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Média: R$ {(service.revenue / service.count).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Nenhum serviço registrado no período</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
