import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StaffAvatar } from '@/components/ui/smart-avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  Phone, 
  ChevronDown, 
  ChevronUp, 
  Repeat,
  Edit,
  Trash2,
  CheckCircle2,
  Pause,
  Play
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RecurrenceBadge } from '@/components/booking';
import { getRecurrenceLabel, RecurrenceRule } from '@/lib/recurrenceUtils';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  client_id: string | null;
  client_name: string;
  client_phone: string;
  service_name: string;
  service_price: number;
  staff_id: string | null;
  staff_name: string | null;
  staff_avatar_url: string | null;
  barbershop_id: string;
  barbershop_name: string | null;
  payment_status: 'pending' | 'paid_online' | 'paid_at_location' | 'partial' | 'refunded' | null;
  payment_method_chosen: 'online' | 'at_location' | null;
  payment_amount: number | null;
  is_recurring?: boolean;
  recurrence_group_id?: string | null;
  recurrence_rule?: string | null;
  recurrence_index?: number | null;
  original_date?: string | null;
  is_paused?: boolean;
  paused_at?: string | null;
  paused_until?: string | null;
  pause_reason?: string | null;
  staff?: {
    name: string;
    avatar_url: string | null;
  } | null;
}

interface RecurringSeriesCardProps {
  appointments: Appointment[];
  onEdit: (appointment: any) => void;
  onCancel: (appointment: any) => void;
  onPause?: (appointment: any) => void;
  onResume?: (appointment: any) => void;
  onStatusChange: (appointmentId: string, status: string) => void;
  onPayment: (appointment: any) => void;
  showBarbershopName?: boolean;
  statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }>;
  paymentStatusConfig: Record<string, { label: string; shortLabel: string; color: string }>;
}

