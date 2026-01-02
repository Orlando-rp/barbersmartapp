import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Repeat, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRecurrenceLabel, RecurrenceRule } from '@/lib/recurrenceUtils';

interface RecurrenceBadgeProps {
  recurrenceIndex: number;
  totalInSeries?: number;
  recurrenceRule?: string;
  isRescheduled?: boolean;
  className?: string;
  showTooltip?: boolean;
}

export function RecurrenceBadge({
  recurrenceIndex,
  totalInSeries,
  recurrenceRule,
  isRescheduled,
  className,
  showTooltip = true,
}: RecurrenceBadgeProps) {
  const displayIndex = recurrenceIndex + 1;
  const ruleLabel = recurrenceRule 
    ? getRecurrenceLabel(recurrenceRule as RecurrenceRule) 
    : 'Recorrente';

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 text-xs font-normal',
        isRescheduled 
          ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400'
          : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400',
        className
      )}
    >
      <Repeat className="h-3 w-3" />
      {totalInSeries ? `${displayIndex}/${totalInSeries}` : `#${displayIndex}`}
      {isRescheduled && (
        <Calendar className="h-3 w-3 ml-0.5" />
      )}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            <p className="font-medium">
              Agendamento {displayIndex} de {totalInSeries || '?'} na série
            </p>
            <p className="text-muted-foreground">{ruleLabel}</p>
            {isRescheduled && (
              <p className="text-orange-600">Remarcado individualmente</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
