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
import { useState } from 'react';
import { Calendar, CalendarDays, CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RecurrenceActionScope = 'single' | 'future' | 'all';

interface RecurrenceActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'cancel' | 'reschedule' | 'edit';
  currentIndex: number;
  totalInSeries: number;
  onConfirm: (scope: RecurrenceActionScope) => void;
}

export function RecurrenceActionDialog({
  open,
  onOpenChange,
  action,
  currentIndex,
  totalInSeries,
  onConfirm,
}: RecurrenceActionDialogProps) {
  const [selectedScope, setSelectedScope] = useState<RecurrenceActionScope>('single');
  
  const futureCount = totalInSeries - currentIndex;
  const displayIndex = currentIndex + 1;

  const actionLabels = {
    cancel: {
      title: 'Cancelar Agendamento Recorrente',
      description: 'Este agendamento faz parte de uma série. O que você deseja cancelar?',
      single: 'Cancelar apenas este agendamento',
      future: `Cancelar este e os próximos (${futureCount} restantes)`,
      all: `Cancelar toda a série (${totalInSeries} agendamentos)`,
      confirm: 'Confirmar Cancelamento',
    },
    reschedule: {
      title: 'Remarcar Agendamento Recorrente',
      description: 'Este agendamento faz parte de uma série. O que você deseja remarcar?',
      single: 'Remarcar apenas este agendamento',
      future: `Remarcar este e ajustar os próximos (${futureCount} restantes)`,
      all: `Remarcar toda a série (${totalInSeries} agendamentos)`,
      confirm: 'Continuar',
    },
    edit: {
      title: 'Editar Agendamento Recorrente',
      description: 'Este agendamento faz parte de uma série. Onde aplicar as alterações?',
      single: 'Editar apenas este agendamento',
      future: `Editar este e os próximos (${futureCount} restantes)`,
      all: `Editar toda a série (${totalInSeries} agendamentos)`,
      confirm: 'Continuar',
    },
  };

  const labels = actionLabels[action];

  const handleConfirm = () => {
    onConfirm(selectedScope);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {labels.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <RadioGroup
          value={selectedScope}
          onValueChange={(v) => setSelectedScope(v as RecurrenceActionScope)}
          className="space-y-3 py-4"
        >
          {/* Single */}
          <div
            className={cn(
              'flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-all',
              selectedScope === 'single' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => setSelectedScope('single')}
          >
            <RadioGroupItem value="single" id="scope-single" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="scope-single" className="cursor-pointer font-medium">
                {labels.single}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agendamento #{displayIndex} de {totalInSeries}
              </p>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Future (only if not the last one) */}
          {currentIndex < totalInSeries - 1 && (
            <div
              className={cn(
                'flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-all',
                selectedScope === 'future' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => setSelectedScope('future')}
            >
              <RadioGroupItem value="future" id="scope-future" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="scope-future" className="cursor-pointer font-medium">
                  {labels.future}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A partir do agendamento #{displayIndex}
                </p>
              </div>
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          {/* All */}
          <div
            className={cn(
              'flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-all',
              selectedScope === 'all' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => setSelectedScope('all')}
          >
            <RadioGroupItem value="all" id="scope-all" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="scope-all" className="cursor-pointer font-medium">
                {labels.all}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Incluindo agendamentos passados e futuros
              </p>
            </div>
            <CalendarX className="h-5 w-5 text-muted-foreground" />
          </div>
        </RadioGroup>

        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {labels.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
