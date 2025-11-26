import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { ReactNode } from "react";

interface AppointmentDialogProps {
  children?: ReactNode;
  appointment?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AppointmentDialog = ({ children, appointment, open, onOpenChange, onSuccess }: AppointmentDialogProps) => {
  const handleClose = () => {
    onSuccess?.();
    onOpenChange?.(false);
  };

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">
          {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {appointment ? 'Formulário para editar um agendamento existente' : 'Formulário para criar um novo agendamento na barbearia'}
        </DialogDescription>
        <div className="max-h-[90vh] overflow-y-auto">
          <AppointmentForm appointment={appointment} onClose={handleClose} />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
