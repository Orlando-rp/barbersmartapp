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

// Schema for validating staff form data
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
  const { sharedBarbershopId, loading: loadingSharedId } = useSharedBarbershopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [fullName, setFullName] = useState(staff?.profiles?.full_name || "");
  const [preferredName, setPreferredName] = useState(staff?.profiles?.preferred_name || "");
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
  
  // Selected unit IDs for staff_units (unidades onde trabalha)
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

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

  // Available units for selection (unidades filhas da matriz)
  const [availableUnits, setAvailableUnits] = useState<Array<{id: string, name: string}>>([]);

  // Check if organization has multiple units
  const hasMultipleUnits = availableUnits.length > 0;

  // Toggle unit selection
  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnitIds(prev => 
      prev.includes(unitId) 
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    );
  };

  // Load available units (barbershops with parent_id = sharedBarbershopId)
  useEffect(() => {
    const loadUnits = async () => {
      if (!sharedBarbershopId) return;

      const { data } = await supabase
        .from('barbershops')
        .select('id, name')
        .eq('parent_id', sharedBarbershopId)
        .eq('active', true)
        .order('name');
      
      if (data) {
        setAvailableUnits(data);
      }
    };
    
    if (sharedBarbershopId) {
      loadUnits();
    }
  }, [sharedBarbershopId]);

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

  // Load staff services and staff_units for existing staff
  useEffect(() => {
    if (staff?.id) {
      loadStaffServices();
      loadStaffUnits();
    }
  }, [staff?.id]);

  // Load staff_units for existing staff member
  const loadStaffUnits = async () => {
    if (!staff?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('staff_units')
        .select('barbershop_id')
        .eq('staff_id', staff.id)
        .eq('active', true);

      if (error) {
        console.warn('Erro ao carregar staff_units:', error);
        return;
      }

      if (data && data.length > 0) {
        setSelectedUnitIds(data.map(s => s.barbershop_id));
      }
    } catch (error) {
      console.warn('Tabela staff_units pode não existir ainda:', error);
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

  // Save staff_units for a staff member
  const saveStaffUnits = async (staffId: string) => {
    if (!hasMultipleUnits) return;

    try {
      // Get existing staff_units
      const { data: existingUnits } = await supabase
        .from('staff_units')
        .select('id, barbershop_id')
        .eq('staff_id', staffId);

      const existingUnitIds = (existingUnits || []).map(u => u.barbershop_id);

      // Units to add
      const toAdd = selectedUnitIds.filter(id => !existingUnitIds.includes(id));
      
      // Units to remove (deactivate)
      const toRemove = existingUnitIds.filter(id => !selectedUnitIds.includes(id));

      // Add new units
      if (toAdd.length > 0) {
        const inserts = toAdd.map(unitId => ({
          staff_id: staffId,
          barbershop_id: unitId,
          commission_rate: commissionRate,
          schedule: unitSchedule,
          active: true,
        }));

        const { error } = await supabase
          .from('staff_units')
          .insert(inserts);

        if (error) {
          console.warn('Erro ao adicionar staff_units:', error);
        }
      }

      // Deactivate removed units
      for (const unitId of toRemove) {
        const record = existingUnits?.find(u => u.barbershop_id === unitId);
        if (record) {
          await supabase
            .from('staff_units')
            .update({ active: false })
            .eq('id', record.id);
        }
      }

      // Update existing units with new schedule/commission
      const toUpdate = selectedUnitIds.filter(id => existingUnitIds.includes(id));
      for (const unitId of toUpdate) {
        await supabase
          .from('staff_units')
          .update({
            commission_rate: commissionRate,
            schedule: unitSchedule,
            active: true,
          })
          .eq('staff_id', staffId)
          .eq('barbershop_id', unitId);
      }
    } catch (error) {
      console.warn('Erro ao salvar staff_units:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use sharedBarbershopId (matriz) for staff creation
    const matrizId = sharedBarbershopId || barbershopId;
    
    if (!matrizId) {
      toast({
        title: "Erro",
        description: "Barbearia não identificada.",
        variant: "destructive",
      });
      return;
    }

    // Verify current user permissions
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', currentUser.id);
      
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
        // ===== EDITAR MEMBRO EXISTENTE =====
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

        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            preferred_name: preferredName || null,
            phone,
          })
          .eq('id', staff.user_id);

        if (profileError) throw profileError;

        // Update staff record in matriz
        const scheduleToSave = hasMultipleUnits ? null : (useCustomSchedule ? schedule : null);
        
        const { error: staffError } = await supabase
          .from('staff')
          .update({
            specialties,
            commission_rate: commissionRate,
            schedule: scheduleToSave,
          })
          .eq('id', staff.id);

        if (staffError) throw staffError;

        // Update staff_services
        await saveStaffServices(staff.id);

        // Update staff_units (multi-unit assignments)
        await saveStaffUnits(staff.id);

        // Manage roles - admin can also be barber
        const existingRoles = staff.user_roles || [];
        const existingBarberRole = existingRoles.find((r: any) => r.role === 'barbeiro');

        // Update primary role if changed
        if (existingRoles[0]?.role !== role) {
          const existingRoleId = existingRoles[0]?.id;
          
          if (existingRoleId) {
            await supabase
              .from('user_roles')
              .update({ role })
              .eq('id', existingRoleId);
          } else {
            await supabase
              .from('user_roles')
              .insert({
                user_id: staff.user_id,
                role,
                barbershop_id: matrizId,
              });
          }
        }

        // If admin and also barber, ensure barber role exists
        if (role === 'admin' && isAlsoBarber && !existingBarberRole) {
          await supabase
            .from('user_roles')
            .insert({
              user_id: staff.user_id,
              role: 'barbeiro',
              barbershop_id: matrizId,
            });
        }

        // If admin but no longer barber, remove barber role
        if (role === 'admin' && !isAlsoBarber && existingBarberRole) {
          await supabase
            .from('user_roles')
            .delete()
            .eq('id', existingBarberRole.id);
        }

        toast({
          title: "Membro atualizado!",
          description: `${fullName} foi atualizado com sucesso.`,
        });
      } else {
        // ===== ADICIONAR NOVO MEMBRO =====
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

        // 1. Create user in Supabase Auth
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

        let userId = authData?.user?.id;
        
        if (authError) {
          if (authError.message === 'User already registered') {
            toast({
              title: "Usuário já cadastrado",
              description: "Este email já está registrado no sistema. Por favor, use outro email.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          throw authError;
        }
        
        if (!userId) throw new Error("Falha ao criar usuário");

        // 2. Create/update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            barbershop_id: matrizId,
            full_name: fullName,
            phone,
          });

        if (profileError) {
          console.error('Erro ao criar profile:', profileError);
        }

        // 3. Create staff record in MATRIZ (single record per user)
        const scheduleToSave = hasMultipleUnits ? null : (useCustomSchedule ? schedule : null);
        
        const { data: staffResult, error: staffError } = await supabase
          .from('staff')
          .insert({
            barbershop_id: matrizId,
            user_id: userId,
            specialties,
            commission_rate: commissionRate,
            active: true,
            schedule: scheduleToSave,
          })
          .select('id')
          .single();

        if (staffError) {
          console.error('Erro ao criar staff:', staffError);
          throw staffError;
        }

        const staffId = staffResult.id;

        // 4. Create staff_units for selected units
        if (hasMultipleUnits && selectedUnitIds.length > 0) {
          const unitInserts = selectedUnitIds.map(unitId => ({
            staff_id: staffId,
            barbershop_id: unitId,
            commission_rate: commissionRate,
            schedule: unitSchedule,
            active: true,
          }));

          const { error: unitsError } = await supabase
            .from('staff_units')
            .insert(unitInserts);

          if (unitsError) {
            console.warn('Erro ao criar staff_units:', unitsError);
          }
        }

        // 5. Assign role for matriz
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role,
            barbershop_id: matrizId,
          });

        if (roleError) {
          console.error('Erro ao atribuir role:', roleError);
        }

        // If admin and also barber, add barber role
        if (role === 'admin' && isAlsoBarber) {
          await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'barbeiro',
              barbershop_id: matrizId,
            });
        }

        // 6. Save staff_services
        await saveStaffServices(staffId);

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

        <div className="space-y-2">
          <Label htmlFor="preferredName" className="text-sm">Como quer ser chamado</Label>
          <Input
            id="preferredName"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            placeholder="Ex: Zé, Dr. João"
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Usado em relatórios e notificações
          </p>
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

      {/* Unit Selection - Multi-select for staff when organization has multiple units */}
      {hasMultipleUnits && (
        <div className="space-y-3">
          <Label className="text-sm">
            Unidades onde irá trabalhar
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableUnits.map((unit) => (
              <div
                key={unit.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedUnitIds.includes(unit.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleUnitSelection(unit.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedUnitIds.includes(unit.id)}
                  onChange={() => toggleUnitSelection(unit.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">{unit.name}</span>
              </div>
            ))}
          </div>
          {selectedUnitIds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Se nenhuma unidade for selecionada, o profissional trabalhará apenas na matriz.
            </p>
          )}
          {selectedUnitIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              O profissional atuará em {selectedUnitIds.length} unidade(s). Configurações de horário podem ser definidas por unidade.
            </p>
          )}
        </div>
      )}

      {/* Multi-Unit Schedule Section */}
      {(role === 'barbeiro' || (role === 'admin' && isAlsoBarber)) && hasMultipleUnits && selectedUnitIds.length > 0 && (
        <StaffUnitsScheduleSection
          barbershopIds={selectedUnitIds}
          schedule={unitSchedule}
          onScheduleChange={handleUnitScheduleChange}
        />
      )}

      {/* Individual Schedule Section (single unit) */}
      {(role === 'barbeiro' || (role === 'admin' && isAlsoBarber)) && !hasMultipleUnits && (
        <StaffScheduleSection
          schedule={schedule}
          onScheduleChange={handleScheduleChange}
          useCustomSchedule={useCustomSchedule}
          onUseCustomScheduleChange={handleUseCustomScheduleChange}
          barbershopId={barbershopId}
        />
      )}

      {/* Services Selection Section */}
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
