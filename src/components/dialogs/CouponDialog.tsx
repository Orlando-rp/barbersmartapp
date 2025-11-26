import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CouponForm, CouponFormData } from "@/components/forms/CouponForm";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface CouponDialogProps {
  children: React.ReactNode;
  coupon?: any;
  onSuccess?: () => void;
}

export const CouponDialog = ({ 
  children, 
  coupon,
  onSuccess 
}: CouponDialogProps) => {
  const { barbershopId } = useAuth();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: CouponFormData) => {
    if (!barbershopId) {
      toast.error("Erro de autenticação");
      return;
    }

    try {
      setIsLoading(true);

      const couponData = {
        barbershop_id: barbershopId,
        code: data.code.toUpperCase(),
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value: parseFloat(data.discount_value),
        min_purchase_value: data.min_purchase_value ? parseFloat(data.min_purchase_value) : 0,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        active: data.active,
      };

      if (coupon) {
        // Atualizar cupom existente
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', coupon.id);

        if (error) throw error;
        toast.success("Cupom atualizado com sucesso!");
      } else {
        // Criar novo cupom
        const { error } = await supabase
          .from('coupons')
          .insert([couponData]);

        if (error) throw error;
        toast.success("Cupom criado com sucesso!");
      }

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao salvar cupom:', error);
      if (error.code === '23505') {
        toast.error('Já existe um cupom com este código');
      } else {
        toast.error(error.message || "Erro ao salvar cupom");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const initialData = coupon ? {
    code: coupon.code,
    description: coupon.description || "",
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value.toString(),
    min_purchase_value: coupon.min_purchase_value?.toString() || "",
    max_uses: coupon.max_uses?.toString() || "",
    valid_from: coupon.valid_from,
    valid_until: coupon.valid_until,
    active: coupon.active,
  } : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {coupon ? "Editar Cupom" : "Novo Cupom de Desconto"}
          </DialogTitle>
        </DialogHeader>
        <CouponForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
};
