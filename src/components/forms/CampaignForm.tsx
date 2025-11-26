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

const campaignSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  description: z.string().optional(),
  type: z.enum(["whatsapp", "email", "sms"]),
  message_template: z.string().min(10, "Mensagem deve ter no mínimo 10 caracteres"),
  target_segment: z.string().min(1, "Selecione um segmento"),
  schedule_date: z.string().optional(),
  active: z.boolean().default(true),
});

export type CampaignFormData = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  initialData?: Partial<CampaignFormData>;
  onSubmit: (data: CampaignFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CampaignForm = ({ 
  initialData, 
  onSubmit, 
  onCancel,
  isLoading 
}: CampaignFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: initialData || {
      type: "whatsapp",
      active: true,
    },
  });

  const campaignType = watch("type");
  const active = watch("active");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Campanha *</Label>
        <Input
          id="name"
          placeholder="Ex: Promoção de Aniversário"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Descreva o objetivo da campanha..."
          rows={2}
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo de Campanha *</Label>
          <Select
            value={campaignType}
            onValueChange={(value: "whatsapp" | "email" | "sms") => setValue("type", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target_segment">Segmento Alvo *</Label>
          <Select
            value={watch("target_segment")}
            onValueChange={(value) => setValue("target_segment", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Clientes</SelectItem>
              <SelectItem value="active">Clientes Ativos</SelectItem>
              <SelectItem value="inactive">Clientes Inativos</SelectItem>
              <SelectItem value="vip">Clientes VIP</SelectItem>
              <SelectItem value="birthday">Aniversariantes</SelectItem>
            </SelectContent>
          </Select>
          {errors.target_segment && (
            <p className="text-sm text-destructive">{errors.target_segment.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message_template">Mensagem *</Label>
        <Textarea
          id="message_template"
          placeholder={
            campaignType === "whatsapp" 
              ? "Olá {nome}! 🎉\n\nTemos uma promoção especial para você..."
              : "Olá {nome}, temos uma promoção especial..."
          }
          rows={6}
          {...register("message_template")}
        />
        <p className="text-xs text-muted-foreground">
          Use {"{nome}"} para personalizar com o nome do cliente
        </p>
        {errors.message_template && (
          <p className="text-sm text-destructive">{errors.message_template.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="schedule_date">Agendar Envio (opcional)</Label>
        <Input
          id="schedule_date"
          type="datetime-local"
          {...register("schedule_date")}
        />
        <p className="text-xs text-muted-foreground">
          Deixe vazio para enviar imediatamente
        </p>
      </div>

      <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
        <div>
          <Label htmlFor="active">Campanha Ativa</Label>
          <p className="text-sm text-muted-foreground">
            Desative para pausar a campanha
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
          {isLoading ? <LoadingSpinner size="sm" /> : "Salvar Campanha"}
        </Button>
      </div>
    </form>
  );
};
