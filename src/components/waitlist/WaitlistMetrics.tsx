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
      <h3 className="text-base sm:text-lg font-semibold text-foreground">Métricas de Conversão</h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Conversion Rate */}
        <Card className="barbershop-card">
          <CardContent className="p-3 sm:pt-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 sm:space-y-2 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Taxa de Conversão</p>
                <p className="text-xl sm:text-3xl font-bold text-foreground">{metrics.conversionRate}%</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {metrics.converted}/{metrics.totalProcessed} proc.
                </p>
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-success/10 flex-shrink-0">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
            </div>
            <Progress 
              value={metrics.conversionRate} 
              className="mt-2 sm:mt-3 h-1.5 sm:h-2"
            />
          </CardContent>
        </Card>

        {/* Average Wait Time */}
        <Card className="barbershop-card">
          <CardContent className="p-3 sm:pt-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 sm:space-y-2 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Tempo Médio</p>
                <p className="text-xl sm:text-3xl font-bold text-foreground">{metrics.avgWaitTimeFormatted}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  até notificado
                </p>
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Success Rate */}
        <Card className="barbershop-card">
          <CardContent className="p-3 sm:pt-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 sm:space-y-2 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Taxa de Sucesso</p>
                <p className="text-xl sm:text-3xl font-bold text-foreground">{metrics.overallSuccessRate}%</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {metrics.converted}/{metrics.total} total
                </p>
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
            </div>
            <Progress 
              value={metrics.overallSuccessRate} 
              className="mt-2 sm:mt-3 h-1.5 sm:h-2"
            />
          </CardContent>
        </Card>

        {/* Loss Rate */}
        <Card className="barbershop-card">
          <CardContent className="p-3 sm:pt-4 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 sm:space-y-2 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Taxa de Perda</p>
                <p className="text-xl sm:text-3xl font-bold text-foreground">{metrics.lossRate}%</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {metrics.expired + metrics.cancelled} exp./canc.
                </p>
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10 flex-shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
            </div>
            <Progress 
              value={metrics.lossRate} 
              className="mt-2 sm:mt-3 h-1.5 sm:h-2 [&>div]:bg-destructive"
            />
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card className="barbershop-card">
        <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
          <CardTitle className="text-sm sm:text-base">Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="w-full bg-yellow-500/20 rounded-lg p-2 sm:p-4 text-center">
                <p className="text-lg sm:text-2xl font-bold text-yellow-600">{metrics.waiting}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Aguardando</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="w-full bg-blue-500/20 rounded-lg p-2 sm:p-4 text-center">
                <p className="text-lg sm:text-2xl font-bold text-blue-600">{metrics.notified}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Notificados</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="w-full bg-success/20 rounded-lg p-2 sm:p-4 text-center">
                <p className="text-lg sm:text-2xl font-bold text-success">{metrics.converted}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Convertidos</p>
              </div>
            </div>
          </div>
          
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
            <div className="flex items-center justify-between text-[10px] sm:text-sm gap-2">
              <span className="text-muted-foreground">
                Exp.: <span className="font-medium text-foreground">{metrics.expired}</span>
              </span>
              <span className="text-muted-foreground">
                Canc.: <span className="font-medium text-foreground">{metrics.cancelled}</span>
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
