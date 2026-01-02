import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, AlertTriangle } from 'lucide-react';
import { GeneratedDate } from '@/lib/recurrenceUtils';

interface DateConflict {
  date: GeneratedDate;
  available: boolean;
  reason?: string;
}

interface RecurrenceConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: DateConflict[];
  onContinueWithAvailable: () => void;
  onCancel: () => void;
}

export function RecurrenceConflictDialog({
  open,
  onOpenChange,
  conflicts,
  onContinueWithAvailable,
  onCancel,
}: RecurrenceConflictDialogProps) {
  const availableDates = conflicts.filter(c => c.available);
  const unavailableDates = conflicts.filter(c => !c.available);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Algumas Datas Indisponíveis
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {unavailableDates.length} de {conflicts.length} datas não estão disponíveis para agendamento.
              </p>

              <div className="flex gap-2">
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <Check className="h-3 w-3 mr-1" />
                  {availableDates.length} disponíveis
                </Badge>
                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                  <X className="h-3 w-3 mr-1" />
                  {unavailableDates.length} indisponíveis
                </Badge>
              </div>

              <ScrollArea className="max-h-[200px] rounded-lg border">
                <div className="p-2 space-y-1">
                  {conflicts.map((conflict) => (
                    <div
                      key={conflict.date.formattedDate}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        conflict.available 
                          ? 'bg-green-50 dark:bg-green-950/20' 
                          : 'bg-orange-50 dark:bg-orange-950/20'
                      }`}
                    >
                      <span>
                        {format(conflict.date.date, "EEE, dd/MM", { locale: ptBR })}
                      </span>
                      <div className="flex items-center gap-2">
                        {conflict.available ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-orange-600 max-w-[120px] truncate">
                              {conflict.reason || 'Indisponível'}
                            </span>
                            <X className="h-4 w-4 text-orange-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Voltar e Alterar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onContinueWithAvailable}
            disabled={availableDates.length === 0}
          >
            Continuar com {availableDates.length} {availableDates.length === 1 ? 'data' : 'datas'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
