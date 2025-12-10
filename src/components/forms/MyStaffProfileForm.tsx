import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { StaffServicesSection } from "./StaffServicesSection";
import { Loader2, Calendar, Briefcase, Save, Building2, Clock, DollarSign } from "lucide-react";

interface StaffUnit {
  id: string;
  barbershop_id: string;
  barbershop_name: string;
  commission_rate: number;
  schedule: Record<string, { start: string; end: string; enabled: boolean }> | null;
  active: boolean;
}

const DEFAULT_SCHEDULE = {
  monday: { start: '09:00', end: '18:00', enabled: true },
  tuesday: { start: '09:00', end: '18:00', enabled: true },
  wednesday: { start: '09:00', end: '18:00', enabled: true },
  thursday: { start: '09:00', end: '18:00', enabled: true },
  friday: { start: '09:00', end: '18:00', enabled: true },
  saturday: { start: '09:00', end: '14:00', enabled: true },
  sunday: { start: '09:00', end: '14:00', enabled: false },
};

const DAY_LABELS: Record<string, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export const MyStaffProfileForm = () => {
  const { user, barbershopId, barbershops } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffUnits, setStaffUnits] = useState<StaffUnit[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");

  // Services selection (per unit)
  const [selectedServices, setSelectedServices] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (user) {
      loadStaffData();
    }
  }, [user, barbershops]);

  const loadStaffData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const barbershopIds = barbershops.map(b => b.id);

      if (barbershopIds.length === 0) {
        setLoading(false);
        return;
      }

      // Load all staff records for this user across units
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          barbershop_id,
          commission_rate,
          schedule,
          active,
          barbershops(name)
        `)
        .eq('user_id', user.id)
        .in('barbershop_id', barbershopIds);

      if (staffError) throw staffError;

      if (staffData && staffData.length > 0) {
        const units = staffData.map((s: any) => ({
          id: s.id,
          barbershop_id: s.barbershop_id,
          barbershop_name: s.barbershops?.name || 'Barbearia',
          commission_rate: s.commission_rate || 0,
          schedule: s.schedule || DEFAULT_SCHEDULE,
          active: s.active,
        }));

        setStaffUnits(units);
        setActiveTab(units[0]?.barbershop_id || "");

        // Load services for each unit
        const servicesMap: Record<string, string[]> = {};
        for (const unit of units) {
          const { data: services } = await supabase
            .from('staff_services')
            .select('service_id')
            .eq('staff_id', unit.id)
            .eq('is_active', true);

          servicesMap[unit.barbershop_id] = services?.map(s => s.service_id) || [];
        }
        setSelectedServices(servicesMap);
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

  const handleScheduleChange = (
    barbershopId: string,
    day: string,
    field: 'start' | 'end' | 'enabled',
    value: string | boolean
  ) => {
    setStaffUnits(prev => prev.map(unit => {
      if (unit.barbershop_id !== barbershopId) return unit;
      
      const currentSchedule = unit.schedule || DEFAULT_SCHEDULE;
      return {
        ...unit,
        schedule: {
          ...currentSchedule,
          [day]: {
            ...currentSchedule[day],
            [field]: value,
          },
        },
      };
    }));
  };

  const handleServicesChange = useCallback((barbershopId: string, services: string[]) => {
    setSelectedServices(prev => ({
      ...prev,
      [barbershopId]: services,
    }));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);

      for (const unit of staffUnits) {
        // Update schedule
        const { error: staffError } = await supabase
          .from('staff')
          .update({
            schedule: unit.schedule,
          })
          .eq('id', unit.id);

        if (staffError) throw staffError;

        // Update services
        await supabase
          .from('staff_services')
          .delete()
          .eq('staff_id', unit.id);

        const unitServices = selectedServices[unit.barbershop_id] || [];
        if (unitServices.length > 0) {
          const inserts = unitServices.map(serviceId => ({
            staff_id: unit.id,
            service_id: serviceId,
            is_active: true,
          }));

          await supabase
            .from('staff_services')
            .insert(inserts);
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

  if (staffUnits.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Você não está cadastrado como profissional em nenhuma barbearia.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Single unit view
  if (staffUnits.length === 1) {
    const unit = staffUnits[0];
    const schedule = unit.schedule || DEFAULT_SCHEDULE;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meus Horários de Trabalho
            </CardTitle>
            <CardDescription>
              Configure seus horários de atendimento em {unit.barbershop_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(DAY_LABELS).map(([day, label]) => {
              const daySchedule = schedule[day] || DEFAULT_SCHEDULE[day as keyof typeof DEFAULT_SCHEDULE];

              return (
                <div
                  key={day}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border border-border bg-background/50"
                >
                  <div className="flex items-center gap-3 w-full sm:w-28">
                    <Switch
                      checked={daySchedule.enabled}
                      onCheckedChange={(checked) => handleScheduleChange(unit.barbershop_id, day, 'enabled', checked)}
                    />
                    <span className={`font-medium text-sm ${!daySchedule.enabled ? 'text-muted-foreground' : ''}`}>
                      {label}
                    </span>
                  </div>

                  {daySchedule.enabled && (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={daySchedule.start}
                        onChange={(e) => handleScheduleChange(unit.barbershop_id, day, 'start', e.target.value)}
                        className="w-28 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">até</span>
                      <Input
                        type="time"
                        value={daySchedule.end}
                        onChange={(e) => handleScheduleChange(unit.barbershop_id, day, 'end', e.target.value)}
                        className="w-28 text-sm"
                      />
                    </div>
                  )}

                  {!daySchedule.enabled && (
                    <span className="text-sm text-muted-foreground">Folga</span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

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
              barbershopId={unit.barbershop_id}
              selectedServices={selectedServices[unit.barbershop_id] || []}
              onServicesChange={(services) => handleServicesChange(unit.barbershop_id, services)}
            />
          </CardContent>
        </Card>

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
  }

  // Multi-unit view with tabs
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-primary" />
        <span className="font-medium">Você trabalha em {staffUnits.length} unidades</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {staffUnits.map((unit) => (
            <TabsTrigger
              key={unit.barbershop_id}
              value={unit.barbershop_id}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate max-w-[100px] sm:max-w-none">{unit.barbershop_name}</span>
              {unit.active && (
                <Badge variant="secondary" className="hidden sm:inline-flex text-xs">Ativo</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {staffUnits.map((unit) => {
          const schedule = unit.schedule || DEFAULT_SCHEDULE;
          const enabledDays = Object.values(schedule).filter(d => d.enabled).length;

          return (
            <TabsContent key={unit.barbershop_id} value={unit.barbershop_id} className="space-y-6">
              {/* Summary */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {enabledDays} dias/semana
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <DollarSign className="h-3 w-3" />
                  {unit.commission_rate}% comissão
                </Badge>
              </div>

              {/* Schedule */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Horários em {unit.barbershop_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(DAY_LABELS).map(([day, label]) => {
                    const daySchedule = schedule[day] || DEFAULT_SCHEDULE[day as keyof typeof DEFAULT_SCHEDULE];

                    return (
                      <div
                        key={day}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border border-border bg-background/50"
                      >
                        <div className="flex items-center gap-3 w-full sm:w-28">
                          <Switch
                            checked={daySchedule.enabled}
                            onCheckedChange={(checked) => handleScheduleChange(unit.barbershop_id, day, 'enabled', checked)}
                          />
                          <span className={`font-medium text-sm ${!daySchedule.enabled ? 'text-muted-foreground' : ''}`}>
                            {label}
                          </span>
                        </div>

                        {daySchedule.enabled && (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              type="time"
                              value={daySchedule.start}
                              onChange={(e) => handleScheduleChange(unit.barbershop_id, day, 'start', e.target.value)}
                              className="w-28 text-sm"
                            />
                            <span className="text-muted-foreground text-sm">até</span>
                            <Input
                              type="time"
                              value={daySchedule.end}
                              onChange={(e) => handleScheduleChange(unit.barbershop_id, day, 'end', e.target.value)}
                              className="w-28 text-sm"
                            />
                          </div>
                        )}

                        {!daySchedule.enabled && (
                          <span className="text-sm text-muted-foreground">Folga</span>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Services */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Serviços em {unit.barbershop_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StaffServicesSection
                    barbershopId={unit.barbershop_id}
                    selectedServices={selectedServices[unit.barbershop_id] || []}
                    onServicesChange={(services) => handleServicesChange(unit.barbershop_id, services)}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

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
              Salvar Todas as Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
