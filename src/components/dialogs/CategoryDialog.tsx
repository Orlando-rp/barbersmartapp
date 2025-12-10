import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tag } from "lucide-react";

interface CategoryDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editingCategory?: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    active: boolean;
  } | null;
  onSave: (category: { name: string; description?: string; color?: string; active?: boolean }) => Promise<any>;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#ef4444', // red
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6b7280', // gray
];

export const CategoryDialog = ({ 
  children, 
  open, 
  onOpenChange, 
  editingCategory,
  onSave 
}: CategoryDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState(editingCategory?.name || "");
  const [description, setDescription] = useState(editingCategory?.description || "");
  const [color, setColor] = useState(editingCategory?.color || "#3b82f6");
  const [active, setActive] = useState(editingCategory?.active ?? true);
  const [loading, setLoading] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;

  const resetForm = () => {
    if (editingCategory) {
      setName(editingCategory.name);
      setDescription(editingCategory.description || "");
      setColor(editingCategory.color || "#3b82f6");
      setActive(editingCategory.active);
    } else {
      setName("");
      setDescription("");
      setColor("#3b82f6");
      setActive(true);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm();
    }
    setIsOpen(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    setLoading(true);
    try {
      const result = await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        active,
      });

      if (result !== false && result !== null) {
        setIsOpen(false);
        resetForm();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            {editingCategory ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nome da Categoria *</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Corte Masculino"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-description">Descrição</Label>
            <Textarea
              id="cat-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a categoria..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === presetColor 
                      ? 'border-foreground scale-110' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
          </div>

          {editingCategory && (
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <Label htmlFor="cat-active">Categoria Ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Categorias inativas não aparecem ao criar serviços
                </p>
              </div>
              <Switch
                id="cat-active"
                checked={active}
                onCheckedChange={setActive}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="premium" disabled={loading || !name.trim()}>
              {loading ? "Salvando..." : editingCategory ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
