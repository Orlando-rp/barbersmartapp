import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ServiceForm } from "@/components/forms/ServiceForm";
import { ReactNode, useState } from "react";

interface ServiceDialogProps {
  children: ReactNode;
  editingService?: any;
}

export const ServiceDialog = ({ children, editingService }: ServiceDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ServiceForm 
          onClose={() => setOpen(false)} 
          editingService={editingService}
        />
      </DialogContent>
    </Dialog>
  );
};