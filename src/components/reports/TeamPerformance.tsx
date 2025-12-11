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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { subDays, subMonths } from "date-fns";

interface StaffPerformance {
  staffId: string;
  name: string;
  avatar: string;
  appointmentsCount: number;
  revenue: number;
  commission: number;
  avgTicket: number;
  completionRate: number;
}

interface Props {
  period: string;
}

export const TeamPerformance = ({ period }: Props) => {
  const { activeBarbershopIds } = useAuth();
  const [performance, setPerformance] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalAppointments: 0,
    totalRevenue: 0,
    totalCommissions: 0
  });

  useEffect(() => {
    if (activeBarbershopIds.length > 0) {
      fetchTeamPerformance();
    }
  }, [activeBarbershopIds, period]);

  const fetchTeamPerformance = async () => {
    try {
      setLoading(true);
      
      const startDate = period === 'week' 
        ? subDays(new Date(), 7).toISOString().split('T')[0]
        : period === 'month'
        ? subMonths(new Date(), 1).toISOString().split('T')[0]
        : subMonths(new Date(), 12).toISOString().split('T')[0];

      // Buscar equipe
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, user_id, commission_rate')
        .in('barbershop_id', activeBarbershopIds)
        .eq('active', true);

      if (staffError) throw staffError;

      if (!staffData || staffData.length === 0) {
        setPerformance([]);
        setLoading(false);
        return;
      }

      // Buscar perfis dos barbeiros
      const userIds = staffData.map(s => s.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (staffError) throw staffError;

      if (!staffData || staffData.length === 0) {
        setPerformance([]);
        setLoading(false);
        return;
      }

      // Buscar agendamentos por staff
      const staffIds = staffData.map(s => s.id);
      
      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('staff_id, status, service_price')
        .in('barbershop_id', activeBarbershopIds)
        .in('staff_id', staffIds)
        .gte('appointment_date', startDate);

      if (aptError) throw aptError;

      // Calcular métricas por barbeiro
      const profilesMap = new Map(
        profilesData?.map(p => [p.id, p]) || []
      );

      const performanceData: StaffPerformance[] = staffData.map(staff => {
        const profile = profilesMap.get(staff.user_id);
        const staffAppointments = appointments?.filter(apt => apt.staff_id === staff.id) || [];
        const completedAppointments = staffAppointments.filter(
          apt => apt.status === 'concluido'
        );
        
        const revenue = completedAppointments.reduce(
          (sum, apt) => sum + Number(apt.service_price || 0), 
          0
        );
        
        const commissionRate = Number(staff.commission_rate || 0) / 100;
        const commission = revenue * commissionRate;
        
        const avgTicket = completedAppointments.length > 0 
          ? revenue / completedAppointments.length 
          : 0;
        
        const completionRate = staffAppointments.length > 0
          ? (completedAppointments.length / staffAppointments.length) * 100
          : 0;

        return {
          staffId: staff.id,
          name: profile?.full_name || 'Barbeiro',
          avatar: profile?.avatar_url || '',
          appointmentsCount: staffAppointments.length,
          revenue,
          commission,
          avgTicket,
          completionRate: Math.round(completionRate)
        };
      }).sort((a, b) => b.revenue - a.revenue);

      setPerformance(performanceData);

      // Calcular totais
      const totalAppointments = performanceData.reduce((sum, p) => sum + p.appointmentsCount, 0);
      const totalRevenue = performanceData.reduce((sum, p) => sum + p.revenue, 0);
      const totalCommissions = performanceData.reduce((sum, p) => sum + p.commission, 0);

      setTotalStats({
        totalAppointments,
        totalRevenue,
        totalCommissions
      });

    } catch (error) {
      console.error('Erro ao buscar performance da equipe:', error);
      toast.error('Erro ao carregar performance da equipe');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="barbershop-card">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Performance da Equipe</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8 sm:py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="barbershop-card">
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Performance da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="text-xs sm:text-sm truncate">Agendamentos</span>
            </div>
            <p className="text-base sm:text-2xl font-bold text-foreground">{totalStats.totalAppointments}</p>
          </div>
          
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="text-xs sm:text-sm truncate">Receita</span>
            </div>
            <p className="text-base sm:text-2xl font-bold text-success truncate">
              R$ {totalStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </p>
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="text-xs sm:text-sm truncate">Comissões</span>
            </div>
            <p className="text-base sm:text-2xl font-bold text-warning truncate">
              R$ {totalStats.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Performance - Mobile Cards / Desktop Table */}
        {performance.length > 0 ? (
          <>
            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {performance.map((staff) => (
                <div key={staff.staffId} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={staff.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {staff.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{staff.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{staff.appointmentsCount} agend.</span>
                        <Badge 
                          variant={staff.completionRate >= 80 ? "default" : "secondary"}
                          className={`text-xs ${staff.completionRate >= 80 ? "bg-success" : ""}`}
                        >
                          {staff.completionRate}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Receita</p>
                      <p className="font-medium text-success">R$ {staff.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ticket</p>
                      <p className="font-medium">R$ {staff.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Comissão</p>
                      <p className="font-bold text-warning">R$ {staff.commission.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop Table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Barbeiro</TableHead>
                  <TableHead className="text-center">Agend.</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Ticket</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-center">Conclusão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.map((staff) => (
                  <TableRow key={staff.staffId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={staff.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {staff.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{staff.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{staff.appointmentsCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      R$ {staff.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      R$ {staff.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right font-medium text-warning">
                      R$ {staff.commission.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={staff.completionRate >= 80 ? "default" : "secondary"}
                        className={staff.completionRate >= 80 ? "bg-success" : ""}
                      >
                        {staff.completionRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">Nenhum barbeiro encontrado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
