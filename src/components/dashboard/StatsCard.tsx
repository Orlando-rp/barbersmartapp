import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning";
}

const StatsCard = ({ title, value, change, icon: Icon, variant = "default" }: StatsCardProps) => {
  const variants = {
    default: "bg-card",
    primary: "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20",
    success: "bg-gradient-to-br from-success/10 to-success/5 border-success/20",
    warning: "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20",
  };

  const iconVariants = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
  };

  return (
    <Card className={cn("transition-smooth hover:shadow-medium", variants[variant])}>
      <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</div>
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0", iconVariants[variant])} />
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-1 sm:pt-2">
        <div className="text-lg sm:text-2xl font-bold text-foreground truncate">{value}</div>
        {change && (
          <div className="flex items-center flex-wrap text-xs mt-1 sm:mt-2">
            <span
              className={cn(
                "font-medium",
                change.type === "increase" ? "text-success" : "text-destructive"
              )}
            >
              {change.type === "increase" ? "+" : "-"}{Math.abs(change.value)}%
            </span>
            <span className="text-muted-foreground ml-1 hidden sm:inline">vs. mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;