import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { ReactNode, useState } from "react";

interface AppointmentDialogProps {
  children: ReactNode;
}

export const AppointmentDialog = ({ children }: AppointmentDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <AppointmentForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};