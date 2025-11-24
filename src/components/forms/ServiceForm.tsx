import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Scissors, DollarSign, Clock, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

interface ServiceFormProps {
  onClose?: () => void;
  editingService?: any;
}

const serviceCategories = [
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
  const [duration, setDuration] = useState(editingService?.duration?.toString() || "");
  const [isActive, setIsActive] = useState(editingService?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  
  const { toast } = useToast();
  const { barbershopId } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!barbershopId) {
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
        barbershop_id: barbershopId,
        name: validatedData.name,
        description: validatedData.description || null,
        category: validatedData.category,
        price: validatedData.price,
        duration: validatedData.duration,
        active: isActive,
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
    <Card className="barbershop-card w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-primary" />
          {editingService ? "Editar Serviço" : "Novo Serviço"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Informações do Serviço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Serviço *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Corte Social"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o serviço oferecido..."
                rows={3}
              />
            </div>
          </div>

          {/* Pricing and Duration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Preço e Duração
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="25.00"
                    className="pl-10"
                  />
                </div>
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (minutos) *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="30"
                    className="pl-10"
                  />
                </div>
                {errors.duration && (
                  <p className="text-sm text-destructive">{errors.duration}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status</h3>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <Label htmlFor="active-status">Serviço Ativo</Label>
                <p className="text-sm text-muted-foreground">
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
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="premium" disabled={loading}>
              {loading ? "Salvando..." : editingService ? "Atualizar Serviço" : "Cadastrar Serviço"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
