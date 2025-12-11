import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Scissors, DollarSign, Clock, Tag, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useServiceCategories } from "@/hooks/useServiceCategories";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";
import { ServiceImageUpload } from "@/components/services/ServiceImageUpload";
import { z } from "zod";

interface ServiceFormProps {
  onClose?: () => void;
  editingService?: any;
}

// Fallback categories if DB categories not available
const DEFAULT_CATEGORIES = [
  "Corte",
  "Barba",
  "Sobrancelha",
  "Combo",
  "Tratamento",
  "Outros"
];

const serviceSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1, "Selecione uma categoria"),
  price: z.number().positive("Preço deve ser maior que zero"),
  duration: z.number().positive("Duração deve ser maior que zero"),
});

export const ServiceForm = ({ onClose, editingService }: ServiceFormProps) => {
  const [name, setName] = useState(editingService?.name || "");
  const [description, setDescription] = useState(editingService?.description || "");
  const [category, setCategory] = useState(editingService?.category || "");
  const [price, setPrice] = useState(editingService?.price?.toString() || "");
  const [duration, setDuration] = useState(editingService?.duration ? (editingService.duration / 60).toString() : "");
  const [isActive, setIsActive] = useState(editingService?.active ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(editingService?.image_url || null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  
  const { toast } = useToast();
  const { sharedBarbershopId } = useSharedBarbershopId();
  const { activeCategories, loading: categoriesLoading } = useServiceCategories();

  // Use DB categories or fallback to defaults
  const availableCategories = activeCategories.length > 0 
    ? activeCategories.map(c => c.name) 
    : DEFAULT_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!sharedBarbershopId) {
      toast({
        title: "Erro",
        description: "Barbearia não encontrada. Por favor, faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    try {
      const validatedData = serviceSchema.parse({
        name,
        description: description || undefined,
        category,
        price: Number(price),
        duration: Number(duration),
      });

      setLoading(true);

      const serviceData = {
        barbershop_id: sharedBarbershopId,
        name: validatedData.name,
        description: validatedData.description || null,
        category: validatedData.category,
        price: validatedData.price,
        duration: Math.round(validatedData.duration * 60), // Converte horas para minutos
        active: isActive,
        image_url: imageUrl,
      };

      if (editingService?.id) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;

        toast({
          title: "Serviço Atualizado!",
          description: `${name} foi atualizado com sucesso.`,
        });
      } else {
        const { error } = await supabase
          .from('services')
          .insert([serviceData]);

        if (error) throw error;

        toast({
          title: "Serviço Cadastrado!",
          description: `${name} foi cadastrado com sucesso.`,
        });
      }

      onClose?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const formattedErrors: any = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            formattedErrors[err.path[0]] = err.message;
          }
        });
        setErrors(formattedErrors);
      } else {
        console.error("Error saving service:", error);
        toast({
          title: "Erro ao salvar serviço",
          description: error.message || "Ocorreu um erro ao salvar o serviço.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Scissors className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        <h2 className="text-base sm:text-lg font-semibold">
          {editingService ? "Editar Serviço" : "Novo Serviço"}
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Image */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Imagem do Serviço
          </h3>
          <ServiceImageUpload
            imageUrl={imageUrl}
            serviceName={name}
            onImageChange={setImageUrl}
            disabled={loading}
          />
        </div>

        {/* Basic Information */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Informações do Serviço
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="name" className="text-xs sm:text-sm">Nome do Serviço *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Corte Social"
                className="text-sm"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Categoria *</Label>
              <Select value={category} onValueChange={setCategory} disabled={categoriesLoading}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={categoriesLoading ? "Carregando..." : "Selecione a categoria"} />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="description" className="text-xs sm:text-sm">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o serviço oferecido..."
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        {/* Pricing and Duration */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Preço e Duração
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="price" className="text-xs sm:text-sm">Preço (R$) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="25.00"
                  className="pl-9 sm:pl-10 text-sm"
                />
              </div>
              {errors.price && (
                <p className="text-xs text-destructive">{errors.price}</p>
              )}
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="duration" className="text-xs sm:text-sm">Duração (horas) *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  id="duration"
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="0.5"
                  className="pl-9 sm:pl-10 text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">Ex: 0.5 = 30min, 1 = 1h, 1.5 = 1h30</p>
              {errors.duration && (
                <p className="text-xs text-destructive">{errors.duration}</p>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-sm sm:text-base font-semibold">Status</h3>
          <div className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg">
            <div className="min-w-0 flex-1">
              <Label htmlFor="active-status" className="text-xs sm:text-sm">Serviço Ativo</Label>
              <p className="text-xs text-muted-foreground truncate">
                Serviços ativos aparecerão para agendamento
              </p>
            </div>
            <Switch
              id="active-status"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2 sm:pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" variant="premium" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Salvando..." : editingService ? "Atualizar" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </div>
  );
};
