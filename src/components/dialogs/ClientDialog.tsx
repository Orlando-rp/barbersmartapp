import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ClientForm } from "@/components/forms/ClientForm";
import { ReactNode, useState } from "react";

interface ClientDialogProps {
  children: ReactNode;
  editingClient?: any;
}

export const ClientDialog = ({ children, editingClient }: ClientDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ClientForm 
          onClose={() => setOpen(false)} 
          editingClient={editingClient}
        />
      </DialogContent>
    </Dialog>
  );
};