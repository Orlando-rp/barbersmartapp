import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Barbershop {
  id: string;
  name: string;
}

interface DayUnitSchedule {
  is_working: boolean;
  unit_id: string | null;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
}

export interface StaffUnitSchedule {
  monday: DayUnitSchedule;
  tuesday: DayUnitSchedule;
  wednesday: DayUnitSchedule;
  thursday: DayUnitSchedule;
  friday: DayUnitSchedule;
  saturday: DayUnitSchedule;
  sunday: DayUnitSchedule;
}

interface StaffUnitsScheduleSectionProps {
  barbershopIds: string[];
  schedule: StaffUnitSchedule | null;
  onScheduleChange: (schedule: StaffUnitSchedule) => void;
}

const defaultDaySchedule: DayUnitSchedule = {
  is_working: true,
  unit_id: null,
  open_time: "09:00",
  close_time: "18:00",
  break_start: null,
  break_end: null,
};

const createDefaultSchedule = (defaultUnitId: string | null): StaffUnitSchedule => ({
  monday: { ...defaultDaySchedule, unit_id: defaultUnitId },
  tuesday: { ...defaultDaySchedule, unit_id: defaultUnitId },
  wednesday: { ...defaultDaySchedule, unit_id: defaultUnitId },
  thursday: { ...defaultDaySchedule, unit_id: defaultUnitId },
  friday: { ...defaultDaySchedule, unit_id: defaultUnitId },
  saturday: { ...defaultDaySchedule, unit_id: defaultUnitId, close_time: "14:00" },
  sunday: { ...defaultDaySchedule, is_working: false, unit_id: defaultUnitId },
});

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

// Native time select component to avoid Radix ref issues
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
  day: keyof StaffUnitSchedule;
  daySchedule: DayUnitSchedule;
  barbershops: Barbershop[];
  onUpdate: (day: keyof StaffUnitSchedule, field: keyof DayUnitSchedule, value: any) => void;
}

const DayScheduleRow = memo(({ day, daySchedule, barbershops, onUpdate }: DayScheduleRowProps) => {
  const handleWorkingChange = useCallback((checked: boolean) => {
    onUpdate(day, "is_working", checked);
  }, [day, onUpdate]);

  const handleUnitChange = useCallback((value: string) => {
    onUpdate(day, "unit_id", value);
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
        daySchedule.is_working ? "bg-background" : "bg-muted/50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Switch
            checked={daySchedule.is_working}
            onCheckedChange={handleWorkingChange}
          />
          <span className={`font-medium ${!daySchedule.is_working && "text-muted-foreground"}`}>
            {dayNames[day]}
          </span>
        </div>
      </div>

      {daySchedule.is_working && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-3">
          {/* Unit Selection - Keep Radix Select only for this */}
          <div className="md:col-span-1">
            <Label className="text-xs text-muted-foreground">Unidade</Label>
            <Select
              value={daySchedule.unit_id || ""}
              onValueChange={handleUnitChange}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {barbershops.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time fields - Use native selects */}
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

export const StaffUnitsScheduleSection = ({
  barbershopIds,
  schedule,
  onScheduleChange,
}: StaffUnitsScheduleSectionProps) => {
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [loading, setLoading] = useState(true);
  const lastIdsRef = useRef<string>('');

  // Memoize IDs string for comparison
  const idsString = useMemo(() => [...barbershopIds].sort().join(','), [barbershopIds]);

  useEffect(() => {
    if (idsString !== lastIdsRef.current && barbershopIds.length > 0) {
      lastIdsRef.current = idsString;
      fetchBarbershops();
    }
  }, [idsString, barbershopIds.length]);

  const fetchBarbershops = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("barbershops")
        .select("id, name")
        .in("id", barbershopIds)
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setBarbershops(data || []);
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
    } finally {
      setLoading(false);
    }
  };

  // Stable first barbershop ID reference
  const firstBarbershopId = barbershops.length > 0 ? barbershops[0].id : null;

  // Create stable default schedule
  const defaultScheduleForUnit = useMemo(() => 
    createDefaultSchedule(firstBarbershopId), 
    [firstBarbershopId]
  );

  // Memoize current schedule - ensure all days have valid values
  const currentSchedule = useMemo((): StaffUnitSchedule => {
    const base = defaultScheduleForUnit;
    if (!schedule) return base;
    
    // Merge with defaults to ensure all days exist
    return {
      monday: schedule.monday || base.monday,
      tuesday: schedule.tuesday || base.tuesday,
      wednesday: schedule.wednesday || base.wednesday,
      thursday: schedule.thursday || base.thursday,
      friday: schedule.friday || base.friday,
      saturday: schedule.saturday || base.saturday,
      sunday: schedule.sunday || base.sunday,
    };
  }, [schedule, defaultScheduleForUnit]);

  // Memoized update handler
  const updateDaySchedule = useCallback((
    day: keyof StaffUnitSchedule, 
    field: keyof DayUnitSchedule, 
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

  // Count days per unit for summary
  const unitSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    Object.values(currentSchedule).forEach((day) => {
      if (day.is_working && day.unit_id) {
        summary[day.unit_id] = (summary[day.unit_id] || 0) + 1;
      }
    });
    return summary;
  }, [currentSchedule]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (barbershops.length <= 1) {
    return null;
  }

  const days = Object.keys(dayNames) as Array<keyof StaffUnitSchedule>;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Escala por Unidade
        </CardTitle>
        <CardDescription>
          Configure em quais unidades o profissional trabalha em cada dia da semana
        </CardDescription>
        
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {barbershops.map((unit) => (
            <Badge 
              key={unit.id} 
              variant={unitSummary[unit.id] ? "default" : "secondary"}
              className="text-xs"
            >
              {unit.name}: {unitSummary[unit.id] || 0} dias
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {days.map((day) => {
          const daySchedule = currentSchedule[day] || defaultDaySchedule;
          return (
            <DayScheduleRow
              key={day}
              day={day}
              daySchedule={daySchedule}
              barbershops={barbershops}
              onUpdate={updateDaySchedule}
            />
          );
        })}
      </CardContent>
    </Card>
  );
};
