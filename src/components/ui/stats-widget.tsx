import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsWidgetProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
    period?: string;
  };
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export const StatsWidget = ({
  title,
  value,
  change,
  icon,
  trend,
  className
}: StatsWidgetProps) => {
  const getTrendColor = () => {
    if (trend === "up" || change?.type === "increase") return "text-success";
    if (trend === "down" || change?.type === "decrease") return "text-destructive";
    return "text-muted-foreground";
  };

  const getTrendIcon = () => {
    if (trend === "up" || change?.type === "increase") return <TrendingUp className="h-3 w-3" />;
    if (trend === "down" || change?.type === "decrease") return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  return (
    <Card className={cn("barbershop-card interactive-scale", className)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            {change && (
              <div className={cn("flex items-center space-x-1 text-sm", getTrendColor())}>
                {getTrendIcon()}
                <span>{change.value}%</span>
                {change.period && (
                  <span className="text-muted-foreground">vs {change.period}</span>
                )}
              </div>
            )}
          </div>
          {icon && (
            <div className="text-primary">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};