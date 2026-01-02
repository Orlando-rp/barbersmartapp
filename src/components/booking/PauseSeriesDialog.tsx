import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Pause, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type PauseScope = 'single' | 'future' | 'all';

interface PauseSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'pause' | 'resume';
  currentIndex: number;
  totalInSeries: number;
  onConfirm: (scope: PauseScope, untilDate?: Date, reason?: string) => void;
}

export function PauseSeriesDialog({
  open,
  onOpenChange,
  action,
  currentIndex,
  totalInSeries,
  onConfirm,
}: PauseSeriesDialogProps) {
  const [selectedScope, setSelectedScope] = useState<PauseScope>('future');
  const [untilDate, setUntilDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');

  const isPause = action === 'pause';
  
  const titles = {
    pause: 'Pausar Agendamentos',
    resume: 'Retomar Agendamentos',
  };

  const descriptions = {
    pause: 'Escolha quais agendamentos da série deseja pausar temporariamente. Eles não serão cancelados e poderão ser retomados a qualquer momento.',
    resume: 'Escolha quais agendamentos da série deseja retomar. Eles voltarão ao status normal.',
  };

  const handleConfirm = () => {
    onConfirm(selectedScope, untilDate, reason || undefined);
    setSelectedScope('future');
    setUntilDate(undefined);
    setReason('');
    onOpenChange(false);
  };

  const remainingCount = totalInSeries - currentIndex;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isPause ? (
              <Pause className="h-5 w-5 text-orange-500" />
            ) : (
              <Play className="h-5 w-5 text-green-500" />
            )}
            {titles[action]}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {descriptions[action]}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup
            value={selectedScope}
            onValueChange={(value) => setSelectedScope(value as PauseScope)}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="single" id="single" className="mt-0.5" />
              <Label htmlFor="single" className="flex-1 cursor-pointer">
                <div className="font-medium">
                  {isPause ? 'Apenas este agendamento' : 'Apenas este agendamento'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Agendamento #{currentIndex + 1} de {totalInSeries}
                </div>
              </Label>
            </div>

            {currentIndex < totalInSeries - 1 && (
              <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="future" id="future" className="mt-0.5" />
                <Label htmlFor="future" className="flex-1 cursor-pointer">
                  <div className="font-medium">
                    {isPause ? 'Este e os próximos' : 'Este e os próximos'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {remainingCount} agendamento{remainingCount > 1 ? 's' : ''} restante{remainingCount > 1 ? 's' : ''}
                  </div>
                </Label>
              </div>
            )}

            <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="all" id="all" className="mt-0.5" />
              <Label htmlFor="all" className="flex-1 cursor-pointer">
                <div className="font-medium">
                  {isPause ? 'Toda a série' : 'Toda a série'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Todos os {totalInSeries} agendamentos
                </div>
              </Label>
            </div>
          </RadioGroup>

          {isPause && (
            <>
              <div className="space-y-2">
                <Label>Pausar até (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !untilDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {untilDate ? format(untilDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={untilDate}
                      onSelect={setUntilDate}
                      disabled={(date) => date < new Date()}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Se não definir uma data, a série ficará pausada indefinidamente até você retomar manualmente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo (opcional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Ex: Cliente viajando, férias, etc."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-20 resize-none"
                />
              </div>
            </>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(
              isPause 
                ? "bg-orange-500 hover:bg-orange-600" 
                : "bg-green-500 hover:bg-green-600"
            )}
          >
            {isPause ? 'Pausar' : 'Retomar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
