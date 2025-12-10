import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ServiceForm } from "@/components/forms/ServiceForm";
import { ReactNode, useState } from "react";

interface ServiceDialogProps {
  children?: ReactNode;
  editingService?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ServiceDialog = ({ children, editingService, open: controlledOpen, onOpenChange }: ServiceDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ServiceForm 
          onClose={() => handleOpenChange(false)} 
          editingService={editingService}
        />
      </DialogContent>
    </Dialog>
  );
};