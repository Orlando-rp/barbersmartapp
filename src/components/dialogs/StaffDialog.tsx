import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StaffForm } from "@/components/forms/StaffForm";

interface StaffDialogProps {
  open: boolean;
  onClose: () => void;
  staff?: any;
  onSuccess: () => void;
}

export const StaffDialog = ({ open, onClose, staff, onSuccess }: StaffDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {staff ? 'Editar Membro da Equipe' : 'Adicionar Membro da Equipe'}
          </DialogTitle>
        </DialogHeader>
        <StaffForm staff={staff} onClose={onClose} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
};
