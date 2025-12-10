import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SalesChart } from "@/components/reports/SalesChart";
import { ClientsMetrics } from "@/components/reports/ClientsMetrics";
import { ServicesChart } from "@/components/reports/ServicesChart";
import { TeamPerformance } from "@/components/reports/TeamPerformance";
import { CommissionReport } from "@/components/reports/CommissionReport";
import { PredictiveAnalytics } from "@/components/reports/PredictiveAnalytics";
import { Download, Calendar as CalendarIcon, FileText, FileSpreadsheet, Wallet, BrainCircuit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { exportReportToPDF, exportReportToExcel } from "@/lib/reportExport";
import { subDays, subMonths, subYears, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

const Reports = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<string>("month");
  const [isExporting, setIsExporting] = useState(false);
  const [barbershopName, setBarbershopName] = useState<string>("");

  useEffect(() => {
    const fetchBarbershopName = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('barbershop_id')
        .eq('id', user.id)
        .single();

      if (profile?.barbershop_id) {
        const { data: barbershop } = await supabase
          .from('barbershops')
          .select('name')
          .eq('id', profile.barbershop_id)
          .single();

        if (barbershop) {
          setBarbershopName(barbershop.name);
        }
      }
    };

    fetchBarbershopName();
  }, [user]);

  const handleExportReport = async (exportFormat: 'pdf' | 'excel') => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    setIsExporting(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('barbershop_id')
        .eq('id', user.id)
        .single();

      if (!profile?.barbershop_id) {
        toast.error("Barbearia não encontrada");
        return;
      }

      const barbershopId = profile.barbershop_id;

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case 'week':
          startDate = subDays(now, 7);
          break;
        case 'year':
          startDate = subYears(now, 1);
          break;
        default:
          startDate = subMonths(now, 1);
      }

      // Fetch all data needed for the report
      const [appointmentsRes, transactionsRes, clientsRes, servicesRes, staffRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*')
          .eq('barbershop_id', barbershopId)
          .gte('appointment_time', startDate.toISOString())
          .order('appointment_time', { ascending: true }),
        supabase
          .from('transactions')
          .select('*')
          .eq('barbershop_id', barbershopId)
          .gte('transaction_date', startDate.toISOString())
          .order('transaction_date', { ascending: true }),
        supabase
          .from('clients')
          .select('*')
          .eq('barbershop_id', barbershopId),
        supabase
          .from('services')
          .select('*')
          .eq('barbershop_id', barbershopId),
        supabase
          .from('staff')
          .select('*, profiles!staff_user_id_fkey(*)')
          .eq('barbershop_id', barbershopId)
          .eq('active', true)
      ]);

      if (appointmentsRes.error || transactionsRes.error || clientsRes.error || servicesRes.error || staffRes.error) {
        throw new Error("Erro ao buscar dados do relatório");
      }

      const appointments = appointmentsRes.data || [];
      const transactions = transactionsRes.data || [];
      const clients = clientsRes.data || [];
      const services = servicesRes.data || [];
      const staff = staffRes.data || [];

      // Process sales data
      const salesByDate = new Map<string, { revenue: number; expenses: number }>();
      transactions.forEach(transaction => {
        const date = format(new Date(transaction.transaction_date), 'dd/MM');
        const existing = salesByDate.get(date) || { revenue: 0, expenses: 0 };
        
        if (transaction.type === 'income') {
          existing.revenue += transaction.amount;
        } else {
          existing.expenses += transaction.amount;
        }
        
        salesByDate.set(date, existing);
      });

      const salesData = Array.from(salesByDate.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
      }));

      const totalRevenue = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      // Process client metrics
      const activeClients = clients.filter(c => c.active).length;
      const newClients = clients.filter(c => {
        const createdDate = new Date(c.created_at);
        return createdDate >= startDate;
      }).length;

      const clientAppointments = new Map<string, { count: number; spent: number; lastVisit: string }>();
      appointments.forEach(apt => {
        if (!apt.client_id) return;
        const existing = clientAppointments.get(apt.client_id) || { count: 0, spent: 0, lastVisit: apt.appointment_time };
        existing.count++;
        existing.spent += apt.service_price || 0;
        if (new Date(apt.appointment_time) > new Date(existing.lastVisit)) {
          existing.lastVisit = apt.appointment_time;
        }
        clientAppointments.set(apt.client_id, existing);
      });

      const retentionRate = clients.length > 0
        ? (Array.from(clientAppointments.values()).filter(c => c.count > 1).length / clients.length) * 100
        : 0;

      const topClients = Array.from(clientAppointments.entries())
        .map(([clientId, data]) => {
          const client = clients.find(c => c.id === clientId);
          return {
            name: client?.name || 'Cliente',
            appointments: data.count,
            totalSpent: data.spent,
            lastVisit: format(new Date(data.lastVisit), "dd/MM/yyyy", { locale: ptBR }),
          };
        })
        .sort((a, b) => b.appointments - a.appointments)
        .slice(0, 5);

      // Process services data
      const serviceStats = new Map<string, { count: number; revenue: number }>();
      appointments.forEach(apt => {
        if (!apt.service_id) return;
        const existing = serviceStats.get(apt.service_id) || { count: 0, revenue: 0 };
        existing.count++;
        existing.revenue += apt.service_price || 0;
        serviceStats.set(apt.service_id, existing);
      });

      const totalAppointments = appointments.length;
      const servicesData = Array.from(serviceStats.entries())
        .map(([serviceId, stats]) => {
          const service = services.find(s => s.id === serviceId);
          return {
            name: service?.name || 'Serviço',
            count: stats.count,
            revenue: stats.revenue,
            percentage: totalAppointments > 0 ? (stats.count / totalAppointments) * 100 : 0,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Process team performance
      const staffStats = new Map<string, { appointments: number; revenue: number; completed: number }>();
      appointments.forEach(apt => {
        const existing = staffStats.get(apt.staff_id) || { appointments: 0, revenue: 0, completed: 0 };
        existing.appointments++;
        existing.revenue += apt.service_price || 0;
        if (apt.status === 'completed') {
          existing.completed++;
        }
        staffStats.set(apt.staff_id, existing);
      });

      const teamPerformance = {
        totalAppointments: appointments.length,
        totalRevenue,
        totalCommissions: staff.reduce((sum, s) => {
          const stats = staffStats.get(s.id);
          return sum + (stats ? stats.revenue * (s.commission_rate / 100) : 0);
        }, 0),
        staff: staff.map(s => {
          const stats = staffStats.get(s.id) || { appointments: 0, revenue: 0, completed: 0 };
          const commission = stats.revenue * (s.commission_rate / 100);
          return {
            name: s.profiles?.full_name || 'Profissional',
            appointments: stats.appointments,
            revenue: stats.revenue,
            avgTicket: stats.appointments > 0 ? stats.revenue / stats.appointments : 0,
            commission,
            completionRate: stats.appointments > 0 ? (stats.completed / stats.appointments) * 100 : 0,
          };
        }).sort((a, b) => b.revenue - a.revenue),
      };

      const reportData = {
        barbershopName: barbershopName || "Barbearia",
        period: period === 'week' ? 'Últimos 7 dias' : period === 'month' ? 'Últimos 30 dias' : 'Último ano',
        salesData,
        salesSummary: {
          totalRevenue,
          totalExpenses,
          totalProfit: totalRevenue - totalExpenses,
          growth: 0, // You can calculate this if you have previous period data
        },
        clientMetrics: {
          totalClients: clients.length,
          activeClients,
          newClients,
          retentionRate,
          topClients,
        },
        servicesData,
        teamPerformance,
      };

      if (exportFormat === 'pdf') {
        exportReportToPDF(reportData);
        toast.success("Relatório exportado em PDF com sucesso!");
      } else {
        exportReportToExcel(reportData);
        toast.success("Relatório exportado em Excel com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      toast.error("Erro ao exportar relatório");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Análises e insights do seu negócio</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="premium" size="sm" disabled={isExporting} className="w-full sm:w-auto h-9">
                <Download className="mr-2 h-4 w-4" />
                <span>{isExporting ? "Exportando..." : "Exportar"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={() => handleExportReport('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                Exportar como PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportReport('excel')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar como Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters */}
        <Card className="barbershop-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-full sm:w-40 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Última Semana</SelectItem>
                    <SelectItem value="month">Último Mês</SelectItem>
                    <SelectItem value="year">Último Ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Visualizando: {
                  period === 'week' ? '7 dias' :
                  period === 'month' ? '30 dias' :
                  '1 ano'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reports Tabs */}
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="bg-muted/50 h-auto flex-wrap w-full grid grid-cols-3 gap-1 p-1">
            <TabsTrigger value="general" className="text-xs sm:text-sm px-2 py-1.5">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="commissions" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <Wallet className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Comissões</span>
            </TabsTrigger>
            <TabsTrigger value="predictive" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
              <BrainCircuit className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Análises</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 sm:space-y-6">
            {/* Sales Chart - Full Width */}
            <SalesChart period={period} />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <ClientsMetrics period={period} />
              <ServicesChart period={period} />
            </div>

            {/* Team Performance - Full Width */}
            <TeamPerformance period={period} />
          </TabsContent>

          <TabsContent value="commissions">
            <CommissionReport period={period} />
          </TabsContent>

          <TabsContent value="predictive">
            <PredictiveAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Reports;
