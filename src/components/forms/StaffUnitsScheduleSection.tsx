import { useState, useEffect, useRef, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Loader2 } from "lucide-react";
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
  barbershopIds: string[]; // All barbershop IDs the user has access to
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
    // Only fetch if IDs actually changed
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

  // Create stable default schedule - only recreate when barbershops change
  const defaultScheduleForUnit = useMemo(() => 
    createDefaultSchedule(barbershops[0]?.id || null), 
    [barbershops.length > 0 ? barbershops[0]?.id : null]
  );

  // Memoize current schedule to prevent new object reference on each render
  const currentSchedule = useMemo(() => {
    return schedule || defaultScheduleForUnit;
  }, [schedule, defaultScheduleForUnit]);

  const updateDaySchedule = (day: keyof StaffUnitSchedule, field: keyof DayUnitSchedule, value: any) => {
    const daySchedule = currentSchedule[day] || defaultDaySchedule;
    const newSchedule = {
      ...currentSchedule,
      [day]: {
        ...daySchedule,
        [field]: value,
      },
    };
    onScheduleChange(newSchedule);
  };

  // Count days per unit for summary
  const getUnitSummary = () => {
    const summary: Record<string, number> = {};
    Object.values(currentSchedule).forEach((day) => {
      if (day.is_working && day.unit_id) {
        summary[day.unit_id] = (summary[day.unit_id] || 0) + 1;
      }
    });
    return summary;
  };

  const unitSummary = getUnitSummary();

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
    return null; // Don't show if only one unit
  }

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
        {(Object.keys(dayNames) as Array<keyof StaffUnitSchedule>).map((day) => (
          <div
            key={day}
            className={`p-3 rounded-lg border ${
              currentSchedule[day].is_working ? "bg-background" : "bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={currentSchedule[day].is_working}
                  onCheckedChange={(checked) => updateDaySchedule(day, "is_working", checked)}
                />
                <span className={`font-medium ${!currentSchedule[day].is_working && "text-muted-foreground"}`}>
                  {dayNames[day]}
                </span>
              </div>
            </div>

            {currentSchedule[day].is_working && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-3">
                {/* Unit Selection */}
                <div className="md:col-span-1">
                  <Label className="text-xs text-muted-foreground">Unidade</Label>
                  <Select
                    value={currentSchedule[day].unit_id || ""}
                    onValueChange={(value) => updateDaySchedule(day, "unit_id", value)}
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

                {/* Time fields */}
                <div>
                  <Label className="text-xs text-muted-foreground">Entrada</Label>
                  <Select
                    value={currentSchedule[day].open_time}
                    onValueChange={(value) => updateDaySchedule(day, "open_time", value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Saída</Label>
                  <Select
                    value={currentSchedule[day].close_time}
                    onValueChange={(value) => updateDaySchedule(day, "close_time", value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Início Intervalo</Label>
                  <Select
                    value={currentSchedule[day].break_start || "none"}
                    onValueChange={(value) => updateDaySchedule(day, "break_start", value === "none" ? null : value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Sem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem intervalo</SelectItem>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Fim Intervalo</Label>
                  <Select
                    value={currentSchedule[day].break_end || "none"}
                    onValueChange={(value) => updateDaySchedule(day, "break_end", value === "none" ? null : value)}
                    disabled={!currentSchedule[day].break_start}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Sem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem intervalo</SelectItem>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
