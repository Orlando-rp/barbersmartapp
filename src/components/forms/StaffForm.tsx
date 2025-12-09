import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { z } from "zod";

interface StaffFormProps {
  staff?: any;
  onClose?: () => void;
  onSuccess?: () => void;
}

const staffSchema = z.object({
  full_name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
  role: z.enum(['admin', 'barbeiro', 'recepcionista']),
  commission_rate: z.number().min(0).max(100),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
});

export const StaffForm = ({ staff, onClose, onSuccess }: StaffFormProps) => {
  const { barbershopId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [fullName, setFullName] = useState(staff?.profiles?.full_name || "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(staff?.profiles?.phone || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(staff?.user_roles?.[0]?.role || "barbeiro");
  const [commissionRate, setCommissionRate] = useState(staff?.commission_rate || 0);
  const [specialties, setSpecialties] = useState<string[]>(staff?.specialties || []);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [isAlsoBarber, setIsAlsoBarber] = useState(staff?.is_also_barber || false);

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      setSpecialties([...specialties, newSpecialty.trim()]);
      setNewSpecialty("");
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter(s => s !== specialty));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barbershopId) {
      toast({
        title: "Erro",
        description: "Barbearia não identificada.",
        variant: "destructive",
      });
      return;
    }

    // Debug: verificar role do usuário atual
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', currentUser.id);
      
      console.log('Current user ID:', currentUser.id);
      console.log('Current barbershop ID:', barbershopId);
      console.log('User roles found:', userRoles);
      
      if (!userRoles || userRoles.length === 0) {
        toast({
          title: "Erro de permissão",
          description: "Sua conta não possui uma função atribuída. Por favor, contate o suporte.",
          variant: "destructive",
        });
        return;
      }

      const hasAdminRole = userRoles.some(r => 
        (r.role === 'admin' || r.role === 'super_admin') && 
        (r.barbershop_id === barbershopId || r.role === 'super_admin')
      );

      if (!hasAdminRole) {
        toast({
          title: "Erro de permissão",
          description: "Você precisa ser administrador desta barbearia para adicionar membros.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (staff) {
        // Editar membro existente
        const validation = staffSchema.omit({ email: true, password: true }).safeParse({
          full_name: fullName,
          phone,
          role: role as any,
          commission_rate: commissionRate,
        });

        if (!validation.success) {
          toast({
            title: "Erro de validação",
            description: validation.error.errors[0].message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Atualizar profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            phone,
          })
          .eq('id', staff.user_id);

        if (profileError) throw profileError;

        // Atualizar staff
        const { error: staffError } = await supabase
          .from('staff')
          .update({
            specialties,
            commission_rate: commissionRate,
            is_also_barber: role === 'admin' ? isAlsoBarber : null,
          })
          .eq('id', staff.id);

        if (staffError) throw staffError;

        // Atualizar role se mudou
        if (staff.user_roles?.[0]?.role !== role) {
          // Deletar role antiga
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', staff.user_id)
            .eq('barbershop_id', barbershopId);

          // Inserir nova role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: staff.user_id,
              role,
              barbershop_id: barbershopId,
            });

          if (roleError) throw roleError;
        }

        toast({
          title: "Membro atualizado!",
          description: `${fullName} foi atualizado com sucesso.`,
        });
      } else {
        // Adicionar novo membro
        const validation = staffSchema.safeParse({
          full_name: fullName,
          email,
          phone,
          role: role as any,
          commission_rate: commissionRate,
          password,
        });

        if (!validation.success) {
          toast({
            title: "Erro de validação",
            description: validation.error.errors[0].message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // 1. Tentar criar usuário no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone,
            },
          },
        });

        // Se usuário já existe, tentar buscar pelo email
        let userId = authData?.user?.id;
        
        if (authError) {
          if (authError.message === 'User already registered') {
            toast({
              title: "Usuário já cadastrado",
              description: "Este email já está registrado no sistema. Por favor, use outro email ou entre em contato com o suporte.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          throw authError;
        }
        
        if (!userId) throw new Error("Falha ao criar usuário");

        // 2. Atualizar profile (caso o trigger não tenha criado)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            barbershop_id: barbershopId,
            full_name: fullName,
            phone,
          });

        if (profileError) {
          console.error('Erro ao criar profile:', profileError);
          // Continuar mesmo com erro no profile, pois o trigger pode ter criado
        }

        // 3. Criar registro na tabela staff
        const { error: staffError } = await supabase
          .from('staff')
          .insert({
            barbershop_id: barbershopId,
            user_id: userId,
            specialties,
            commission_rate: commissionRate,
            active: true,
            is_also_barber: role === 'admin' ? isAlsoBarber : null,
          });

        if (staffError) {
          console.error('Erro ao criar staff:', staffError);
          if (staffError.code === '42501') {
            toast({
              title: "Erro de permissão",
              description: "Você não tem permissão para adicionar membros. Verifique se você é administrador desta barbearia.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          throw staffError;
        }

        // 4. Atribuir role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role,
            barbershop_id: barbershopId,
          });

        if (roleError) {
          console.error('Erro ao atribuir role:', roleError);
          // Não bloquear se falhar, mas logar
        }

        toast({
          title: "Membro adicionado!",
          description: `${fullName} foi adicionado à equipe com sucesso.`,
        });
      }

      onSuccess?.();
      onClose?.();
    } catch (error: any) {
      console.error('Erro ao salvar membro:', error);
      toast({
        title: staff ? 'Erro ao atualizar membro' : 'Erro ao adicionar membro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo *</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome completo"
            required
          />
        </div>

        {!staff && (
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
            />
          </div>
        )}

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

        {!staff && (
          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="role">Função *</Label>
          <Select value={role} onValueChange={(value) => {
            setRole(value);
            if (value !== 'admin') setIsAlsoBarber(false);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="barbeiro">Barbeiro</SelectItem>
              <SelectItem value="recepcionista">Recepcionista</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="commissionRate">Taxa de Comissão (%) *</Label>
          <Input
            id="commissionRate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={commissionRate}
            onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      {role === 'admin' && (
        <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
          <Checkbox
            id="isAlsoBarber"
            checked={isAlsoBarber}
            onCheckedChange={(checked) => setIsAlsoBarber(checked === true)}
          />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="isAlsoBarber" className="cursor-pointer">
              Também atende como barbeiro
            </Label>
            <p className="text-sm text-muted-foreground">
              Marque esta opção se o administrador também realiza atendimentos e deve aparecer nos agendamentos
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="specialties">Especialidades</Label>
        <div className="flex gap-2">
          <Input
            id="specialties"
            value={newSpecialty}
            onChange={(e) => setNewSpecialty(e.target.value)}
            placeholder="Ex: Corte masculino, Barba"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSpecialty();
              }
            }}
          />
          <Button type="button" onClick={handleAddSpecialty} variant="outline">
            Adicionar
          </Button>
        </div>
        {specialties.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {specialties.map((specialty, idx) => (
              <Badge key={idx} variant="secondary" className="px-3 py-1">
                {specialty}
                <button
                  type="button"
                  onClick={() => handleRemoveSpecialty(specialty)}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" variant="premium" disabled={loading}>
          {loading ? 'Salvando...' : (staff ? 'Atualizar Membro' : 'Adicionar Membro')}
        </Button>
      </div>
    </form>
  );
};
