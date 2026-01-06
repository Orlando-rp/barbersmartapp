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
  return <Card className={cn("barbershop-card relative h-full flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2.5 sm:p-3 pb-1.5 sm:pb-2 flex-shrink-0">
        <CardTitle className="font-semibold flex items-center gap-1 sm:gap-1.5 text-xs truncate">
          {icon}
          <span className="truncate">{title}</span>
          {isUpdating && <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />}
        </CardTitle>
        <div className="flex gap-0.5 flex-shrink-0">
          {onMaximize && <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" onClick={onMaximize}>
              <Maximize2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Button>}
          {onRemove && <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" onClick={onRemove}>
              <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Button>}
        </div>
      </CardHeader>
      <CardContent className="p-2.5 sm:p-3 pt-0 flex-1 flex flex-col">{children}</CardContent>
    </Card>;
};