import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Clock, Users, Target, ArrowRight } from "lucide-react";
import { differenceInHours, differenceInDays, parseISO } from "date-fns";

interface WaitlistEntry {
  id: string;
  status: "waiting" | "notified" | "converted" | "expired" | "cancelled";
  created_at: string;
  notified_at: string | null;
}

interface WaitlistMetricsProps {
  entries: WaitlistEntry[];
}

export const WaitlistMetrics = ({ entries }: WaitlistMetricsProps) => {
  const metrics = useMemo(() => {
    const total = entries.length;
    const waiting = entries.filter((e) => e.status === "waiting").length;
    const notified = entries.filter((e) => e.status === "notified").length;
    const converted = entries.filter((e) => e.status === "converted").length;
    const expired = entries.filter((e) => e.status === "expired").length;
    const cancelled = entries.filter((e) => e.status === "cancelled").length;

    // Conversion rate: converted / (notified + converted) * 100
    const totalProcessed = notified + converted;
    const conversionRate = totalProcessed > 0 
      ? Math.round((converted / totalProcessed) * 100) 
      : 0;

    // Overall success rate: converted / total * 100
    const overallSuccessRate = total > 0 
      ? Math.round((converted / total) * 100) 
      : 0;

    // Average wait time (from created_at to notified_at for notified/converted entries)
    const entriesWithNotification = entries.filter(
      (e) => e.notified_at && (e.status === "notified" || e.status === "converted")
    );
    
    let avgWaitTimeHours = 0;
    if (entriesWithNotification.length > 0) {
      const totalHours = entriesWithNotification.reduce((acc, entry) => {
        const created = parseISO(entry.created_at);
        const notified = parseISO(entry.notified_at!);
        return acc + differenceInHours(notified, created);
      }, 0);
      avgWaitTimeHours = Math.round(totalHours / entriesWithNotification.length);
    }

    // Format wait time
    let avgWaitTimeFormatted = "Sem dados";
    if (avgWaitTimeHours > 0) {
      if (avgWaitTimeHours < 24) {
        avgWaitTimeFormatted = `${avgWaitTimeHours}h`;
      } else {
        const days = Math.floor(avgWaitTimeHours / 24);
        const hours = avgWaitTimeHours % 24;
        avgWaitTimeFormatted = hours > 0 ? `${days}d ${hours}h` : `${days}d`;
      }
    }

    // Loss rate (expired + cancelled)
    const lossRate = total > 0 
      ? Math.round(((expired + cancelled) / total) * 100) 
      : 0;

    return {
      total,
      waiting,
      notified,
      converted,
      expired,
      cancelled,
      conversionRate,
      overallSuccessRate,
      avgWaitTimeFormatted,
      lossRate,
      totalProcessed,
    };
  }, [entries]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Métricas de Conversão</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Conversion Rate */}
        <Card className="barbershop-card">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-foreground">{metrics.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.converted} de {metrics.totalProcessed} processados
                </p>
              </div>
              <div className="p-2 rounded-lg bg-success/10">
                <Target className="h-5 w-5 text-success" />
              </div>
            </div>
            <Progress 
              value={metrics.conversionRate} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        {/* Average Wait Time */}
        <Card className="barbershop-card">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Tempo Médio de Espera</p>
                <p className="text-3xl font-bold text-foreground">{metrics.avgWaitTimeFormatted}</p>
                <p className="text-xs text-muted-foreground">
                  até ser notificado
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Success Rate */}
        <Card className="barbershop-card">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Taxa de Sucesso Geral</p>
                <p className="text-3xl font-bold text-foreground">{metrics.overallSuccessRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.converted} de {metrics.total} total
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <Progress 
              value={metrics.overallSuccessRate} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        {/* Loss Rate */}
        <Card className="barbershop-card">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Taxa de Perda</p>
                <p className="text-3xl font-bold text-foreground">{metrics.lossRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.expired + metrics.cancelled} expirados/cancelados
                </p>
              </div>
              <div className="p-2 rounded-lg bg-destructive/10">
                <Users className="h-5 w-5 text-destructive" />
              </div>
            </div>
            <Progress 
              value={metrics.lossRate} 
              className="mt-3 h-2 [&>div]:bg-destructive"
            />
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card className="barbershop-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-col items-center flex-1 min-w-[100px]">
              <div className="w-full bg-yellow-500/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{metrics.waiting}</p>
                <p className="text-xs text-muted-foreground">Aguardando</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col items-center flex-1 min-w-[100px]">
              <div className="w-full bg-blue-500/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{metrics.notified}</p>
                <p className="text-xs text-muted-foreground">Notificados</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col items-center flex-1 min-w-[100px]">
              <div className="w-full bg-success/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-success">{metrics.converted}</p>
                <p className="text-xs text-muted-foreground">Convertidos</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Expirados: <span className="font-medium text-foreground">{metrics.expired}</span>
              </span>
              <span className="text-muted-foreground">
                Cancelados: <span className="font-medium text-foreground">{metrics.cancelled}</span>
              </span>
              <span className="text-muted-foreground">
                Total: <span className="font-medium text-foreground">{metrics.total}</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
