import { useState, useEffect } from 'react';
import { format, addDays, isSameDay, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, CalendarPlus, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeneratedDate } from '@/lib/recurrenceUtils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface MultiDatePickerProps {
  initialDate: Date;
  selectedTime: string;
  onDatesChange: (dates: GeneratedDate[]) => void;
  maxDates?: number;
  disabledDates?: Date[];
  className?: string;
}

export function MultiDatePicker({
  initialDate,
  selectedTime,
  onDatesChange,
  maxDates = 12,
  disabledDates = [],
  className,
}: MultiDatePickerProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([initialDate]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(initialDate);

  // Converter para GeneratedDate e notificar mudanças
  useEffect(() => {
    const generatedDates: GeneratedDate[] = selectedDates
      .sort((a, b) => a.getTime() - b.getTime())
      .map((date, index) => ({
        date,
        index,
        formattedDate: format(date, 'yyyy-MM-dd'),
      }));
    
    onDatesChange(generatedDates);
  }, [selectedDates, onDatesChange]);

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => isSameDay(d, date));
  };

  const isDateDisabled = (date: Date) => {
    // Não permitir datas passadas
    if (isBefore(date, startOfDay(new Date()))) return true;
    // Não permitir mais de 60 dias no futuro
    if (isBefore(addDays(new Date(), 60), date)) return true;
    // Verificar datas desabilitadas
    return disabledDates.some(d => isSameDay(d, date));
  };

  const toggleDate = (date: Date | undefined) => {
    if (!date || isDateDisabled(date)) return;

    setSelectedDates(prev => {
      const isAlreadySelected = prev.some(d => isSameDay(d, date));
      
      if (isAlreadySelected) {
        // Não permitir remover a última data
        if (prev.length === 1) return prev;
        return prev.filter(d => !isSameDay(d, date));
      } else {
        // Verificar limite
        if (prev.length >= maxDates) {
          return prev;
        }
        return [...prev, date];
      }
    });
  };

  const removeDate = (dateToRemove: Date) => {
    if (selectedDates.length === 1) return; // Manter pelo menos uma data
    setSelectedDates(prev => prev.filter(d => !isSameDay(d, dateToRemove)));
  };

  const clearAllExceptFirst = () => {
    setSelectedDates([selectedDates[0]]);
  };

  const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <CalendarPlus className="h-4 w-4" />
          Selecionar Múltiplas Datas
        </Label>
        <Badge variant="outline">
          {selectedDates.length}/{maxDates}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Calendário */}
        <TooltipProvider>
          <div className="border rounded-lg p-3 bg-card">
            <Calendar
              mode="single"
              selected={undefined}
              onSelect={toggleDate}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              disabled={isDateDisabled}
              fromDate={new Date()}
              toDate={addDays(new Date(), 60)}
              locale={ptBR}
              className="w-full"
              modifiers={{
                selected: (date) => isDateSelected(date),
              }}
              modifiersStyles={{
                selected: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  fontWeight: 'bold',
                },
              }}
              components={{
                DayContent: ({ date }) => {
                  const isSelected = isDateSelected(date);
                  const isDisabled = isDateDisabled(date);
                  
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          'relative w-full h-full flex items-center justify-center',
                          isSelected && 'font-bold'
                        )}>
                          <span>{date.getDate()}</span>
                          {isSelected && (
                            <Check className="absolute -top-1 -right-1 h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {isDisabled 
                          ? 'Data indisponível' 
                          : isSelected 
                            ? 'Clique para remover' 
                            : 'Clique para adicionar'
                        }
                      </TooltipContent>
                    </Tooltip>
                  );
                }
              }}
            />
            <p className="text-xs text-muted-foreground text-center mt-2">
              Clique nas datas para adicionar ou remover
            </p>
          </div>
        </TooltipProvider>

        {/* Lista de datas selecionadas */}
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">
                Datas Selecionadas
              </span>
              {selectedDates.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllExceptFirst}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {sortedDates.map((date, index) => (
                  <div
                    key={format(date, 'yyyy-MM-dd')}
                    className="flex items-center justify-between p-2 bg-background rounded-lg border group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {format(date, "EEE, dd 'de' MMM", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          às {selectedTime}
                        </p>
                      </div>
                    </div>
                    
                    {selectedDates.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDate(date)}
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {selectedDates.length >= maxDates && (
              <p className="text-xs text-orange-600 mt-2">
                Limite máximo de {maxDates} datas atingido
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
