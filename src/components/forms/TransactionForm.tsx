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
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const transactionSchema = z.object({
  type: z.enum(["receita", "despesa"]),
  amount: z.string().min(1, "Valor é obrigatório"),
  description: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
  category: z.string().min(1, "Categoria é obrigatória"),
  payment_method: z.enum(["dinheiro", "credito", "debito", "pix"]),
  transaction_date: z.string().min(1, "Data é obrigatória"),
  notes: z.string().optional(),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  initialData?: Partial<TransactionFormData>;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const TransactionForm = ({ 
  initialData, 
  onSubmit, 
  onCancel,
  isLoading 
}: TransactionFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initialData || {
      type: "receita",
      payment_method: "dinheiro",
      transaction_date: new Date().toISOString().split('T')[0],
    },
  });

  const transactionType = watch("type");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="type" className="text-xs sm:text-sm">Tipo *</Label>
          <Select
            value={transactionType}
            onValueChange={(value: "receita" | "despesa") => setValue("type", value)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-xs text-destructive">{errors.type.message}</p>
          )}
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="amount" className="text-xs sm:text-sm">Valor (R$) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            className="text-sm"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="description" className="text-xs sm:text-sm">Descrição *</Label>
        <Input
          id="description"
          placeholder="Ex: Venda de serviço"
          className="text-sm"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="category" className="text-xs sm:text-sm">Categoria *</Label>
          <Select
            value={watch("category")}
            onValueChange={(value) => setValue("category", value)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {transactionType === "receita" ? (
                <>
                  <SelectItem value="servicos">Serviços</SelectItem>
                  <SelectItem value="produtos">Produtos</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="salarios">Salários</SelectItem>
                  <SelectItem value="aluguel">Aluguel</SelectItem>
                  <SelectItem value="fornecedores">Fornecedores</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category.message}</p>
          )}
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="payment_method" className="text-xs sm:text-sm">Forma de Pagamento *</Label>
          <Select
            value={watch("payment_method")}
            onValueChange={(value: "dinheiro" | "credito" | "debito" | "pix") => 
              setValue("payment_method", value)
            }
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
              <SelectItem value="credito">Crédito</SelectItem>
              <SelectItem value="debito">Débito</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
            </SelectContent>
          </Select>
          {errors.payment_method && (
            <p className="text-xs text-destructive">{errors.payment_method.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="transaction_date" className="text-xs sm:text-sm">Data *</Label>
        <Input
          id="transaction_date"
          type="date"
          className="text-sm"
          {...register("transaction_date")}
        />
        {errors.transaction_date && (
          <p className="text-xs text-destructive">{errors.transaction_date.message}</p>
        )}
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="notes" className="text-xs sm:text-sm">Observações</Label>
        <Textarea
          id="notes"
          placeholder="Informações adicionais (opcional)"
          rows={2}
          className="text-sm"
          {...register("notes")}
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
