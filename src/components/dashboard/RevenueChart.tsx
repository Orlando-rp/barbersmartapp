import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const RevenueChart = () => {
  // Mock data for revenue
  const revenueData = [
    { day: "Seg", revenue: 850 },
    { day: "Ter", revenue: 920 },
    { day: "Qua", revenue: 750 },
    { day: "Qui", revenue: 1100 },
    { day: "Sex", revenue: 1350 },
    { day: "Sáb", revenue: 1800 },
    { day: "Dom", revenue: 650 },
  ];

  const maxRevenue = Math.max(...revenueData.map(d => d.revenue));

  return (
    <Card className="barbershop-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Receita da Semana
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between space-x-2 h-40">
          {revenueData.map((data) => {
            const height = (data.revenue / maxRevenue) * 100;
            return (
              <div key={data.day} className="flex flex-col items-center flex-1">
                <div className="w-full flex flex-col items-center">
                  <div
                    className="w-8 bg-gradient-to-t from-primary to-primary-glow rounded-t transition-all duration-300 hover:from-primary-glow hover:to-primary"
                    style={{ height: `${height}%`, minHeight: '8px' }}
                  />
                  <div className="text-xs text-muted-foreground mt-2">{data.day}</div>
                  <div className="text-xs font-medium text-foreground">
                    R$ {data.revenue}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total da Semana</span>
            <span className="font-semibold text-success">
              R$ {revenueData.reduce((sum, data) => sum + data.revenue, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;