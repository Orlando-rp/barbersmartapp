import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Repeat, Calendar, CalendarDays, AlertCircle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RecurrenceRule,
  RecurrenceConfig,
  GeneratedDate,
  generateRecurringDates,
  getRecurrenceLabel,
  RECURRENCE_COUNT_OPTIONS,
  RECURRENCE_RULE_OPTIONS,
} from '@/lib/recurrenceUtils';

export type RecurrenceType = 'single' | 'recurring' | 'multiple';

interface RecurrenceSelectorProps {
  selectedDate: Date;
  selectedTime: string;
  onRecurrenceChange: (type: RecurrenceType, dates: GeneratedDate[], config?: RecurrenceConfig) => void;
  availabilityChecker?: (date: Date, time: string) => Promise<{ available: boolean; reason?: string }>;
  serviceDuration?: number;
  className?: string;
}

interface DateAvailability {
  date: Date;
  available: boolean;
  reason?: string;
  checking: boolean;
}

export function RecurrenceSelector({
  selectedDate,
  selectedTime,
  onRecurrenceChange,
  availabilityChecker,
  serviceDuration = 30,
  className,
}: RecurrenceSelectorProps) {
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('single');
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState<number>(4);
  const [customIntervalDays, setCustomIntervalDays] = useState<number>(7);
  const [generatedDates, setGeneratedDates] = useState<GeneratedDate[]>([]);
  const [dateAvailability, setDateAvailability] = useState<Map<string, DateAvailability>>(new Map());
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Gerar datas quando configuração muda
  useEffect(() => {
    if (recurrenceType === 'recurring' && selectedDate) {
      const config: RecurrenceConfig = {
        rule: recurrenceRule,
        count: recurrenceCount,
        customIntervalDays: recurrenceRule === 'custom' ? customIntervalDays : undefined,
      };

      const dates = generateRecurringDates(selectedDate, config);
      setGeneratedDates(dates);
      onRecurrenceChange('recurring', dates, config);

      // Verificar disponibilidade se houver checker
      if (availabilityChecker && selectedTime) {
        checkAllAvailability(dates);
      }
    } else if (recurrenceType === 'single') {
      const singleDate: GeneratedDate[] = [{
        date: selectedDate,
        index: 0,
        formattedDate: format(selectedDate, 'yyyy-MM-dd'),
      }];
      setGeneratedDates(singleDate);
      onRecurrenceChange('single', singleDate);
    }
  }, [recurrenceType, recurrenceRule, recurrenceCount, customIntervalDays, selectedDate, selectedTime]);

  const checkAllAvailability = async (dates: GeneratedDate[]) => {
    if (!availabilityChecker || !selectedTime) return;

    setCheckingAvailability(true);
    const newAvailability = new Map<string, DateAvailability>();

    // Inicializar todos como "checking"
    dates.forEach(d => {
      newAvailability.set(d.formattedDate, {
        date: d.date,
        available: true,
        checking: true,
      });
    });
    setDateAvailability(new Map(newAvailability));

    // Verificar em paralelo (máximo 5 por vez)
    const batchSize = 5;
    for (let i = 0; i < dates.length; i += batchSize) {
      const batch = dates.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (d) => {
          try {
            const result = await availabilityChecker(d.date, selectedTime);
            newAvailability.set(d.formattedDate, {
              date: d.date,
              available: result.available,
              reason: result.reason,
              checking: false,
            });
          } catch (error) {
            newAvailability.set(d.formattedDate, {
              date: d.date,
              available: false,
              reason: 'Erro ao verificar disponibilidade',
              checking: false,
            });
          }
        })
      );
      setDateAvailability(new Map(newAvailability));
    }

    setCheckingAvailability(false);
  };

  const availableDatesCount = Array.from(dateAvailability.values()).filter(d => d.available && !d.checking).length;
  const unavailableDatesCount = Array.from(dateAvailability.values()).filter(d => !d.available && !d.checking).length;

  const handleTypeChange = (value: RecurrenceType) => {
    setRecurrenceType(value);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Label className="text-sm font-medium flex items-center gap-2">
        <Repeat className="h-4 w-4" />
        Tipo de Agendamento
      </Label>

      <RadioGroup
        value={recurrenceType}
        onValueChange={(v) => handleTypeChange(v as RecurrenceType)}
        className="grid gap-3"
      >
        {/* Opção: Único */}
        <div
          className={cn(
            'flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-all',
            recurrenceType === 'single'
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border hover:border-primary/50'
          )}
          onClick={() => handleTypeChange('single')}
        >
          <RadioGroupItem value="single" id="single" />
          <div className="flex-1">
            <Label htmlFor="single" className="cursor-pointer font-medium">
              Agendamento Único
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Apenas para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Opção: Recorrente */}
        <div
          className={cn(
            'rounded-lg border transition-all',
            recurrenceType === 'recurring'
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border hover:border-primary/50'
          )}
        >
          <div
            className="flex items-center space-x-3 p-4 cursor-pointer"
            onClick={() => handleTypeChange('recurring')}
          >
            <RadioGroupItem value="recurring" id="recurring" />
            <div className="flex-1">
              <Label htmlFor="recurring" className="cursor-pointer font-medium">
                Agendamento Recorrente
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agendar automaticamente para várias semanas
              </p>
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Configurações de recorrência */}
          {recurrenceType === 'recurring' && (
            <div className="px-4 pb-4 pt-2 border-t space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Frequência</Label>
                  <Select
                    value={recurrenceRule}
                    onValueChange={(v) => setRecurrenceRule(v as RecurrenceRule)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_RULE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Repetir</Label>
                  <Select
                    value={recurrenceCount.toString()}
                    onValueChange={(v) => setRecurrenceCount(parseInt(v))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_COUNT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {recurrenceRule === 'custom' && (
                <div className="space-y-2">
                  <Label className="text-xs">Intervalo em dias</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={customIntervalDays}
                    onChange={(e) => setCustomIntervalDays(parseInt(e.target.value) || 7)}
                    className="h-9"
                  />
                </div>
              )}

              {/* Preview das datas */}
              {generatedDates.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Datas ({generatedDates.length})
                    </Label>
                    {dateAvailability.size > 0 && !checkingAvailability && (
                      <div className="flex items-center gap-2 text-xs">
                        {availableDatesCount > 0 && (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            <Check className="h-3 w-3 mr-1" />
                            {availableDatesCount} disponíveis
                          </Badge>
                        )}
                        {unavailableDatesCount > 0 && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {unavailableDatesCount} indisponíveis
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Card className="bg-muted/30">
                    <CardContent className="p-3 max-h-[200px] overflow-y-auto">
                      <div className="space-y-1.5">
                        {generatedDates.map((d, i) => {
                          const availability = dateAvailability.get(d.formattedDate);
                          
                          return (
                            <div
                              key={d.formattedDate}
                              className={cn(
                                'flex items-center justify-between text-sm py-1.5 px-2 rounded',
                                availability?.available === false && 'bg-orange-50 dark:bg-orange-950/20'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs w-4">
                                  {i + 1}.
                                </span>
                                <span className={cn(
                                  availability?.available === false && 'text-orange-600'
                                )}>
                                  {format(d.date, "EEE, dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs">
                                  {selectedTime}
                                </span>
                                {availability?.checking ? (
                                  <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                ) : availability?.available === true ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : availability?.available === false ? (
                                  <X className="h-4 w-4 text-orange-600" />
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {unavailableDatesCount > 0 && !checkingAvailability && (
                    <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-orange-700 dark:text-orange-400">
                        <p className="font-medium">Algumas datas não estão disponíveis</p>
                        <p className="mt-0.5">
                          Você pode continuar apenas com as {availableDatesCount} datas disponíveis ou escolher outra configuração.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </RadioGroup>
    </div>
  );
}
