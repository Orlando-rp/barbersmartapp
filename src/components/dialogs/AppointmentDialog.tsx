import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { ReactNode } from "react";

interface WaitlistPrefill {
  clientName?: string;
  clientPhone?: string;
  serviceId?: string;
  staffId?: string;
  preferredDate?: string;
  preferredTimeStart?: string;
}

interface AppointmentDialogProps {
  children?: ReactNode;
  appointment?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  waitlistPrefill?: WaitlistPrefill;
}

export const AppointmentDialog = ({ children, appointment, open, onOpenChange, onSuccess, waitlistPrefill }: AppointmentDialogProps) => {
  const handleClose = () => {
    // Primeiro fecha o dialog, depois chama onSuccess
    onOpenChange?.(false);
    // Pequeno delay para garantir que o dialog feche antes de outras operações
    setTimeout(() => {
      onSuccess?.();
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] sm:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">
          {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {appointment ? 'Formulário para editar um agendamento existente' : 'Formulário para criar um novo agendamento na barbearia'}
        </DialogDescription>
        <div className="max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          <AppointmentForm appointment={appointment} onClose={handleClose} waitlistPrefill={waitlistPrefill} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
