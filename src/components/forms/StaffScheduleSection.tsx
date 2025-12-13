import { useMemo, useCallback, memo } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertTriangle, XCircle, Info } from "lucide-react";
import {
  StandardDaySchedule,
  StandardWeeklySchedule,
  DEFAULT_WEEKLY_SCHEDULE,
  DAY_LABELS,
  DAY_NAMES,
  DayName,
} from "@/types/schedule";
import { useScheduleConflictValidation } from "@/hooks/useScheduleConflictValidation";

interface StaffScheduleSectionProps {
  schedule: StandardWeeklySchedule | null;
  onScheduleChange: (schedule: StandardWeeklySchedule | null) => void;
  useCustomSchedule: boolean;
  onUseCustomScheduleChange: (value: boolean) => void;
  barbershopId?: string | null;
}

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

// Native time select component to avoid Radix ref issues in dialogs
const NativeTimeSelect = memo(({ 
  value, 
  onChange, 
  disabled = false,
  includeNone = false,
  hasWarning = false,
}: { 
  value: string; 
  onChange: (value: string) => void; 
  disabled?: boolean;
  includeNone?: boolean;
  hasWarning?: boolean;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className={`h-8 w-full rounded-md border px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
      hasWarning 
        ? "border-warning bg-warning/10 text-warning-foreground" 
        : "border-input bg-background"
    }`}
  >
    {includeNone && <option value="none">Sem intervalo</option>}
    {timeOptions.map((time) => (
      <option key={time} value={time}>
        {time}
      </option>
    ))}
  </select>
));
NativeTimeSelect.displayName = 'NativeTimeSelect';

// Conflict indicator component
const ConflictIndicator = memo(({ 
  conflicts 
}: { 
  conflicts: Array<{ message: string; severity: 'warning' | 'error' }> 
}) => {
  if (conflicts.length === 0) return null;

  const hasError = conflicts.some(c => c.severity === 'error');
  
  return (
    <div className="mt-2 space-y-1">
      {conflicts.map((conflict, idx) => (
        <div 
          key={idx}
          className={`flex items-center gap-2 text-xs p-2 rounded ${
            conflict.severity === 'error' 
              ? 'bg-destructive/10 text-destructive' 
              : 'bg-warning/10 text-warning-foreground'
          }`}
        >
          {conflict.severity === 'error' ? (
            <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          )}
          <span>{conflict.message}</span>
        </div>
      ))}
    </div>
  );
});
ConflictIndicator.displayName = 'ConflictIndicator';

// Business hours hint component
const BusinessHoursHint = memo(({ 
  businessHours 
}: { 
  businessHours: StandardDaySchedule | null 
}) => {
  if (!businessHours) return null;

  if (!businessHours.enabled) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <Info className="h-3 w-3" />
        <span>Barbearia fechada</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
      <Info className="h-3 w-3" />
      <span>Barbearia: {businessHours.start} - {businessHours.end}</span>
    </div>
  );
});
BusinessHoursHint.displayName = 'BusinessHoursHint';

// Isolated day row component to prevent cascading re-renders
interface DayScheduleRowProps {
  day: DayName;
  daySchedule: StandardDaySchedule;
  onUpdate: (day: DayName, field: keyof StandardDaySchedule, value: any) => void;
  conflicts?: Array<{ message: string; severity: 'warning' | 'error' }>;
  businessHours?: StandardDaySchedule | null;
}

