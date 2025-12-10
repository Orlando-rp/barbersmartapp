import { useMemo, useCallback, memo } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface DaySchedule {
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
}

export interface StaffSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface StaffScheduleSectionProps {
  schedule: StaffSchedule | null;
  onScheduleChange: (schedule: StaffSchedule | null) => void;
  useCustomSchedule: boolean;
  onUseCustomScheduleChange: (value: boolean) => void;
}

const defaultDaySchedule: DaySchedule = {
  is_open: true,
  open_time: "09:00",
  close_time: "18:00",
  break_start: null,
  break_end: null,
};

const defaultSchedule: StaffSchedule = {
  monday: { ...defaultDaySchedule },
  tuesday: { ...defaultDaySchedule },
  wednesday: { ...defaultDaySchedule },
  thursday: { ...defaultDaySchedule },
  friday: { ...defaultDaySchedule },
  saturday: { ...defaultDaySchedule, close_time: "14:00" },
  sunday: { ...defaultDaySchedule, is_open: false },
};

const dayNames: { [key: string]: string } = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

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
  day: keyof StaffSchedule;
  daySchedule: DaySchedule;
  onUpdate: (day: keyof StaffSchedule, field: keyof DaySchedule, value: any) => void;
}

const DayScheduleRow = memo(({ day, daySchedule, onUpdate }: DayScheduleRowProps) => {
  const handleOpenChange = useCallback((checked: boolean) => {
    onUpdate(day, "is_open", checked);
  }, [day, onUpdate]);

  const handleOpenTimeChange = useCallback((value: string) => {
    onUpdate(day, "open_time", value);
  }, [day, onUpdate]);

  const handleCloseTimeChange = useCallback((value: string) => {
    onUpdate(day, "close_time", value);
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
        daySchedule.is_open ? "bg-background" : "bg-muted/50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={daySchedule.is_open}
            onCheckedChange={handleOpenChange}
          />
          <span className={`font-medium ${!daySchedule.is_open && "text-muted-foreground"}`}>
            {dayNames[day]}
          </span>
        </div>
      </div>

      {daySchedule.is_open && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <div>
            <Label className="text-xs text-muted-foreground">Entrada</Label>
            <NativeTimeSelect
              value={daySchedule.open_time}
              onChange={handleOpenTimeChange}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Saída</Label>
            <NativeTimeSelect
              value={daySchedule.close_time}
              onChange={handleCloseTimeChange}
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
    if (!schedule) return defaultSchedule;
    
    return {
      monday: schedule.monday || defaultSchedule.monday,
      tuesday: schedule.tuesday || defaultSchedule.tuesday,
      wednesday: schedule.wednesday || defaultSchedule.wednesday,
      thursday: schedule.thursday || defaultSchedule.thursday,
      friday: schedule.friday || defaultSchedule.friday,
      saturday: schedule.saturday || defaultSchedule.saturday,
      sunday: schedule.sunday || defaultSchedule.sunday,
    };
  }, [schedule]);

  const handleToggleCustom = useCallback((checked: boolean) => {
    onUseCustomScheduleChange(checked);
    if (checked && !schedule) {
      onScheduleChange(defaultSchedule);
    } else if (!checked) {
      onScheduleChange(null);
    }
  }, [onUseCustomScheduleChange, schedule, onScheduleChange]);

  const updateDaySchedule = useCallback((
    day: keyof StaffSchedule, 
    field: keyof DaySchedule, 
    value: any
  ) => {
    const daySchedule = currentSchedule[day] || defaultDaySchedule;
    const newSchedule = {
      ...currentSchedule,
      [day]: {
        ...daySchedule,
        [field]: value,
      },
    };
    onScheduleChange(newSchedule);
  }, [currentSchedule, onScheduleChange]);

  const days = Object.keys(dayNames) as Array<keyof StaffSchedule>;

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
          {days.map((day) => (
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
