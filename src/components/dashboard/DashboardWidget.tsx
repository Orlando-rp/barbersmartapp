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
  isUpdating = false,
}: DashboardWidgetProps) => {
  return (
    <Card className={cn("barbershop-card relative", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {icon}
          {title}
          {isUpdating && (
            <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
        </CardTitle>
        <div className="flex gap-1">
          {onMaximize && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onMaximize}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};