export function RecurringSeriesCard({
  appointments,
  onEdit,
  onCancel,
  onPause,
  onResume,
  onStatusChange,
  onPayment,
  showBarbershopName,
  statusConfig,
  paymentStatusConfig,
}: RecurringSeriesCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Sort appointments by date
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
    const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
    return dateA.getTime() - dateB.getTime();
  });

  const firstAppointment = sortedAppointments[0];
  const lastAppointment = sortedAppointments[sortedAppointments.length - 1];
  
  // Count by status
  const pendingCount = sortedAppointments.filter(a => a.status === 'pendente' || a.status === 'confirmado').length;
  const completedCount = sortedAppointments.filter(a => a.status === 'concluido').length;
  const cancelledCount = sortedAppointments.filter(a => a.status === 'cancelado').length;
  const pausedCount = sortedAppointments.filter(a => a.is_paused).length;

  const recurrenceLabel = firstAppointment.recurrence_rule 
    ? getRecurrenceLabel(firstAppointment.recurrence_rule as RecurrenceRule)
    : 'Recorrente';
    
  const hasPausedAppointments = pausedCount > 0;

  // Calculate total value
  const totalValue = sortedAppointments
    .filter(a => a.status !== 'cancelado')
    .reduce((sum, a) => sum + (a.service_price || 0), 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        "barbershop-card overflow-hidden transition-all",
        isOpen && "ring-2 ring-primary/20"
      )}>
        {/* Summary Header - Always Visible */}
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Client and Series Info */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-full bg-primary/10">
                        <Repeat className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-semibold text-base md:text-lg">{firstAppointment.client_name}</span>
                    </div>
                    <Badge variant="outline" className="gap-1 text-xs border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
                      <Repeat className="h-3 w-3" />
                      {sortedAppointments.length} agendamentos
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {recurrenceLabel}
                    </Badge>
                    {hasPausedAppointments && (
                      <Badge variant="outline" className="gap-1 text-xs border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400">
                        <Pause className="h-3 w-3" />
                        {pausedCount} pausado{pausedCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  {/* Service and Staff */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Scissors className="h-3.5 w-3.5 text-primary" />
                      <span>{firstAppointment.service_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StaffAvatar 
                        src={firstAppointment.staff?.avatar_url}
                        alt={firstAppointment.staff?.name || ''}
                        fallbackText={firstAppointment.staff?.name}
                        size="xs"
                        fallbackClassName="bg-primary/10 text-primary"
                      />
                      <span>{firstAppointment.staff?.name || 'Não especificado'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{firstAppointment.client_phone}</span>
                    </div>
                  </div>

                  {/* Date Range and Stats */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>
                        {format(parseISO(firstAppointment.appointment_date), "dd/MM", { locale: ptBR })}
                        {' → '}
                        {format(parseISO(lastAppointment.appointment_date), "dd/MM/yy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pendingCount > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {completedCount > 0 && (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {completedCount} concluído{completedCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {cancelledCount > 0 && (
                        <span className="text-destructive font-medium">
                          {cancelledCount} cancelado{cancelledCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-primary">
                      Total: R$ {totalValue.toFixed(0)}
                    </div>
                  </div>
                </div>

                {/* Expand Button */}
                <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 w-8 p-0">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content - Individual Appointments */}
        <CollapsibleContent>
          <div className="border-t bg-muted/30">
            <div className="p-2 md:p-3 space-y-2">
              {sortedAppointments.map((appointment, index) => {
                const status = statusConfig[appointment.status as keyof typeof statusConfig];
                const isRescheduled = appointment.original_date !== null && 
                  appointment.original_date !== appointment.appointment_date;
                const isPaused = appointment.is_paused === true;

                return (
                  <div 
                    key={appointment.id}
                    className={cn(
                      "flex flex-col md:flex-row md:items-center justify-between gap-2 p-3 rounded-lg bg-card border",
                      appointment.status === 'cancelado' && "opacity-60",
                      isPaused && "border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Index Badge */}
                      <div className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold flex-shrink-0",
                        appointment.status === 'concluido' 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : appointment.status === 'cancelado'
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      )}>
                        {(appointment.recurrence_index ?? index) + 1}
                      </div>

                      {/* Date and Time */}
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">
                          {format(parseISO(appointment.appointment_date), "EEE, dd/MM", { locale: ptBR })}
                        </span>
                        <Clock className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                        <span>{appointment.appointment_time.slice(0, 5)}</span>
                      </div>

                      {/* Status and Badges */}
                      <div className="flex items-center gap-1.5">
                        {isPaused && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px] gap-1 border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-700 dark:bg-orange-900/50 dark:text-orange-400">
                                  <Pause className="h-2.5 w-2.5" />
                                  Pausado
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{appointment.pause_reason || 'Agendamento pausado temporariamente'}</p>
                                {appointment.paused_until && (
                                  <p className="text-xs text-muted-foreground">
                                    Até: {format(parseISO(appointment.paused_until), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {isRescheduled && (
                          <Badge variant="outline" className="text-[10px] border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400">
                            Remarcado
                          </Badge>
                        )}
                        <Badge variant={status?.variant || 'secondary'} className="text-[10px]">
                          {status?.label || appointment.status}
                        </Badge>
                        {appointment.payment_status && paymentStatusConfig[appointment.payment_status] && (
                          <Badge 
                            variant="outline"
                            className={cn("text-[10px]", paymentStatusConfig[appointment.payment_status].color)}
                          >
                            {paymentStatusConfig[appointment.payment_status].shortLabel}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(appointment);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      {appointment.payment_status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPayment(appointment);
                          }}
                          className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Pago
                        </Button>
                      )}
                      {appointment.status !== 'cancelado' && appointment.status !== 'concluido' && (
                        <>
                          {isPaused ? (
                            onResume && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onResume(appointment);
                                }}
                                className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Retomar
                              </Button>
                            )
                          ) : (
                            onPause && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPause(appointment);
                                }}
                                className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700"
                              >
                                <Pause className="h-3 w-3 mr-1" />
                                Pausar
                              </Button>
                            )
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCancel(appointment);
                            }}
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}