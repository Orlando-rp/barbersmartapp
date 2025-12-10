import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { StaffScheduleSection, StaffSchedule } from "./StaffScheduleSection";
import { StaffServicesSection } from "./StaffServicesSection";
import { Loader2, Calendar, Briefcase, Save } from "lucide-react";

export const MyStaffProfileForm = () => {
  const { user, barbershopId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffData, setStaffData] = useState<any>(null);

  // Schedule state
  const [useCustomSchedule, setUseCustomSchedule] = useState(false);
  const [schedule, setSchedule] = useState<StaffSchedule | null>(null);

  // Services selection
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    if (user && barbershopId) {
      loadStaffData();
    }
  }, [user, barbershopId]);

  const loadStaffData = async () => {
    if (!user || !barbershopId) return;

    try {
      setLoading(true);

      // Load staff record
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .eq('barbershop_id', barbershopId)
        .maybeSingle();

      if (staffError) throw staffError;

      if (staff) {
        setStaffData(staff);
        setSchedule(staff.schedule || null);
        setUseCustomSchedule(!!staff.schedule);

        // Load staff services
        const { data: services } = await supabase
          .from('staff_services')
          .select('service_id')
          .eq('staff_id', staff.id)
          .eq('is_active', true);

        if (services) {
          setSelectedServices(services.map(s => s.service_id));
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleChange = useCallback((newSchedule: StaffSchedule | null) => {
    setSchedule(newSchedule);
  }, []);

  const handleUseCustomScheduleChange = useCallback((value: boolean) => {
    setUseCustomSchedule(value);
  }, []);

  const handleServicesChange = useCallback((services: string[]) => {
    setSelectedServices(services);
  }, []);

  const handleSave = async () => {
    if (!staffData || !barbershopId) return;

    try {
      setSaving(true);

      // Update schedule
      const scheduleToSave = useCustomSchedule ? schedule : null;
      
      const { error: staffError } = await supabase
        .from('staff')
        .update({
          schedule: scheduleToSave,
        })
        .eq('id', staffData.id);

      if (staffError) throw staffError;

      // Update services
      await supabase
        .from('staff_services')
        .delete()
        .eq('staff_id', staffData.id);

      if (selectedServices.length > 0) {
        const inserts = selectedServices.map(serviceId => ({
          staff_id: staffData.id,
          service_id: serviceId,
          is_active: true,
        }));

        const { error: servicesError } = await supabase
          .from('staff_services')
          .insert(inserts);

        if (servicesError) {
          console.warn('Erro ao salvar serviços:', servicesError);
        }
      }

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas configurações profissionais foram salvas.',
      });
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!staffData) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Você não está cadastrado como profissional nesta barbearia.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Meus Horários de Trabalho
          </CardTitle>
          <CardDescription>
            Configure seus horários de atendimento personalizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaffScheduleSection
            schedule={schedule}
            onScheduleChange={handleScheduleChange}
            useCustomSchedule={useCustomSchedule}
            onUseCustomScheduleChange={handleUseCustomScheduleChange}
          />
        </CardContent>
      </Card>

      {barbershopId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Serviços que Atendo
            </CardTitle>
            <CardDescription>
              Selecione os serviços que você realiza
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StaffServicesSection
              barbershopId={barbershopId}
              selectedServices={selectedServices}
              onServicesChange={handleServicesChange}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          variant="premium"
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