const DayScheduleRow = memo(({ 
  day, 
  daySchedule, 
  onUpdate, 
  conflicts = [],
  businessHours,
}: DayScheduleRowProps) => {
  const handleEnabledChange = useCallback((checked: boolean) => {
    onUpdate(day, "enabled", checked);
  }, [day, onUpdate]);

  const handleStartChange = useCallback((value: string) => {
    onUpdate(day, "start", value);
  }, [day, onUpdate]);

  const handleEndChange = useCallback((value: string) => {
    onUpdate(day, "end", value);
  }, [day, onUpdate]);

  const handleBreakStartChange = useCallback((value: string) => {
    onUpdate(day, "break_start", value === "none" ? null : value);
  }, [day, onUpdate]);

  const handleBreakEndChange = useCallback((value: string) => {
    onUpdate(day, "break_end", value === "none" ? null : value);
  }, [day, onUpdate]);

  const hasConflict = conflicts.length > 0;
  const hasError = conflicts.some(c => c.severity === 'error');

  return (
    <div
      className={`p-3 rounded-lg border ${
        hasError 
          ? "bg-destructive/5 border-destructive/30" 
          : hasConflict 
            ? "bg-warning/5 border-warning/30" 
            : daySchedule.enabled 
              ? "bg-background" 
              : "bg-muted/50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={daySchedule.enabled}
            onCheckedChange={handleEnabledChange}
          />
          <span className={`font-medium ${!daySchedule.enabled && "text-muted-foreground"}`}>
            {DAY_LABELS[day]}
          </span>
          {hasConflict && (
            <Badge variant={hasError ? "destructive" : "outline"} className="text-xs">
              {hasError ? "Conflito" : "Aviso"}
            </Badge>
          )}
        </div>
        <BusinessHoursHint businessHours={businessHours} />
      </div>

      {daySchedule.enabled && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <div>
              <Label className="text-xs text-muted-foreground">Entrada</Label>
              <NativeTimeSelect
                value={daySchedule.start}
                onChange={handleStartChange}
                hasWarning={conflicts.some(c => c.message.includes('Entrada'))}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Saída</Label>
              <NativeTimeSelect
                value={daySchedule.end}
                onChange={handleEndChange}
                hasWarning={conflicts.some(c => c.message.includes('Saída'))}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Início Intervalo</Label>
              <NativeTimeSelect
                value={daySchedule.break_start || "none"}
                onChange={handleBreakStartChange}
                includeNone
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fim Intervalo</Label>
              <NativeTimeSelect
                value={daySchedule.break_end || "none"}
                onChange={handleBreakEndChange}
                disabled={!daySchedule.break_start}
                includeNone
              />
            </div>
          </div>
          <ConflictIndicator conflicts={conflicts} />
        </>
      )}
    </div>
  );
});
DayScheduleRow.displayName = 'DayScheduleRow';

export const StaffScheduleSection = ({
  schedule,
  onScheduleChange,
  useCustomSchedule,
  onUseCustomScheduleChange,
  barbershopId,
}: StaffScheduleSectionProps) => {
  // Memoized current schedule to ensure stability
  const currentSchedule = useMemo(() => {
    if (!schedule) return DEFAULT_WEEKLY_SCHEDULE;
    
    return {
      monday: schedule.monday || DEFAULT_WEEKLY_SCHEDULE.monday,
      tuesday: schedule.tuesday || DEFAULT_WEEKLY_SCHEDULE.tuesday,
      wednesday: schedule.wednesday || DEFAULT_WEEKLY_SCHEDULE.wednesday,
      thursday: schedule.thursday || DEFAULT_WEEKLY_SCHEDULE.thursday,
      friday: schedule.friday || DEFAULT_WEEKLY_SCHEDULE.friday,
      saturday: schedule.saturday || DEFAULT_WEEKLY_SCHEDULE.saturday,
      sunday: schedule.sunday || DEFAULT_WEEKLY_SCHEDULE.sunday,
    };
  }, [schedule]);

  // Use conflict validation hook
  const { 
    getConflictsForDay, 
    getBusinessHoursForDay,
    hasConflicts,
    errorCount,
    warningCount,
  } = useScheduleConflictValidation(
    barbershopId || null, 
    useCustomSchedule ? currentSchedule : null
  );

  const handleToggleCustom = useCallback((checked: boolean) => {
    onUseCustomScheduleChange(checked);
    if (checked && !schedule) {
      onScheduleChange({ ...DEFAULT_WEEKLY_SCHEDULE });
    } else if (!checked) {
      onScheduleChange(null);
    }
  }, [onUseCustomScheduleChange, schedule, onScheduleChange]);

  const updateDaySchedule = useCallback((
    day: DayName, 
    field: keyof StandardDaySchedule, 
    value: any
  ) => {
    const daySchedule = currentSchedule[day] || DEFAULT_WEEKLY_SCHEDULE[day];
    const newSchedule = {
      ...currentSchedule,
      [day]: {
        ...daySchedule,
        [field]: value,
      },
    };
    onScheduleChange(newSchedule);
  }, [currentSchedule, onScheduleChange]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Horários de Trabalho Individual
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="useCustomSchedule" className="text-sm text-muted-foreground">
              Usar horários personalizados
            </Label>
            <Switch
              id="useCustomSchedule"
              checked={useCustomSchedule}
              onCheckedChange={handleToggleCustom}
            />
          </div>
        </div>
        {!useCustomSchedule && (
          <p className="text-sm text-muted-foreground">
            Usando horários padrão da barbearia
          </p>
        )}
      </CardHeader>

      {useCustomSchedule && (
        <CardContent className="space-y-4">
          {/* Summary alert for conflicts */}
          {hasConflicts && (
            <Alert variant={errorCount > 0 ? "destructive" : "default"} className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {errorCount > 0 && (
                  <span className="font-medium">{errorCount} conflito(s) crítico(s)</span>
                )}
                {errorCount > 0 && warningCount > 0 && " e "}
                {warningCount > 0 && (
                  <span>{warningCount} aviso(s)</span>
                )}
                {" — "}Verifique os horários configurados em relação ao expediente da barbearia.
              </AlertDescription>
            </Alert>
          )}

          {DAY_NAMES.map((day) => (
            <DayScheduleRow
              key={day}
              day={day}
              daySchedule={currentSchedule[day]}
              onUpdate={updateDaySchedule}
              conflicts={getConflictsForDay(day)}
              businessHours={getBusinessHoursForDay(day)}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
};

// Re-export types for backwards compatibility
export type { StandardWeeklySchedule as StaffSchedule };
