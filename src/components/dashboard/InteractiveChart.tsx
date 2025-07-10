import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from "lucide-react";

interface ChartData {
  name: string;
  value: number;
  revenue?: number;
  growth?: number;
}

const mockWeeklyData: ChartData[] = [
  { name: "Seg", value: 12, revenue: 450 },
  { name: "Ter", value: 18, revenue: 680 },
  { name: "Qua", value: 15, revenue: 520 },
  { name: "Qui", value: 22, revenue: 890 },
  { name: "Sex", value: 28, revenue: 1120 },
  { name: "Sáb", value: 35, revenue: 1450 },
  { name: "Dom", value: 8, revenue: 280 },
];

const mockMonthlyData: ChartData[] = [
  { name: "Jan", value: 450, revenue: 18500, growth: 12 },
  { name: "Fev", value: 520, revenue: 21200, growth: 15 },
  { name: "Mar", value: 480, revenue: 19800, growth: 8 },
  { name: "Abr", value: 650, revenue: 26500, growth: 22 },
  { name: "Mai", value: 720, revenue: 29800, growth: 18 },
  { name: "Jun", value: 680, revenue: 28200, growth: 16 },
];

const mockServiceData: ChartData[] = [
  { name: "Corte + Barba", value: 45 },
  { name: "Corte Social", value: 32 },
  { name: "Barba", value: 18 },
  { name: "Sobrancelha", value: 5 },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--muted))'];

interface InteractiveChartProps {
  title: string;
  type?: "bar" | "line" | "pie";
  dataType?: "weekly" | "monthly" | "services";
  className?: string;
}

export const InteractiveChart = ({ 
  title, 
  type = "bar", 
  dataType = "weekly",
  className = "" 
}: InteractiveChartProps) => {
  const [chartType, setChartType] = useState(type);
  const [period, setPeriod] = useState(dataType);

  const getData = () => {
    switch (period) {
      case "monthly":
        return mockMonthlyData;
      case "services":
        return mockServiceData;
      default:
        return mockWeeklyData;
    }
  };

  const renderChart = () => {
    const data = getData();
    
    switch (chartType) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="hsl(var(--primary))"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className={`barbershop-card ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <div className="flex space-x-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as "weekly" | "monthly" | "services")}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Semana</SelectItem>
              <SelectItem value="monthly">Mês</SelectItem>
              <SelectItem value="services">Serviços</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex border border-border rounded-md">
            <Button
              variant={chartType === "bar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setChartType("bar")}
              className="rounded-r-none"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === "line" ? "default" : "ghost"}
              size="sm"
              onClick={() => setChartType("line")}
              className="rounded-none border-x"
            >
              <Activity className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === "pie" ? "default" : "ghost"}
              size="sm"
              onClick={() => setChartType("pie")}
              className="rounded-l-none"
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
};