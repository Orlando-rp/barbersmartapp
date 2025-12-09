import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { StaffScheduleSection, StaffSchedule } from "./StaffScheduleSection";
import { StaffServicesSection } from "./StaffServicesSection";
import { StaffUnitsScheduleSection, StaffUnitSchedule } from "./StaffUnitsScheduleSection";

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
  const { barbershopId, barbershops } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [fullName, setFullName] = useState(staff?.profiles?.full_name || "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(staff?.profiles?.phone || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(staff?.user_roles?.[0]?.role || "barbeiro");
  const [commissionRate, setCommissionRate] = useState(staff?.commission_rate || 0);
  const [specialties] = useState<string[]>(staff?.specialties || []);
  const [isAlsoBarber, setIsAlsoBarber] = useState(staff?.is_also_barber || false);

  // Individual schedule (for single unit)
  const [useCustomSchedule, setUseCustomSchedule] = useState(!!staff?.schedule);
  const [schedule, setSchedule] = useState<StaffSchedule | null>(staff?.schedule || null);

  // Multi-unit schedule
  const [unitSchedule, setUnitSchedule] = useState<StaffUnitSchedule | null>(staff?.schedule || null);

  // Services selection
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Memoize barbershop IDs to prevent unnecessary re-renders
  const barbershopIds = useMemo(() => barbershops.map(b => b.id), [barbershops]);
  
  // Check if user has multiple units
  const hasMultipleUnits = barbershops.length > 1;

  // Load staff services if editing
  useEffect(() => {
    if (staff?.id) {
      loadStaffServices();
    }
  }, [staff?.id]);

  const loadStaffServices = async () => {
    if (!staff?.id) return;
    
    try {
      setLoadingServices(true);
      const { data, error } = await supabase
        .from('staff_services')
        .select('service_id')
        .eq('staff_id', staff.id)
        .eq('is_active', true);

      if (error) {
        console.warn('Erro ao carregar serviços do staff:', error);
        return;
      }

      setSelectedServices((data || []).map(s => s.service_id));
    } catch (error) {
      console.warn('Tabela staff_services pode não existir ainda');
    } finally {
      setLoadingServices(false);
    }
  };

  const saveStaffServices = async (staffId: string) => {
    try {
      // First, delete existing associations
      await supabase
        .from('staff_services')
        .delete()
        .eq('staff_id', staffId);

      // Then insert new ones
      if (selectedServices.length > 0) {
        const inserts = selectedServices.map(serviceId => ({
          staff_id: staffId,
          service_id: serviceId,
          is_active: true,
        }));

        const { error } = await supabase
          .from('staff_services')
          .insert(inserts);

        if (error) {
          console.warn('Erro ao salvar staff_services:', error);
        }
      }
    } catch (error) {
      console.warn('Erro ao salvar serviços do staff:', error);
    }
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

        // Atualizar staff com schedule (usa unitSchedule se multi-unidade)
        const scheduleToSave = hasMultipleUnits ? unitSchedule : (useCustomSchedule ? schedule : null);
        
        const { error: staffError } = await supabase
          .from('staff')
          .update({
            specialties,
            commission_rate: commissionRate,
            is_also_barber: role === 'admin' ? isAlsoBarber : null,
            schedule: scheduleToSave,
          })
          .eq('id', staff.id);

        if (staffError) throw staffError;

        // Atualizar staff_services
        await saveStaffServices(staff.id);

        // Atualizar role se mudou (usar UPDATE ao invés de DELETE+INSERT para RLS)
        if (staff.user_roles?.[0]?.role !== role) {
          const existingRoleId = staff.user_roles?.[0]?.id;
          
          if (existingRoleId) {
            // Atualizar role existente
            const { error: roleError } = await supabase
              .from('user_roles')
              .update({ role })
              .eq('id', existingRoleId);

            if (roleError) {
              console.warn('Erro ao atualizar role:', roleError);
              // Não bloquear o fluxo se falhar a atualização de role
            }
          } else {
            // Se não existe role, tentar inserir (pode falhar por RLS)
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: staff.user_id,
                role,
                barbershop_id: barbershopId,
              });

            if (roleError) {
              console.warn('Erro ao inserir role:', roleError);
              // Não bloquear o fluxo se falhar a inserção de role
            }
          }
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

        // 3. Criar registro na tabela staff (usa unitSchedule se multi-unidade)
        const scheduleToSave = hasMultipleUnits ? unitSchedule : (useCustomSchedule ? schedule : null);
        
        const { data: staffInsertData, error: staffError } = await supabase
          .from('staff')
          .insert({
            barbershop_id: barbershopId,
            user_id: userId,
            specialties,
            commission_rate: commissionRate,
            active: true,
            is_also_barber: role === 'admin' ? isAlsoBarber : null,
            schedule: scheduleToSave,
          })
          .select('id')
          .single();

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

        // 5. Salvar staff_services
        if (staffInsertData?.id) {
          await saveStaffServices(staffInsertData.id);
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


      {/* Multi-Unit Schedule Section (shows when user has multiple units) */}
      {(role === 'barbeiro' || isAlsoBarber) && hasMultipleUnits && (
        <StaffUnitsScheduleSection
          barbershopIds={barbershopIds}
          schedule={unitSchedule}
          onScheduleChange={setUnitSchedule}
        />
      )}

      {/* Individual Schedule Section (shows when user has single unit) */}
      {(role === 'barbeiro' || isAlsoBarber) && !hasMultipleUnits && (
        <StaffScheduleSection
          schedule={schedule}
          onScheduleChange={setSchedule}
          useCustomSchedule={useCustomSchedule}
          onUseCustomScheduleChange={setUseCustomSchedule}
        />
      )}

      {/* Services Selection Section */}
      {(role === 'barbeiro' || isAlsoBarber) && barbershopId && (
        <StaffServicesSection
          barbershopId={barbershopId}
          selectedServices={selectedServices}
          onServicesChange={setSelectedServices}
        />
      )}

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
