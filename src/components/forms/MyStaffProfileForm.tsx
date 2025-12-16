import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";
import { StaffServicesSection } from "./StaffServicesSection";
import { 
  Loader2, Calendar, Briefcase, Save, Building2, Clock, DollarSign, 
  Copy, RefreshCw, ArrowRight, Check, Home
} from "lucide-react";

import { 
  StandardDaySchedule, 
  StandardWeeklySchedule, 
  DEFAULT_WEEKLY_SCHEDULE, 
  DAY_LABELS, 
  DayName 
} from '@/types/schedule';

interface StaffUnit {
  id: string; // staff_units.id or staff.id for matriz
  staff_id: string; // staff.id (always the same for all units)
  barbershop_id: string;
  barbershop_name: string;
  commission_rate: number;
  schedule: StandardWeeklySchedule | null;
  active: boolean;
  is_matriz: boolean;
}

export const MyStaffProfileForm = () => {
  const { user, barbershopId } = useAuth();
  const { sharedBarbershopId } = useSharedBarbershopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffUnits, setStaffUnits] = useState<StaffUnit[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [mainStaffId, setMainStaffId] = useState<string>("");

  // Services selection (shared across all units - stored at staff level)
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  // Sync dialog state
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncSource, setSyncSource] = useState<string>("");
  const [syncTargets, setSyncTargets] = useState<string[]>([]);
  const [syncType, setSyncType] = useState<'schedule'>('schedule');

  useEffect(() => {
    if (user && sharedBarbershopId) {
      loadStaffData();
    }
  }, [user, sharedBarbershopId]);

  const loadStaffData = async () => {
    if (!user || !sharedBarbershopId) return;

    try {
      setLoading(true);

      // 1. Load main staff record (from matriz)
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
        .eq('barbershop_id', sharedBarbershopId)
        .maybeSingle();

      if (staffError) throw staffError;

      if (!staffData) {
        // Try to find any staff record for this user
        const { data: anyStaff } = await supabase
          .from('staff')
          .select('id, barbershop_id, commission_rate, schedule, active, barbershops(name)')
          .eq('user_id', user.id)
          .eq('active', true)
          .limit(1)
          .maybeSingle();

        if (!anyStaff) {
          setLoading(false);
          return;
        }

        // Use this staff record
        setMainStaffId(anyStaff.id);
        
        const units: StaffUnit[] = [{
          id: anyStaff.id,
          staff_id: anyStaff.id,
          barbershop_id: anyStaff.barbershop_id,
          barbershop_name: (anyStaff.barbershops as any)?.name || 'Barbearia',
          commission_rate: anyStaff.commission_rate || 0,
          schedule: anyStaff.schedule || DEFAULT_WEEKLY_SCHEDULE,
          active: anyStaff.active,
          is_matriz: true,
        }];

        setStaffUnits(units);
        setActiveTab(units[0]?.barbershop_id || "");

        // Load services
        await loadStaffServices(anyStaff.id);
        setLoading(false);
        return;
      }

      setMainStaffId(staffData.id);

      // 2. Load staff_units for this staff
      const { data: unitsData, error: unitsError } = await supabase
        .from('staff_units')
        .select(`
          id,
          barbershop_id,
          commission_rate,
          schedule,
          active,
          barbershops(name)
        `)
        .eq('staff_id', staffData.id)
        .eq('active', true);

      // Build units list - start with matriz
      const units: StaffUnit[] = [{
        id: staffData.id,
        staff_id: staffData.id,
        barbershop_id: staffData.barbershop_id,
        barbershop_name: (staffData.barbershops as any)?.name || 'Matriz',
        commission_rate: staffData.commission_rate || 0,
        schedule: staffData.schedule || DEFAULT_WEEKLY_SCHEDULE,
        active: staffData.active,
        is_matriz: true,
      }];

      // Add units from staff_units
      if (unitsData && unitsData.length > 0 && !unitsError) {
        for (const unit of unitsData) {
          units.push({
            id: unit.id,
            staff_id: staffData.id,
            barbershop_id: unit.barbershop_id,
            barbershop_name: (unit.barbershops as any)?.name || 'Unidade',
            commission_rate: unit.commission_rate || staffData.commission_rate || 0,
            schedule: unit.schedule || staffData.schedule || DEFAULT_WEEKLY_SCHEDULE,
            active: unit.active,
            is_matriz: false,
          });
        }
      }

      setStaffUnits(units);
      setActiveTab(units[0]?.barbershop_id || "");

      // 3. Load services (shared at staff level)
      await loadStaffServices(staffData.id);

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

  const loadStaffServices = async (staffId: string) => {
    const { data: services } = await supabase
      .from('staff_services')
      .select('service_id')
      .eq('staff_id', staffId)
      .eq('is_active', true);

    setSelectedServices(services?.map(s => s.service_id) || []);
  };

  const handleScheduleChange = (
    barbershopId: string,
    day: string,
    field: 'start' | 'end' | 'enabled' | 'break_start' | 'break_end',
    value: string | boolean | null
  ) => {
    setStaffUnits(prev => prev.map(unit => {
      if (unit.barbershop_id !== barbershopId) return unit;
      
      const currentSchedule = unit.schedule || DEFAULT_WEEKLY_SCHEDULE;
      const dayKey = day as DayName;
      return {
        ...unit,
        schedule: {
          ...currentSchedule,
          [dayKey]: {
            ...currentSchedule[dayKey],
            [field]: value,
          },
        },
      };
    }));
  };

  const handleServicesChange = useCallback((services: string[]) => {
    setSelectedServices(services);
  }, []);

  // Sync schedule from one unit to others
  const handleSyncSchedule = (sourceUnitId: string, targetUnitIds: string[]) => {
    const sourceUnit = staffUnits.find(u => u.barbershop_id === sourceUnitId);
    if (!sourceUnit?.schedule) return;

    setStaffUnits(prev => prev.map(unit => {
      if (targetUnitIds.includes(unit.barbershop_id)) {
        return {
          ...unit,
          schedule: { ...sourceUnit.schedule! },
        };
      }
      return unit;
    }));

    toast({
      title: 'Horários sincronizados!',
      description: `Horários copiados para ${targetUnitIds.length} unidade(s).`,
    });
  };

  // Handle sync confirmation
  const handleConfirmSync = () => {
    if (!syncSource || syncTargets.length === 0) return;
    handleSyncSchedule(syncSource, syncTargets);
    setSyncDialogOpen(false);
    setSyncSource("");
    setSyncTargets([]);
  };

  // Open sync dialog
  const openSyncDialog = (sourceUnitId: string) => {
    setSyncSource(sourceUnitId);
    setSyncType('schedule');
    setSyncTargets(staffUnits.filter(u => u.barbershop_id !== sourceUnitId).map(u => u.barbershop_id));
    setSyncDialogOpen(true);
  };

  // Sync all schedules to match current unit
  const syncScheduleToAllUnits = (sourceUnitId: string) => {
    const otherUnits = staffUnits.filter(u => u.barbershop_id !== sourceUnitId);
    handleSyncSchedule(sourceUnitId, otherUnits.map(u => u.barbershop_id));
  };

  const handleSave = async () => {
    if (!mainStaffId) return;

    try {
      setSaving(true);

      for (const unit of staffUnits) {
        if (unit.is_matriz) {
          // Update main staff record
          const { error: staffError } = await supabase
            .from('staff')
            .update({
              schedule: unit.schedule,
              commission_rate: unit.commission_rate,
            })
            .eq('id', unit.id);

          if (staffError) throw staffError;
        } else {
          // Update staff_units record
          const { error: unitError } = await supabase
            .from('staff_units')
            .update({
              schedule: unit.schedule,
              commission_rate: unit.commission_rate,
            })
            .eq('id', unit.id);

          if (unitError) throw unitError;
        }
      }

      // Update services (at staff level)
      await supabase
        .from('staff_services')
        .delete()
        .eq('staff_id', mainStaffId);

      if (selectedServices.length > 0) {
        const inserts = selectedServices.map(serviceId => ({
          staff_id: mainStaffId,
          service_id: serviceId,
          is_active: true,
        }));

        await supabase
          .from('staff_services')
          .insert(inserts);
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

  // Single unit view (only matriz, no additional units)
  if (staffUnits.length === 1) {
    const unit = staffUnits[0];
    const schedule = unit.schedule || DEFAULT_WEEKLY_SCHEDULE;

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
              const daySchedule = schedule[day as DayName] || DEFAULT_WEEKLY_SCHEDULE[day as DayName];

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
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">Horário:</span>
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16">Intervalo:</span>
                        <Input
                          type="time"
                          value={daySchedule.break_start || ''}
                          onChange={(e) => handleScheduleChange(unit.barbershop_id, day, 'break_start', e.target.value || null)}
                          className="w-28 text-sm"
                          placeholder="--:--"
                        />
                        <span className="text-muted-foreground text-sm">até</span>
                        <Input
                          type="time"
                          value={daySchedule.break_end || ''}
                          onChange={(e) => handleScheduleChange(unit.barbershop_id, day, 'break_end', e.target.value || null)}
                          className="w-28 text-sm"
                          placeholder="--:--"
                        />
                      </div>
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

        <StaffServicesSection
          barbershopId={sharedBarbershopId || unit.barbershop_id}
          selectedServices={selectedServices}
          onServicesChange={handleServicesChange}
        />

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
        <span className="font-medium">Você trabalha em {staffUnits.length} localidade(s)</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {staffUnits.map((unit) => (
            <TabsTrigger
              key={unit.barbershop_id}
              value={unit.barbershop_id}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              {unit.is_matriz ? (
                <Home className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              <span className="truncate max-w-[100px] sm:max-w-none">{unit.barbershop_name}</span>
              {unit.is_matriz && (
                <Badge variant="secondary" className="hidden sm:inline-flex text-xs">Matriz</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {staffUnits.map((unit) => {
          const schedule = unit.schedule || DEFAULT_WEEKLY_SCHEDULE;
          const enabledDays = Object.values(schedule).filter((d: StandardDaySchedule) => d.enabled).length;

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
                {unit.is_matriz && (
                  <Badge variant="default" className="gap-1">
                    <Home className="h-3 w-3" />
                    Matriz
                  </Badge>
                )}
              </div>

              {/* Schedule */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Horários em {unit.barbershop_name}
                    </CardTitle>
                    {staffUnits.length > 1 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            <span className="hidden sm:inline">Sincronizar</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Copiar horários para</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => syncScheduleToAllUnits(unit.barbershop_id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Todas as outras unidades
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {staffUnits
                            .filter(u => u.barbershop_id !== unit.barbershop_id)
                            .map(targetUnit => (
                              <DropdownMenuItem
                                key={targetUnit.barbershop_id}
                                onClick={() => handleSyncSchedule(unit.barbershop_id, [targetUnit.barbershop_id])}
                              >
                                <ArrowRight className="h-4 w-4 mr-2" />
                                {targetUnit.barbershop_name}
                              </DropdownMenuItem>
                            ))
                          }
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(DAY_LABELS).map(([day, label]) => {
                    const daySchedule = schedule[day as DayName] || DEFAULT_WEEKLY_SCHEDULE[day as DayName];

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
                          <div className="flex flex-col gap-2 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-16">Horário:</span>
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
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-16">Intervalo:</span>
                              <Input
                                type="time"
                                value={daySchedule.break_start || ''}
                                onChange={(e) => handleScheduleChange(unit.barbershop_id, day, 'break_start', e.target.value || null)}
                                className="w-28 text-sm"
                                placeholder="--:--"
                              />
                              <span className="text-muted-foreground text-sm">até</span>
                              <Input
                                type="time"
                                value={daySchedule.break_end || ''}
                                onChange={(e) => handleScheduleChange(unit.barbershop_id, day, 'break_end', e.target.value || null)}
                                className="w-28 text-sm"
                                placeholder="--:--"
                              />
                            </div>
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
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Shared Services Section - services are the same across all units */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Serviços que Realizo
          </CardTitle>
          <CardDescription>
            Os serviços são compartilhados em todas as unidades onde você trabalha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaffServicesSection
            barbershopId={sharedBarbershopId || staffUnits[0]?.barbershop_id}
            selectedServices={selectedServices}
            onServicesChange={handleServicesChange}
          />
        </CardContent>
      </Card>

      {/* Quick Sync All Button */}
      {staffUnits.length > 1 && (
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-medium text-sm">Sincronização Rápida de Horários</h4>
                <p className="text-xs text-muted-foreground">
                  Copie os horários da unidade atual para as outras
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openSyncDialog(activeTab)}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sincronizar Horários
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Confirmation Dialog */}
      <AlertDialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Sincronização</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá copiar os <strong>horários</strong> de{' '}
              <strong>{staffUnits.find(u => u.barbershop_id === syncSource)?.barbershop_name}</strong>{' '}
              para as outras {syncTargets.length} unidade(s).
              <br /><br />
              As configurações atuais das outras unidades serão substituídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSync}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
