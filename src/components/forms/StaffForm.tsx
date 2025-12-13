import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";
import { z } from "zod";
import { StaffScheduleSection, StaffSchedule } from "./StaffScheduleSection";
import { StaffServicesSection } from "./StaffServicesSection";
import { StaffUnitsScheduleSection, StaffUnitSchedule } from "./StaffUnitsScheduleSection";
import { StaffAvatarUpload } from "@/components/profile/StaffAvatarUpload";
import { StandardWeeklySchedule } from "@/types/schedule";

interface StaffFormProps {
  staff?: any;
  onClose?: () => void;
  onSuccess?: () => void;
}

// Schema for validating staff form data - only includes fields that exist in the database
const staffSchema = z.object({
  full_name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
  role: z.enum(['admin', 'barbeiro', 'recepcionista']),
  commission_rate: z.number().min(0).max(100),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
});

// Schema for staff table insert/update - only valid database columns
const staffTableSchema = z.object({
  barbershop_id: z.string().uuid(),
  user_id: z.string().uuid(),
  specialties: z.array(z.string()).optional(),
  commission_rate: z.number().min(0).max(100),
  active: z.boolean(),
  schedule: z.record(z.any()).nullable().optional(),
});

export const StaffForm = ({ staff, onClose, onSuccess }: StaffFormProps) => {
  const { barbershopId, barbershops } = useAuth();
  const { sharedBarbershopId, loading: loadingSharedId } = useSharedBarbershopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [fullName, setFullName] = useState(staff?.profiles?.full_name || "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(staff?.profiles?.phone || "");
  const [password, setPassword] = useState("");
  // Determine primary role - admin takes precedence
  const primaryRole = staff?.user_roles?.find((r: any) => r.role === 'admin')?.role 
    || staff?.user_roles?.[0]?.role 
    || "barbeiro";
  const [role, setRole] = useState<string>(primaryRole);
  const [isAlsoBarber, setIsAlsoBarber] = useState(
    primaryRole === 'admin' && staff?.user_roles?.some((r: any) => r.role === 'barbeiro') || false
  );
  const [commissionRate, setCommissionRate] = useState(staff?.commission_rate || 0);
  const [specialties] = useState<string[]>(staff?.specialties || []);
  
  // Selected barbershops for new staff (multi-select)
  const [selectedBarbershopIds, setSelectedBarbershopIds] = useState<string[]>(
    staff?.barbershop_id ? [staff.barbershop_id] : (barbershopId ? [barbershopId] : [])
  );

  // Individual schedule (for single unit)
  const [useCustomSchedule, setUseCustomSchedule] = useState(!!staff?.schedule);
  const [schedule, setSchedule] = useState<StaffSchedule | null>(staff?.schedule || null);

  // Multi-unit schedule
  const [unitSchedule, setUnitSchedule] = useState<StaffUnitSchedule | null>(staff?.schedule || null);

  // Services selection
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(staff?.profiles?.avatar_url || null);

  // All available barbershops for selection
  const [availableBarbershops, setAvailableBarbershops] = useState<Array<{id: string, name: string}>>([]);

  // Memoize barbershop IDs to prevent unnecessary re-renders
  const barbershopIds = useMemo(() => barbershops.map(b => b.id), [barbershops]);
  
  // Check if user has multiple units
  const hasMultipleUnits = barbershops.length > 1;

  // Toggle barbershop selection
  const toggleBarbershopSelection = (shopId: string) => {
    setSelectedBarbershopIds(prev => 
      prev.includes(shopId) 
        ? prev.filter(id => id !== shopId)
        : [...prev, shopId]
    );
  };

  // Load available barbershops
  useEffect(() => {
    const loadBarbershops = async () => {
      const { data } = await supabase
        .from('barbershops')
        .select('id, name')
        .in('id', barbershopIds)
        .eq('active', true)
        .order('name');
      
      if (data) {
        setAvailableBarbershops(data);
      }
    };
    
    if (barbershopIds.length > 0) {
      loadBarbershops();
    }
  }, [barbershopIds]);

  // Stable callbacks for child components
  const handleUnitScheduleChange = useCallback((newSchedule: StaffUnitSchedule) => {
    setUnitSchedule(newSchedule);
  }, []);

  const handleServicesChange = useCallback((services: string[]) => {
    setSelectedServices(services);
  }, []);

  const handleScheduleChange = useCallback((newSchedule: StandardWeeklySchedule | null) => {
    setSchedule(newSchedule);
  }, []);

  const handleUseCustomScheduleChange = useCallback((value: boolean) => {
    setUseCustomSchedule(value);
  }, []);

  // Load staff services and all barbershops where this staff works
  useEffect(() => {
    if (staff?.id) {
      loadStaffServices();
    }
    if (staff?.user_id) {
      loadStaffBarbershops();
    }
  }, [staff?.id, staff?.user_id]);

  // Load all barbershops where this staff member works (for multi-unit editing)
  const loadStaffBarbershops = async () => {
    if (!staff?.user_id) return;
    
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('barbershop_id')
        .eq('user_id', staff.user_id)
        .eq('active', true);

      if (error) {
        console.warn('Erro ao carregar unidades do staff:', error);
        return;
      }

      if (data && data.length > 0) {
        setSelectedBarbershopIds(data.map(s => s.barbershop_id));
      }
    } catch (error) {
      console.warn('Erro ao carregar unidades:', error);
    }
  };

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
        
        const staffUpdateData = {
          specialties,
          commission_rate: commissionRate,
          schedule: scheduleToSave,
        };
        
        const { error: staffError } = await supabase
          .from('staff')
          .update(staffUpdateData)
          .eq('id', staff.id);

        if (staffError) throw staffError;

        // Atualizar staff_services
        await saveStaffServices(staff.id);

        // Gerenciar unidades onde o staff trabalha (multi-unit)
        if (hasMultipleUnits && selectedBarbershopIds.length > 0) {
          // Buscar todos os registros staff deste usuário
          const { data: existingStaffRecords } = await supabase
            .from('staff')
            .select('id, barbershop_id')
            .eq('user_id', staff.user_id);

          const existingBarbershopIds = (existingStaffRecords || []).map(s => s.barbershop_id);

          // Unidades para adicionar (não existem ainda)
          const toAdd = selectedBarbershopIds.filter(id => !existingBarbershopIds.includes(id));
          
          // Unidades para remover (existem mas não estão selecionadas)
          const toRemove = existingBarbershopIds.filter(id => !selectedBarbershopIds.includes(id));

          // Adicionar novos registros staff
          for (const shopId of toAdd) {
            const { error: addError } = await supabase
              .from('staff')
              .insert({
                barbershop_id: shopId,
                user_id: staff.user_id,
                commission_rate: commissionRate,
                schedule: scheduleToSave,
                active: true,
              });

            if (addError) {
              console.warn(`Erro ao adicionar staff à unidade ${shopId}:`, addError);
            }
          }

          // Desativar registros staff das unidades removidas
          for (const shopId of toRemove) {
            const recordToRemove = existingStaffRecords?.find(s => s.barbershop_id === shopId);
            if (recordToRemove) {
              const { error: removeError } = await supabase
                .from('staff')
                .update({ active: false })
                .eq('id', recordToRemove.id);

              if (removeError) {
                console.warn(`Erro ao remover staff da unidade ${shopId}:`, removeError);
              }
            }
          }

          // Atualizar schedule em todos os registros staff ativos
          for (const shopId of selectedBarbershopIds) {
            if (!toAdd.includes(shopId)) { // Não precisa atualizar os recém-adicionados
              const { error: updateError } = await supabase
                .from('staff')
                .update({ 
                  schedule: scheduleToSave,
                  commission_rate: commissionRate,
                })
                .eq('user_id', staff.user_id)
                .eq('barbershop_id', shopId);

              if (updateError) {
                console.warn(`Erro ao atualizar staff na unidade ${shopId}:`, updateError);
              }
            }
          }
        }

        // Gerenciar roles - admin pode também ser barbeiro
        const existingRoles = staff.user_roles || [];
        const existingAdminRole = existingRoles.find((r: any) => r.role === 'admin');
        const existingBarberRole = existingRoles.find((r: any) => r.role === 'barbeiro');

        // Atualizar role principal
        if (existingRoles[0]?.role !== role) {
          const existingRoleId = existingRoles[0]?.id;
          
          if (existingRoleId) {
            const { error: roleError } = await supabase
              .from('user_roles')
              .update({ role })
              .eq('id', existingRoleId);

            if (roleError) {
              console.warn('Erro ao atualizar role:', roleError);
            }
          } else {
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: staff.user_id,
                role,
                barbershop_id: barbershopId,
              });

            if (roleError) {
              console.warn('Erro ao inserir role:', roleError);
            }
          }
        }

        // Se é admin e também barbeiro, garantir que tem a role de barbeiro
        if (role === 'admin' && isAlsoBarber && !existingBarberRole) {
          const { error: barberRoleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: staff.user_id,
              role: 'barbeiro',
              barbershop_id: barbershopId,
            });

          if (barberRoleError) {
            console.warn('Erro ao adicionar role de barbeiro:', barberRoleError);
          }
        }

        // Se é admin mas não é mais barbeiro, remover role de barbeiro
        if (role === 'admin' && !isAlsoBarber && existingBarberRole) {
          const { error: removeBarberError } = await supabase
            .from('user_roles')
            .delete()
            .eq('id', existingBarberRole.id);

          if (removeBarberError) {
            console.warn('Erro ao remover role de barbeiro:', removeBarberError);
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
        const primaryBarbershopId = selectedBarbershopIds[0] || barbershopId;
        
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            barbershop_id: primaryBarbershopId,
            full_name: fullName,
            phone,
          });

        if (profileError) {
          console.error('Erro ao criar profile:', profileError);
          // Continuar mesmo com erro no profile, pois o trigger pode ter criado
        }

        // 3. Criar registros na tabela staff para cada barbearia selecionada
        const scheduleToSave = hasMultipleUnits ? unitSchedule : (useCustomSchedule ? schedule : null);
        const targetBarbershops = selectedBarbershopIds.length > 0 ? selectedBarbershopIds : [barbershopId];
        
        let firstStaffId: string | null = null;
        
        for (const shopId of targetBarbershops) {
          if (!shopId) continue;
          
          const staffInsertData = {
            barbershop_id: shopId,
            user_id: userId,
            specialties,
            commission_rate: commissionRate,
            active: true,
            schedule: scheduleToSave,
          };

          const { data: staffResult, error: staffError } = await supabase
            .from('staff')
            .insert(staffInsertData)
            .select('id')
            .single();

          if (staffError) {
            console.error(`Erro ao criar staff para barbearia ${shopId}:`, staffError);
            continue;
          }
          
          if (!firstStaffId && staffResult?.id) {
            firstStaffId = staffResult.id;
          }
        }


        // 4. Atribuir role para a barbearia principal
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role,
            barbershop_id: primaryBarbershopId,
          });

        if (roleError) {
          console.error('Erro ao atribuir role:', roleError);
        }

        // Se é admin e também barbeiro, adicionar role de barbeiro
        if (role === 'admin' && isAlsoBarber) {
          const { error: barberRoleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'barbeiro',
              barbershop_id: primaryBarbershopId,
            });

          if (barberRoleError) {
            console.warn('Erro ao adicionar role de barbeiro:', barberRoleError);
          }
        }

        // 5. Salvar staff_services para o primeiro staff criado
        if (firstStaffId) {
          await saveStaffServices(firstStaffId);
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
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Avatar Upload - Only show when editing existing staff */}
      {staff && (
        <div className="flex justify-center pb-4 border-b">
          <StaffAvatarUpload
            userId={staff.user_id}
            currentAvatarUrl={avatarUrl}
            fullName={fullName}
            onAvatarUpdate={setAvatarUrl}
            size="md"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm">Nome Completo *</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome completo"
            required
            className="text-sm"
          />
        </div>

        {!staff && (
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
              className="text-sm"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm">Telefone *</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            required
            className="text-sm"
          />
        </div>

        {!staff && (
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm">Senha *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              className="text-sm"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="role" className="text-sm">Função *</Label>
          <select
            id="role"
            value={role}
            onChange={(e) => {
              const newRole = e.target.value;
              setRole(newRole);
              // Auto-enable isAlsoBarber when switching to admin from barbeiro
              if (newRole === 'admin' && role === 'barbeiro') {
                setIsAlsoBarber(true);
              }
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="barbeiro">Barbeiro</option>
            <option value="recepcionista">Recepcionista</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        {role === 'admin' && (
          <div className="space-y-2 flex items-end">
            <div className="flex items-center space-x-2 pb-2">
              <input
                type="checkbox"
                id="isAlsoBarber"
                checked={isAlsoBarber}
                onChange={(e) => setIsAlsoBarber(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isAlsoBarber" className="text-sm font-normal cursor-pointer">
                Também atua como barbeiro
              </Label>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="commissionRate" className="text-sm">Comissão (%) *</Label>
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
            className="text-sm"
          />
        </div>
      </div>

      {/* Barbershop Selection - Multi-select for staff when user has multiple units */}
      {hasMultipleUnits && availableBarbershops.length > 1 && (
        <div className="space-y-3">
          <Label className="text-sm">
            {staff ? 'Unidades onde trabalha *' : 'Barbearias onde irá trabalhar *'}
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableBarbershops.map((shop) => (
              <div
                key={shop.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedBarbershopIds.includes(shop.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleBarbershopSelection(shop.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedBarbershopIds.includes(shop.id)}
                  onChange={() => toggleBarbershopSelection(shop.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">{shop.name}</span>
              </div>
            ))}
          </div>
          {selectedBarbershopIds.length === 0 && (
            <p className="text-xs text-destructive">
              Selecione pelo menos uma unidade
            </p>
          )}
          {selectedBarbershopIds.length > 1 && !staff && (
            <p className="text-xs text-muted-foreground">
              O profissional será cadastrado em {selectedBarbershopIds.length} unidades. Você poderá configurar horários específicos para cada unidade depois.
            </p>
          )}
        </div>
      )}

      {/* Multi-Unit Schedule Section (shows when user has multiple units and role is barbeiro or admin+barber) */}
      {(role === 'barbeiro' || (role === 'admin' && isAlsoBarber)) && hasMultipleUnits && (
        <StaffUnitsScheduleSection
          barbershopIds={barbershopIds}
          schedule={unitSchedule}
          onScheduleChange={handleUnitScheduleChange}
        />
      )}

      {/* Individual Schedule Section (shows for barbeiro or admin+barber) */}
      {(role === 'barbeiro' || (role === 'admin' && isAlsoBarber)) && !hasMultipleUnits && (
        <StaffScheduleSection
          schedule={schedule}
          onScheduleChange={handleScheduleChange}
          useCustomSchedule={useCustomSchedule}
          onUseCustomScheduleChange={handleUseCustomScheduleChange}
          barbershopId={barbershopId}
        />
      )}

      {/* Services Selection Section - Uses shared barbershop ID for multi-unit */}
      {(role === 'barbeiro' || (role === 'admin' && isAlsoBarber)) && !loadingSharedId && sharedBarbershopId && (
        <StaffServicesSection
          barbershopId={sharedBarbershopId}
          selectedServices={selectedServices}
          onServicesChange={handleServicesChange}
        />
      )}

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" variant="premium" disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Salvando...' : (staff ? 'Atualizar' : 'Adicionar')}
        </Button>
      </div>
    </form>
  );
};
