import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
interface DashboardWidgetProps {
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  onRemove?: () => void;
  onMaximize?: () => void;
  className?: string;
  isUpdating?: boolean;
}
export const DashboardWidget = ({
  title,
  icon,
  children,
  onRemove,
  onMaximize,
  className,
  isUpdating = false
}: DashboardWidgetProps) => {
  return <Card className={cn("barbershop-card relative", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 sm:p-2.5 pb-1 sm:pb-1.5">
        <CardTitle className="font-semibold flex items-center gap-1 text-[11px] sm:text-xs truncate">
          {icon}
          <span className="truncate">{title}</span>
          {isUpdating && <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />}
        </CardTitle>
        <div className="flex gap-0.5 flex-shrink-0">
          {onMaximize && <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMaximize}>
              <Maximize2 className="h-2.5 w-2.5" />
            </Button>}
          {onRemove && <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onRemove}>
              <X className="h-2.5 w-2.5" />
            </Button>}
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-2.5 pt-0">{children}</CardContent>
    </Card>;
};