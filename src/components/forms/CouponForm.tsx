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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Código do Cupom *</Label>
          <Input
            id="code"
            placeholder="DESCONTO10"
            {...register("code")}
            className="uppercase"
          />
          {errors.code && (
            <p className="text-sm text-destructive">{errors.code.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount_type">Tipo de Desconto *</Label>
          <Select
            value={discountType}
            onValueChange={(value: "percentage" | "fixed") => setValue("discount_type", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentual (%)</SelectItem>
              <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Descreva a oferta..."
          rows={3}
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discount_value">
            Valor do Desconto * {discountType === "percentage" ? "(%)" : "(R$)"}
          </Label>
          <Input
            id="discount_value"
            type="number"
            step="0.01"
            placeholder={discountType === "percentage" ? "10" : "20.00"}
            {...register("discount_value")}
          />
          {errors.discount_value && (
            <p className="text-sm text-destructive">{errors.discount_value.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="min_purchase_value">Compra Mínima (R$)</Label>
          <Input
            id="min_purchase_value"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("min_purchase_value")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_uses">Máximo de Usos (deixe vazio para ilimitado)</Label>
        <Input
          id="max_uses"
          type="number"
          placeholder="Ex: 100"
          {...register("max_uses")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="valid_from">Válido De *</Label>
          <Input
            id="valid_from"
            type="date"
            {...register("valid_from")}
          />
          {errors.valid_from && (
            <p className="text-sm text-destructive">{errors.valid_from.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="valid_until">Válido Até *</Label>
          <Input
            id="valid_until"
            type="date"
            {...register("valid_until")}
          />
          {errors.valid_until && (
            <p className="text-sm text-destructive">{errors.valid_until.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
        <div>
          <Label htmlFor="active">Cupom Ativo</Label>
          <p className="text-sm text-muted-foreground">
            Desative para pausar o cupom temporariamente
          </p>
        </div>
        <Switch
          id="active"
          checked={active}
          onCheckedChange={(checked) => setValue("active", checked)}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" variant="premium" disabled={isLoading} className="flex-1">
          {isLoading ? <LoadingSpinner size="sm" /> : "Salvar Cupom"}
        </Button>
      </div>
    </form>
  );
};
