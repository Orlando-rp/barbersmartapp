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

export const ServiceForm = ({ onClose, editingService }: ServiceFormProps) => {
  const [name, setName] = useState(editingService?.name || "");
  const [description, setDescription] = useState(editingService?.description || "");
  const [category, setCategory] = useState(editingService?.category || "");
  const [price, setPrice] = useState(editingService?.price?.toString() || "");
  const [duration, setDuration] = useState(editingService?.duration?.toString() || "");
  const [isActive, setIsActive] = useState(editingService?.isActive ?? true);
  
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !category || !price || !duration) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(Number(price)) || isNaN(Number(duration))) {
      toast({
        title: "Erro",
        description: "Preço e duração devem ser números válidos.",
        variant: "destructive",
      });
      return;
    }

    const serviceData = {
      id: editingService?.id || Date.now().toString(),
      name,
      description,
      category,
      price: Number(price),
      duration: Number(duration),
      isActive,
      createdAt: editingService?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("Serviço salvo:", serviceData);
    
    toast({
      title: editingService ? "Serviço Atualizado!" : "Serviço Cadastrado!",
      description: `${name} foi ${editingService ? "atualizado" : "cadastrado"} com sucesso.`,
    });

    onClose?.();
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="premium">
              {editingService ? "Atualizar Serviço" : "Cadastrar Serviço"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};