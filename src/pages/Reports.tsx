import { useState } from "react";
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
import { SalesChart } from "@/components/reports/SalesChart";
import { ClientsMetrics } from "@/components/reports/ClientsMetrics";
import { ServicesChart } from "@/components/reports/ServicesChart";
import { TeamPerformance } from "@/components/reports/TeamPerformance";
import { Download, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

const Reports = () => {
  const [period, setPeriod] = useState<string>("month");

  const handleExportReport = () => {
    toast.info("Funcionalidade de exportação será implementada em breve");
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Análises e insights do seu negócio</p>
          </div>
          <Button variant="premium" size="lg" onClick={handleExportReport}>
            <Download className="mr-2 h-5 w-5" />
            Exportar Relatório
          </Button>
        </div>

        {/* Filters */}
        <Card className="barbershop-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Última Semana</SelectItem>
                    <SelectItem value="month">Último Mês</SelectItem>
                    <SelectItem value="year">Último Ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                Visualizando dados de {
                  period === 'week' ? 'últimos 7 dias' :
                  period === 'month' ? 'últimos 30 dias' :
                  'último ano'
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        <div className="space-y-6">
          {/* Sales Chart - Full Width */}
          <SalesChart period={period} />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClientsMetrics period={period} />
            <ServicesChart period={period} />
          </div>

          {/* Team Performance - Full Width */}
          <TeamPerformance period={period} />
        </div>
      </div>
    </Layout>
  );
};

export default Reports;
