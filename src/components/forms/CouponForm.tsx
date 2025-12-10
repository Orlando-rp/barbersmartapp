import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const couponSchema = z.object({
  code: z.string().min(3, "Código deve ter no mínimo 3 caracteres").max(50),
  description: z.string().optional(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.string().min(1, "Valor é obrigatório"),
  min_purchase_value: z.string().optional(),
  max_uses: z.string().optional(),
  valid_from: z.string().min(1, "Data inicial é obrigatória"),
  valid_until: z.string().min(1, "Data final é obrigatória"),
  active: z.boolean().default(true),
});

export type CouponFormData = z.infer<typeof couponSchema>;

interface CouponFormProps {
  initialData?: Partial<CouponFormData>;
  onSubmit: (data: CouponFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CouponForm = ({ 
  initialData, 
  onSubmit, 
  onCancel,
  isLoading 
}: CouponFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: initialData || {
      discount_type: "percentage",
      active: true,
      valid_from: new Date().toISOString().split('T')[0],
    },
  });

  const discountType = watch("discount_type");
  const active = watch("active");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="code" className="text-xs sm:text-sm">Código do Cupom *</Label>
          <Input
            id="code"
            placeholder="DESCONTO10"
            className="uppercase text-sm"
            {...register("code")}
          />
          {errors.code && (
            <p className="text-xs text-destructive">{errors.code.message}</p>
          )}
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="discount_type" className="text-xs sm:text-sm">Tipo de Desconto *</Label>
          <Select
            value={discountType}
            onValueChange={(value: "percentage" | "fixed") => setValue("discount_type", value)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="percentage">Percentual (%)</SelectItem>
              <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="description" className="text-xs sm:text-sm">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Descreva a oferta..."
          rows={2}
          className="text-sm"
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="discount_value" className="text-xs sm:text-sm">
            Valor do Desconto * {discountType === "percentage" ? "(%)" : "(R$)"}
          </Label>
          <Input
            id="discount_value"
            type="number"
            step="0.01"
            placeholder={discountType === "percentage" ? "10" : "20.00"}
            className="text-sm"
            {...register("discount_value")}
          />
          {errors.discount_value && (
            <p className="text-xs text-destructive">{errors.discount_value.message}</p>
          )}
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="min_purchase_value" className="text-xs sm:text-sm">Compra Mínima (R$)</Label>
          <Input
            id="min_purchase_value"
            type="number"
            step="0.01"
            placeholder="0.00"
            className="text-sm"
            {...register("min_purchase_value")}
          />
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="max_uses" className="text-xs sm:text-sm">Máximo de Usos (vazio = ilimitado)</Label>
        <Input
          id="max_uses"
          type="number"
          placeholder="Ex: 100"
          className="text-sm"
          {...register("max_uses")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="valid_from" className="text-xs sm:text-sm">Válido De *</Label>
          <Input
            id="valid_from"
            type="date"
            className="text-sm"
            {...register("valid_from")}
          />
          {errors.valid_from && (
            <p className="text-xs text-destructive">{errors.valid_from.message}</p>
          )}
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="valid_until" className="text-xs sm:text-sm">Válido Até *</Label>
          <Input
            id="valid_until"
            type="date"
            className="text-sm"
            {...register("valid_until")}
          />
          {errors.valid_until && (
            <p className="text-xs text-destructive">{errors.valid_until.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between p-3 sm:p-4 bg-accent/50 rounded-lg">
        <div className="min-w-0 flex-1">
          <Label htmlFor="active" className="text-xs sm:text-sm">Cupom Ativo</Label>
          <p className="text-xs text-muted-foreground truncate">
            Desative para pausar o cupom
          </p>
        </div>
        <Switch
          id="active"
          checked={active}
          onCheckedChange={(checked) => setValue("active", checked)}
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" variant="premium" disabled={isLoading} className="flex-1">
          {isLoading ? <LoadingSpinner size="sm" /> : "Salvar"}
        </Button>
      </div>
    </form>
  );
};
