import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ClientForm } from "@/components/forms/ClientForm";
import { ReactNode, useState, useEffect } from "react";

interface ClientDialogProps {
  children: ReactNode;
  editingClient?: any;
  onSuccess?: () => void;
}

export const ClientDialog = ({ children, editingClient, onSuccess }: ClientDialogProps) => {
  const [open, setOpen] = useState(false);

  // Open dialog when editingClient changes and has a value
  useEffect(() => {
    if (editingClient) {
      setOpen(true);
    }
  }, [editingClient]);

  const handleClose = () => {
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ClientForm 
          onClose={handleClose} 
          editingClient={editingClient}
        />
      </DialogContent>
    </Dialog>
  );
};