import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/ui/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning";
  sparklineData?: number[];
  sparklineTooltip?: string;
}

const StatsCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  variant = "default",
  sparklineData,
  sparklineTooltip = "Últimos 7 dias"
}: StatsCardProps) => {
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

  const sparklineColors: Record<string, "primary" | "success" | "warning"> = {
    default: "primary",
    primary: "primary",
    success: "success",
    warning: "warning",
  };

  return (
    <Card className={cn("transition-smooth hover:shadow-medium", variants[variant])}>
      <CardHeader className="p-2.5 sm:p-3 pb-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-muted-foreground truncate">{title}</div>
          <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0", iconVariants[variant])} />
        </div>
      </CardHeader>
      <CardContent className="p-2.5 sm:p-3 pt-1">
        <div className="text-base sm:text-xl font-bold text-foreground truncate">{value}</div>
        
        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mt-1.5 cursor-help">
                <Sparkline 
                  data={sparklineData} 
                  color={sparklineColors[variant]} 
                  height={24}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{sparklineTooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {change && (
          <div className="flex items-center flex-wrap text-xs mt-1">
            <span
              className={cn(
                "font-medium",
                change.type === "increase" ? "text-success" : "text-destructive"
              )}
            >
              {change.type === "increase" ? "+" : "-"}{Number.isFinite(change.value) ? Math.abs(change.value) : 0}%
            </span>
            <span className="text-muted-foreground ml-1 hidden sm:inline">vs. mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
