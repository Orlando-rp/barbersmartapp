import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
interface DashboardWidgetProps {
  title: string;
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-2 sm:pb-4">
        <CardTitle className="font-semibold flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
          {icon}
          <span className="truncate">{title}</span>
          {isUpdating && <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />}
        </CardTitle>
        <div className="flex gap-1 flex-shrink-0">
          {onMaximize && <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={onMaximize}>
              <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>}
          {onRemove && <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={onRemove}>
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>}
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">{children}</CardContent>
    </Card>;
};