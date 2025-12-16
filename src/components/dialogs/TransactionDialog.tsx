import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransactionForm, TransactionFormData } from "@/components/forms/TransactionForm";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectableUnits } from "@/hooks/useSelectableUnits";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface TransactionDialogProps {
  children: React.ReactNode;
  transaction?: any;
  onSuccess?: () => void;
}

export const TransactionDialog = ({ 
  children, 
  transaction,
  onSuccess 
}: TransactionDialogProps) => {
  const { selectedBarbershopId, barbershops, user } = useAuth();
  const { selectableUnits } = useSelectableUnits(barbershops);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Usa apenas unidades selecionáveis (nunca a matriz)
  const effectiveBarbershopId = selectedBarbershopId || (selectableUnits.length === 1 ? selectableUnits[0].id : selectableUnits[0]?.id);

  const handleSubmit = async (data: TransactionFormData) => {
    if (!effectiveBarbershopId || !user) {
      toast.error("Selecione uma unidade para registrar a transação");
      return;
    }

    try {
      setIsLoading(true);

      const transactionData = {
        barbershop_id: effectiveBarbershopId,
        type: data.type,
        amount: parseFloat(data.amount),
        description: data.description,
        category: data.category,
        payment_method: data.payment_method,
        transaction_date: data.transaction_date,
        notes: data.notes || null,
        created_by: user.id,
      };

      if (transaction) {
        // Atualizar transação existente
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', transaction.id);

        if (error) throw error;
        toast.success("Transação atualizada com sucesso!");
      } else {
        // Criar nova transação
        const { error } = await supabase
          .from('transactions')
          .insert([transactionData]);

        if (error) throw error;
        toast.success("Transação registrada com sucesso!");
      }

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao salvar transação:', error);
      toast.error(error.message || "Erro ao salvar transação");
    } finally {
      setIsLoading(false);
    }
  };

  const initialData = transaction ? {
    type: transaction.type,
    amount: transaction.amount.toString(),
    description: transaction.description,
    category: transaction.category,
    payment_method: transaction.payment_method,
    transaction_date: transaction.transaction_date,
    notes: transaction.notes || "",
  } : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg">
            {transaction ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
        </DialogHeader>
        <TransactionForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
};
