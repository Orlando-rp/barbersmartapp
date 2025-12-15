import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

interface ProfileFormProps {
  initialData: {
    full_name: string;
    phone: string;
    preferred_name?: string | null;
  };
  onSuccess: () => void;
}

const profileSchema = z.object({
  full_name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
  preferred_name: z.string().trim().max(50).optional().nullable(),
});

export const ProfileForm = ({ initialData, onSuccess }: ProfileFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(initialData.full_name);
  const [phone, setPhone] = useState(initialData.phone);
  const [preferredName, setPreferredName] = useState(initialData.preferred_name || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    const validation = profileSchema.safeParse({
      full_name: fullName,
      phone,
      preferred_name: preferredName || null,
    });

    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone,
          preferred_name: preferredName || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram atualizadas com sucesso.",
      });

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome Completo *</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Seu nome completo"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferredName">Como quer ser chamado</Label>
        <Input
          id="preferredName"
          value={preferredName}
          onChange={(e) => setPreferredName(e.target.value)}
          placeholder="Ex: João, Zé, Doutor Silva"
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">
          Este nome será usado nas notificações e mensagens
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={user?.email || ''}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          O email não pode ser alterado por questões de segurança
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone *</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 99999-9999"
          required
        />
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" variant="premium" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  );
};
