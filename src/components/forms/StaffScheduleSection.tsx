import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar } from "lucide-react";

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

export const StaffScheduleSection = ({
  schedule,
  onScheduleChange,
  useCustomSchedule,
  onUseCustomScheduleChange,
}: StaffScheduleSectionProps) => {
  const currentSchedule = schedule || defaultSchedule;

  const handleToggleCustom = (checked: boolean) => {
    onUseCustomScheduleChange(checked);
    if (checked && !schedule) {
      onScheduleChange(defaultSchedule);
    } else if (!checked) {
      onScheduleChange(null);
    }
  };

  const updateDaySchedule = (day: keyof StaffSchedule, field: keyof DaySchedule, value: any) => {
    const newSchedule = {
      ...currentSchedule,
      [day]: {
        ...currentSchedule[day],
        [field]: value,
      },
    };
    onScheduleChange(newSchedule);
  };

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
          {(Object.keys(dayNames) as Array<keyof StaffSchedule>).map((day) => (
            <div
              key={day}
              className={`p-3 rounded-lg border ${
                currentSchedule[day].is_open ? "bg-background" : "bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={currentSchedule[day].is_open}
                    onCheckedChange={(checked) => updateDaySchedule(day, "is_open", checked)}
                  />
                  <span className={`font-medium ${!currentSchedule[day].is_open && "text-muted-foreground"}`}>
                    {dayNames[day]}
                  </span>
                </div>
              </div>

              {currentSchedule[day].is_open && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
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
                        <SelectValue placeholder="Sem intervalo" />
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
                        <SelectValue placeholder="Sem intervalo" />
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
      )}
    </Card>
  );
};
