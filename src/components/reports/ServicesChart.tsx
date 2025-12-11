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
  const { activeBarbershopIds } = useAuth();
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);

  useEffect(() => {
    if (activeBarbershopIds.length > 0) {
      fetchServicesData();
    }
  }, [activeBarbershopIds, period]);

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
        .in('barbershop_id', activeBarbershopIds)
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
      <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Scissors className="h-4 w-4 text-primary" />
          Serviços Populares
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] sm:text-xs">Total</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{totalAppointments}</p>
          </div>
          
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-[10px] sm:text-xs">Receita</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-success truncate">
              R$ {totalRevenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {services.length > 0 ? (
          <>
            {/* Pie Chart */}
            <ResponsiveContainer width="100%" height={180} className="sm:!h-[220px]">
              <PieChart>
                <Pie
                  data={services}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={60}
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
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value} (${props.payload.percentage}%)`,
                    props.payload.name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Services List */}
            <div className="space-y-2 mt-4">
              {services.map((service, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 sm:p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-xs sm:text-sm text-foreground truncate">{service.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {service.count}x ({service.percentage}%)
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-medium text-xs sm:text-sm text-success">
                      R$ {service.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <Scissors className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-xs sm:text-sm text-muted-foreground">Nenhum serviço no período</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
