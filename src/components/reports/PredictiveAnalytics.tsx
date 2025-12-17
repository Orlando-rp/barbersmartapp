import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, DollarSign, UserX, Target } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface MonthlyData {
  month: string;
  revenue: number;
  appointments: number;
  noShows: number;
  noShowRate: number;
}

interface Prediction {
  month: string;
  predictedRevenue: number;
  predictedNoShowRate: number;
  confidence: number;
}

export const PredictiveAnalytics = () => {
  const { activeBarbershopIds } = useAuth();
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<MonthlyData[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [insights, setInsights] = useState({
    avgMonthlyRevenue: 0,
    revenueGrowthRate: 0,
    avgNoShowRate: 0,
    noShowTrend: 0,
    bestMonth: "",
    worstMonth: "",
    predictedNextMonthRevenue: 0,
    predictedNextMonthNoShow: 0,
  });

  useEffect(() => {
    if (activeBarbershopIds.length > 0) {
      fetchHistoricalData();
    }
  }, [activeBarbershopIds]);

  const fetchHistoricalData = async () => {
    try {
      setLoading(true);
      const monthlyData: MonthlyData[] = [];

      // Fetch last 12 months of data
      for (let i = 11; i >= 0; i--) {
        const targetMonth = subMonths(new Date(), i);
        const monthStart = startOfMonth(targetMonth);
        const monthEnd = endOfMonth(targetMonth);

        // Fetch revenue
        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount")
          .in("barbershop_id", activeBarbershopIds)
          .eq("type", "receita")
          .gte("transaction_date", format(monthStart, "yyyy-MM-dd"))
          .lte("transaction_date", format(monthEnd, "yyyy-MM-dd"));

        const revenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        // Fetch appointments
        const { data: appointments } = await supabase
          .from("appointments")
          .select("status")
          .in("barbershop_id", activeBarbershopIds)
          .gte("appointment_date", format(monthStart, "yyyy-MM-dd"))
          .lte("appointment_date", format(monthEnd, "yyyy-MM-dd"));

        const totalAppointments = appointments?.length || 0;
        const noShows = appointments?.filter((a) => a.status === "cancelado" || a.status === "nao_compareceu").length || 0;
        const noShowRate = totalAppointments > 0 ? (noShows / totalAppointments) * 100 : 0;

        monthlyData.push({
          month: format(targetMonth, "MMM/yy", { locale: ptBR }),
          revenue,
          appointments: totalAppointments,
          noShows,
          noShowRate: Math.round(noShowRate * 10) / 10,
        });
      }

      setHistoricalData(monthlyData);
      calculatePredictions(monthlyData);
      calculateInsights(monthlyData);
    } catch (error) {
      console.error("Error fetching historical data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePredictions = (data: MonthlyData[]) => {
    if (data.length < 3) return;

    // Simple linear regression for predictions
    const recentData = data.slice(-6); // Last 6 months
    
    // Revenue prediction using weighted moving average
    const revenueWeights = [0.1, 0.1, 0.15, 0.2, 0.2, 0.25];
    const weightedRevenue = recentData.reduce((sum, d, i) => sum + d.revenue * (revenueWeights[i] || 0.15), 0);
    
    // Calculate trend - protect against division by zero
    const firstRevenue = recentData[0]?.revenue || 0;
    const lastRevenue = recentData[recentData.length - 1]?.revenue || 0;
    const revenueGrowth = recentData.length >= 2 && firstRevenue > 0
      ? (lastRevenue - firstRevenue) / firstRevenue 
      : 0;
    
    // No-show rate prediction - protect against division by zero
    const avgNoShowRate = recentData.length > 0 
      ? recentData.reduce((sum, d) => sum + (d.noShowRate || 0), 0) / recentData.length 
      : 0;
    const noShowTrend = recentData.length >= 2
      ? ((recentData[recentData.length - 1]?.noShowRate || 0) - (recentData[0]?.noShowRate || 0)) / 6
      : 0;

    const futurePredictions: Prediction[] = [];
    
    for (let i = 1; i <= 3; i++) {
      const futureMonth = addMonths(new Date(), i);
      const monthlyGrowthRate = revenueGrowth / 6;
      
      futurePredictions.push({
        month: format(futureMonth, "MMM/yy", { locale: ptBR }),
        predictedRevenue: Math.max(0, weightedRevenue * (1 + monthlyGrowthRate * i)),
        predictedNoShowRate: Math.max(0, Math.min(100, avgNoShowRate + noShowTrend * i)),
        confidence: Math.max(50, 90 - (i * 10)), // Confidence decreases with time
      });
    }

    setPredictions(futurePredictions);
  };

  const calculateInsights = (data: MonthlyData[]) => {
    if (data.length === 0) return;

    const totalRevenue = data.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0;

    // Revenue growth rate (comparing last 3 months to previous 3)
    const recent3 = data.slice(-3).reduce((sum, d) => sum + (d.revenue || 0), 0);
    const previous3 = data.slice(-6, -3).reduce((sum, d) => sum + (d.revenue || 0), 0);
    const growthRate = previous3 > 0 ? ((recent3 - previous3) / previous3) * 100 : 0;

    // No-show insights - protect against division by zero
    const avgNoShow = data.length > 0 
      ? data.reduce((sum, d) => sum + (d.noShowRate || 0), 0) / data.length 
      : 0;
    const recentNoShowData = data.slice(-3);
    const previousNoShowData = data.slice(-6, -3);
    const recentNoShow = recentNoShowData.length > 0 
      ? recentNoShowData.reduce((sum, d) => sum + (d.noShowRate || 0), 0) / recentNoShowData.length 
      : 0;
    const previousNoShow = previousNoShowData.length > 0 
      ? previousNoShowData.reduce((sum, d) => sum + (d.noShowRate || 0), 0) / previousNoShowData.length 
      : 0;
    const noShowTrend = recentNoShow - previousNoShow;

    // Best and worst months
    const sortedByRevenue = [...data].sort((a, b) => b.revenue - a.revenue);
    const bestMonth = sortedByRevenue[0]?.month || "";
    const worstMonth = sortedByRevenue[sortedByRevenue.length - 1]?.month || "";

    setInsights({
      avgMonthlyRevenue: avgRevenue,
      revenueGrowthRate: Math.round(growthRate * 10) / 10,
      avgNoShowRate: Math.round(avgNoShow * 10) / 10,
      noShowTrend: Math.round(noShowTrend * 10) / 10,
      bestMonth,
      worstMonth,
      predictedNextMonthRevenue: predictions[0]?.predictedRevenue || avgRevenue * 1.05,
      predictedNextMonthNoShow: predictions[0]?.predictedNoShowRate || avgNoShow,
    });
  };

  useEffect(() => {
    if (predictions.length > 0 && historicalData.length > 0) {
      calculateInsights(historicalData);
    }
  }, [predictions]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const chartData = [
    ...historicalData.map((d) => ({ ...d, type: "histórico" })),
    ...predictions.map((p) => ({
      month: p.month,
      revenue: p.predictedRevenue,
      noShowRate: p.predictedNoShowRate,
      type: "previsão",
    })),
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Insight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Receita Média</p>
                <p className="text-base sm:text-2xl font-bold truncate">
                  R$ {insights.avgMonthlyRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary opacity-80 shrink-0 hidden sm:block" />
            </div>
            <div className="mt-1 sm:mt-2 flex items-center text-xs sm:text-sm flex-wrap">
              {insights.revenueGrowthRate >= 0 ? (
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1 shrink-0" />
              ) : (
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1 shrink-0" />
              )}
              <span className={insights.revenueGrowthRate >= 0 ? "text-green-500" : "text-red-500"}>
                {insights.revenueGrowthRate > 0 ? "+" : ""}
                {insights.revenueGrowthRate}%
              </span>
              <span className="text-muted-foreground ml-1 hidden sm:inline">vs trimestre</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Previsão</p>
                <p className="text-base sm:text-2xl font-bold truncate">
                  R$ {(predictions[0]?.predictedRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </p>
              </div>
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 opacity-80 shrink-0 hidden sm:block" />
            </div>
            <div className="mt-1 sm:mt-2 flex items-center text-xs sm:text-sm text-muted-foreground">
              <span>Confiança: {predictions[0]?.confidence || 0}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">No-Show</p>
                <p className="text-base sm:text-2xl font-bold">{insights.avgNoShowRate}%</p>
              </div>
              <UserX className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 opacity-80 shrink-0 hidden sm:block" />
            </div>
            <div className="mt-1 sm:mt-2 flex items-center text-xs sm:text-sm flex-wrap">
              {insights.noShowTrend <= 0 ? (
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1 shrink-0" />
              ) : (
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1 shrink-0" />
              )}
              <span className={insights.noShowTrend <= 0 ? "text-green-500" : "text-red-500"}>
                {insights.noShowTrend > 0 ? "+" : ""}
                {insights.noShowTrend}%
              </span>
              <span className="text-muted-foreground ml-1 hidden sm:inline">tendência</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Melhor Mês</p>
                <p className="text-base sm:text-2xl font-bold capitalize">{insights.bestMonth}</p>
              </div>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 opacity-80 shrink-0 hidden sm:block" />
            </div>
            <div className="mt-1 sm:mt-2 flex items-center text-xs sm:text-sm text-muted-foreground">
              <span>Pior: {insights.worstMonth}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Prediction Chart */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">Previsão de Receita</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0">
          <div className="h-[200px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10 }}
                  width={35}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-2 sm:p-3 shadow-lg text-xs sm:text-sm">
                          <p className="font-medium">{data.month}</p>
                          <p>
                            {data.type === "previsão" ? "Prev: " : ""}
                            R$ {data.revenue?.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 sm:w-4 h-0.5 bg-primary" />
              <span className="text-muted-foreground">Histórico</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 sm:w-4 h-0.5 bg-primary opacity-50" />
              <span className="text-muted-foreground">Previsão</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No-Show Rate Chart */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">Taxa de No-Show</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0">
          <div className="h-[180px] sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 'auto']}
                  tick={{ fontSize: 10 }}
                  width={35}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs sm:text-sm">
                          <p className="font-medium">{data.month}</p>
                          <p>Taxa: {data.noShowRate?.toFixed(1)}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="noShowRate"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 0, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Predictions - Mobile Cards / Desktop Table */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Previsões Detalhadas</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {predictions.map((pred) => (
              <div key={pred.month} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{pred.month}</span>
                  <span className="text-xs text-muted-foreground">Conf: {pred.confidence}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Receita</p>
                    <p className="font-medium">R$ {pred.predictedRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">No-Show</p>
                    <p className={pred.predictedNoShowRate > 15 ? "text-red-500 font-medium" : "text-green-500 font-medium"}>
                      {pred.predictedNoShowRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${pred.confidence}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-sm">Mês</th>
                  <th className="text-right py-3 px-4 font-medium text-sm">Receita</th>
                  <th className="text-right py-3 px-4 font-medium text-sm">No-Show</th>
                  <th className="text-right py-3 px-4 font-medium text-sm">Confiança</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((pred) => (
                  <tr key={pred.month} className="border-b last:border-0">
                    <td className="py-3 px-4 capitalize text-sm">{pred.month}</td>
                    <td className="py-3 px-4 text-right font-medium text-sm">
                      R$ {pred.predictedRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      <span className={pred.predictedNoShowRate > 15 ? "text-red-500" : "text-green-500"}>
                        {pred.predictedNoShowRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${pred.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{pred.confidence}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
