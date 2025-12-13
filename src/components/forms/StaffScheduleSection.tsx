import { useMemo, useCallback, memo } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import {
  StandardDaySchedule,
  StandardWeeklySchedule,
  DEFAULT_WEEKLY_SCHEDULE,
  DAY_LABELS,
  DAY_NAMES,
  DayName,
} from "@/types/schedule";

interface StaffScheduleSectionProps {
  schedule: StandardWeeklySchedule | null;
  onScheduleChange: (schedule: StandardWeeklySchedule | null) => void;
  useCustomSchedule: boolean;
  onUseCustomScheduleChange: (value: boolean) => void;
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
  includeNone = false 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  disabled?: boolean;
  includeNone?: boolean;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

// Isolated day row component to prevent cascading re-renders
interface DayScheduleRowProps {
  day: DayName;
  daySchedule: StandardDaySchedule;
  onUpdate: (day: DayName, field: keyof StandardDaySchedule, value: any) => void;
}

const DayScheduleRow = memo(({ day, daySchedule, onUpdate }: DayScheduleRowProps) => {
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

  return (
    <div
      className={`p-3 rounded-lg border ${
        daySchedule.enabled ? "bg-background" : "bg-muted/50"
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
        </div>
      </div>

      {daySchedule.enabled && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <div>
            <Label className="text-xs text-muted-foreground">Entrada</Label>
            <NativeTimeSelect
              value={daySchedule.start}
              onChange={handleStartChange}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Saída</Label>
            <NativeTimeSelect
              value={daySchedule.end}
              onChange={handleEndChange}
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
          {DAY_NAMES.map((day) => (
            <DayScheduleRow
              key={day}
              day={day}
              daySchedule={currentSchedule[day]}
              onUpdate={updateDaySchedule}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
};

// Re-export types for backwards compatibility
export type { StandardWeeklySchedule as StaffSchedule };
