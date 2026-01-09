import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Calendar as CalendarIcon, XCircle, Plus, Save, Building2, AlertCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSelectableUnits } from "@/hooks/useSelectableUnits";

interface DaySchedule {
  day: string;
  label: string;
  enabled: boolean;
  openTime: string;
  closeTime: string;
  breakStart?: string;
  breakEnd?: string;
}

interface BlockedDate {
  id?: string;
  date: Date;
  reason: string;
}

interface SpecialHour {
  id?: string;
  date: Date;
  reason: string;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breakStart?: string;
  breakEnd?: string;
}

const defaultSchedule: DaySchedule[] = [
  { day: 'monday', label: 'Segunda-feira', enabled: true, openTime: '09:00', closeTime: '18:00' },
  { day: 'tuesday', label: 'Terça-feira', enabled: true, openTime: '09:00', closeTime: '18:00' },
  { day: 'wednesday', label: 'Quarta-feira', enabled: true, openTime: '09:00', closeTime: '18:00' },
  { day: 'thursday', label: 'Quinta-feira', enabled: true, openTime: '09:00', closeTime: '18:00' },
  { day: 'friday', label: 'Sexta-feira', enabled: true, openTime: '09:00', closeTime: '18:00' },
  { day: 'saturday', label: 'Sábado', enabled: true, openTime: '09:00', closeTime: '14:00' },
  { day: 'sunday', label: 'Domingo', enabled: false, openTime: '09:00', closeTime: '14:00' },
];

const BusinessHours = () => {
  const { barbershopId, barbershops } = useAuth();
  const { selectableUnits, hasMultipleUnits } = useSelectableUnits(barbershops);
  
  // Estado para unidade selecionada - usa a primeira unidade selecionável ou barbershopId
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [blockReason, setBlockReason] = useState('');
  const [specialHours, setSpecialHours] = useState<SpecialHour[]>([]);
  const [selectedSpecialDate, setSelectedSpecialDate] = useState<Date | undefined>();
  const [specialReason, setSpecialReason] = useState('');
  const [specialIsOpen, setSpecialIsOpen] = useState(true);
  const [specialOpenTime, setSpecialOpenTime] = useState('09:00');
  const [specialCloseTime, setSpecialCloseTime] = useState('18:00');
  const [specialBreakStart, setSpecialBreakStart] = useState('');
  const [specialBreakEnd, setSpecialBreakEnd] = useState('');
  
  // Estados para copiar horários entre unidades
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [selectedUnitsForCopy, setSelectedUnitsForCopy] = useState<string[]>([]);
  const [copyingSchedule, setCopyingSchedule] = useState(false);

  // Define a unidade inicial quando disponível
  useEffect(() => {
    if (!selectedUnitId && selectableUnits.length > 0) {
      // Se o barbershopId atual está entre as unidades selecionáveis, usa ele
      const currentIsSelectable = selectableUnits.find(u => u.id === barbershopId);
      if (currentIsSelectable) {
        setSelectedUnitId(barbershopId!);
      } else {
        // Caso contrário, usa a primeira unidade disponível
        setSelectedUnitId(selectableUnits[0].id);
      }
    } else if (!selectedUnitId && barbershopId && selectableUnits.length === 0) {
      // Se não há unidades selecionáveis, usa o barbershopId direto
      setSelectedUnitId(barbershopId);
    }
  }, [barbershopId, selectableUnits, selectedUnitId]);

  // Carrega os horários quando a unidade selecionada muda
  useEffect(() => {
    if (selectedUnitId) {
      loadBusinessHours();
    }
  }, [selectedUnitId]);

  const importFromLegacySettings = async () => {
    if (!selectedUnitId) return;

    try {
      // Fetch legacy opening_hours from barbershops.settings
      const { data: barbershopData, error: barbershopError } = await supabase
        .from('barbershops')
        .select('settings')
        .eq('id', selectedUnitId)
        .maybeSingle();

      if (barbershopError) throw barbershopError;

      const legacyHours = barbershopData?.settings?.opening_hours;
      
      if (legacyHours && Object.keys(legacyHours).length > 0) {
        // Map legacy format to business_hours format
        const importedSchedule = defaultSchedule.map(day => {
          const legacy = legacyHours[day.day];
          if (legacy) {
            return {
              ...day,
              enabled: true,
              openTime: legacy.open || day.openTime,
              closeTime: legacy.close || day.closeTime,
            };
          }
          return day;
        });

        // Save imported schedule to business_hours table
        const scheduleData = importedSchedule.map(day => ({
          barbershop_id: selectedUnitId,
          day_of_week: day.day,
          is_open: day.enabled,
          open_time: day.openTime,
          close_time: day.closeTime,
          break_start: day.breakStart || null,
          break_end: day.breakEnd || null,
        }));

        const { error: insertError } = await supabase
          .from('business_hours')
          .insert(scheduleData);

        if (insertError) throw insertError;

        setSchedule(importedSchedule);
        toast.success('Horários importados das configurações anteriores!');
      } else {
        // No legacy data, save default schedule
        const scheduleData = defaultSchedule.map(day => ({
          barbershop_id: selectedUnitId,
          day_of_week: day.day,
          is_open: day.enabled,
          open_time: day.openTime,
          close_time: day.closeTime,
          break_start: null,
          break_end: null,
        }));

        const { error: insertError } = await supabase
          .from('business_hours')
          .insert(scheduleData);

        if (insertError) throw insertError;

        toast.info('Horários padrão configurados. Ajuste conforme necessário.');
      }
    } catch (error) {
      console.error('Erro ao importar configurações:', error);
      toast.error('Erro ao importar configurações de horário');
    }
  };

  const loadBusinessHours = async () => {
    try {
      setLoading(true);

      // Load schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('business_hours')
        .select('*')
        .eq('barbershop_id', selectedUnitId)
        .order('day_of_week');

      if (scheduleError) throw scheduleError;

      if (scheduleData && scheduleData.length > 0) {
        const loadedSchedule = defaultSchedule.map(day => {
          const saved = scheduleData.find(s => s.day_of_week === day.day);
          if (saved) {
            return {
              ...day,
              enabled: saved.is_open,
              openTime: saved.open_time,
              closeTime: saved.close_time,
              breakStart: saved.break_start,
              breakEnd: saved.break_end,
            };
          }
          return day;
        });
        setSchedule(loadedSchedule);
      } else {
        // Auto-import from settings.opening_hours if business_hours is empty
        await importFromLegacySettings();
      }

      // Load blocked dates (handle table not existing)
      try {
        const { data: blockedData, error: blockedError } = await supabase
          .from('blocked_dates')
          .select('*')
          .eq('barbershop_id', selectedUnitId)
          .gte('blocked_date', new Date().toISOString().split('T')[0]);

        if (blockedError && !blockedError.message?.includes('does not exist')) {
          console.warn('Erro ao carregar datas bloqueadas:', blockedError);
        }

        if (blockedData) {
          setBlockedDates(
            blockedData.map(b => ({
              id: b.id,
              date: new Date(b.blocked_date),
              reason: b.reason,
            }))
          );
        }
      } catch (err) {
        console.warn('Tabela blocked_dates não disponível:', err);
      }

      // Load special hours (handle table not existing)
      try {
        const { data: specialData, error: specialError } = await supabase
          .from('special_hours')
          .select('*')
          .eq('barbershop_id', selectedUnitId)
          .gte('special_date', new Date().toISOString().split('T')[0]);

        if (specialError && !specialError.message?.includes('does not exist')) {
          console.warn('Erro ao carregar horários especiais:', specialError);
        }

        if (specialData) {
          setSpecialHours(
            specialData.map(s => ({
              id: s.id,
              date: new Date(s.special_date),
              reason: s.reason,
              isOpen: s.is_open,
              openTime: s.open_time || undefined,
              closeTime: s.close_time || undefined,
              breakStart: s.break_start || undefined,
              breakEnd: s.break_end || undefined,
            }))
          );
        }
      } catch (err) {
        console.warn('Tabela special_hours não disponível:', err);
      }
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      toast.error('Erro ao carregar horários de funcionamento');
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = async () => {
    if (!selectedUnitId) return;

    try {
      setSaving(true);

      // Delete existing schedules
      await supabase
        .from('business_hours')
        .delete()
        .eq('barbershop_id', selectedUnitId);

      // Insert new schedules
      const scheduleData = schedule.map(day => ({
        barbershop_id: selectedUnitId,
        day_of_week: day.day,
        is_open: day.enabled,
        open_time: day.openTime,
        close_time: day.closeTime,
        break_start: day.breakStart || null,
        break_end: day.breakEnd || null,
      }));

      const { error } = await supabase
        .from('business_hours')
        .insert(scheduleData);

      if (error) throw error;

      toast.success('Horários salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar horários:', error);
      toast.error('Erro ao salvar horários');
    } finally {
      setSaving(false);
    }
  };

  const updateSchedule = (index: number, field: keyof DaySchedule, value: any) => {
    const updated = [...schedule];
    updated[index] = { ...updated[index], [field]: value };
    setSchedule(updated);
  };

  // Unidades disponíveis para cópia (exclui a unidade atual)
  const unitsForCopy = selectableUnits.filter(u => u.id !== selectedUnitId);

  const toggleUnitForCopy = (unitId: string) => {
    setSelectedUnitsForCopy(prev => 
      prev.includes(unitId) 
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    );
  };

  const selectAllUnitsForCopy = () => {
    if (selectedUnitsForCopy.length === unitsForCopy.length) {
      setSelectedUnitsForCopy([]);
    } else {
      setSelectedUnitsForCopy(unitsForCopy.map(u => u.id));
    }
  };

  const copyScheduleToUnits = async () => {
    if (selectedUnitsForCopy.length === 0) {
      toast.error('Selecione pelo menos uma unidade para copiar');
      return;
    }

    try {
      setCopyingSchedule(true);

      for (const unitId of selectedUnitsForCopy) {
        // Delete existing schedules for the target unit
        await supabase
          .from('business_hours')
          .delete()
          .eq('barbershop_id', unitId);

        // Insert copied schedules
        const scheduleData = schedule.map(day => ({
          barbershop_id: unitId,
          day_of_week: day.day,
          is_open: day.enabled,
          open_time: day.openTime,
          close_time: day.closeTime,
          break_start: day.breakStart || null,
          break_end: day.breakEnd || null,
        }));

        const { error } = await supabase
          .from('business_hours')
          .insert(scheduleData);

        if (error) throw error;
      }

      const unitNames = selectedUnitsForCopy
        .map(id => selectableUnits.find(u => u.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      toast.success(`Horários copiados para: ${unitNames}`);
      setShowCopyDialog(false);
      setSelectedUnitsForCopy([]);
    } catch (error) {
      console.error('Erro ao copiar horários:', error);
      toast.error('Erro ao copiar horários');
    } finally {
      setCopyingSchedule(false);
    }
  };

  const addBlockedDate = async () => {
    if (!selectedDate || !blockReason.trim() || !selectedUnitId) {
      toast.error('Selecione uma data e informe o motivo do bloqueio');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('blocked_dates')
        .insert({
          barbershop_id: selectedUnitId,
          blocked_date: format(selectedDate, 'yyyy-MM-dd'),
          reason: blockReason,
        })
        .select()
        .single();

      if (error) throw error;

      setBlockedDates([...blockedDates, { id: data.id, date: selectedDate, reason: blockReason }]);
      setSelectedDate(undefined);
      setBlockReason('');
      toast.success('Data bloqueada com sucesso!');
    } catch (error) {
      console.error('Erro ao bloquear data:', error);
      toast.error('Erro ao bloquear data');
    }
  };

  const removeBlockedDate = async (id?: string) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBlockedDates(blockedDates.filter(d => d.id !== id));
      toast.success('Bloqueio removido');
    } catch (error) {
      console.error('Erro ao remover bloqueio:', error);
      toast.error('Erro ao remover bloqueio');
    }
  };

  const addSpecialHour = async () => {
    if (!selectedSpecialDate || !specialReason.trim() || !selectedUnitId) {
      toast.error('Selecione uma data e informe o motivo');
      return;
    }

    if (specialIsOpen && (!specialOpenTime || !specialCloseTime)) {
      toast.error('Informe os horários de abertura e fechamento');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('special_hours')
        .insert({
          barbershop_id: selectedUnitId,
          special_date: format(selectedSpecialDate, 'yyyy-MM-dd'),
          reason: specialReason,
          is_open: specialIsOpen,
          open_time: specialIsOpen ? specialOpenTime : null,
          close_time: specialIsOpen ? specialCloseTime : null,
          break_start: specialBreakStart || null,
          break_end: specialBreakEnd || null,
        })
        .select()
        .single();

      if (error) throw error;

      setSpecialHours([
        ...specialHours,
        {
          id: data.id,
          date: selectedSpecialDate,
          reason: specialReason,
          isOpen: specialIsOpen,
          openTime: specialIsOpen ? specialOpenTime : undefined,
          closeTime: specialIsOpen ? specialCloseTime : undefined,
          breakStart: specialBreakStart || undefined,
          breakEnd: specialBreakEnd || undefined,
        },
      ]);

      // Reset form
      setSelectedSpecialDate(undefined);
      setSpecialReason('');
      setSpecialIsOpen(true);
      setSpecialOpenTime('09:00');
      setSpecialCloseTime('18:00');
      setSpecialBreakStart('');
      setSpecialBreakEnd('');

      toast.success('Horário especial adicionado!');
    } catch (error) {
      console.error('Erro ao adicionar horário especial:', error);
      toast.error('Erro ao adicionar horário especial');
    }
  };

  const removeSpecialHour = async (id?: string) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('special_hours')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSpecialHours(specialHours.filter(s => s.id !== id));
      toast.success('Horário especial removido');
    } catch (error) {
      console.error('Erro ao remover horário especial:', error);
      toast.error('Erro ao remover horário especial');
    }
  };

  // Pega o nome da unidade selecionada
  const selectedUnitName = selectableUnits.find(u => u.id === selectedUnitId)?.name || 
    barbershops?.find(b => b.id === selectedUnitId)?.name || '';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Horários de Funcionamento</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configure os horários, intervalos e bloqueios
          </p>
        </div>

        {/* Seletor de Unidade */}
        {hasMultipleUnits && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Selecionar Unidade</CardTitle>
              </div>
              <CardDescription>
                Escolha a unidade para configurar os horários de funcionamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Selecione uma unidade" />
                </SelectTrigger>
                <SelectContent>
                  {selectableUnits.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {!selectedUnitId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Selecione uma unidade para configurar os horários de funcionamento.
            </AlertDescription>
          </Alert>
        )}

        {selectedUnitId && (
          <>
            {selectedUnitName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>Configurando horários para: <strong className="text-foreground">{selectedUnitName}</strong></span>
              </div>
            )}

        <Tabs defaultValue="schedule" className="space-y-4 sm:space-y-6">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="schedule" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Horários da Semana</span>
              <span className="sm:hidden">Semana</span>
            </TabsTrigger>
            <TabsTrigger value="special" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Horários Especiais</span>
              <span className="sm:hidden">Especiais</span>
            </TabsTrigger>
            <TabsTrigger value="blocked" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Datas Bloqueadas</span>
              <span className="sm:hidden">Bloqueios</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Horários Semanais</CardTitle>
                <CardDescription>
                  Configure os horários de abertura, fechamento e intervalos para cada dia da semana
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {schedule.map((day, index) => (
                  <div key={day.day} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3 sm:w-40">
                      <Switch
                        checked={day.enabled}
                        onCheckedChange={(checked) => updateSchedule(index, 'enabled', checked)}
                      />
                      <Label className="font-medium text-sm sm:text-base">{day.label}</Label>
                    </div>

                    {day.enabled ? (
                      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Abertura</Label>
                          <Input
                            type="time"
                            value={day.openTime}
                            onChange={(e) => updateSchedule(index, 'openTime', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Fechamento</Label>
                          <Input
                            type="time"
                            value={day.closeTime}
                            onChange={(e) => updateSchedule(index, 'closeTime', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Intervalo Início</Label>
                          <Input
                            type="time"
                            value={day.breakStart || ''}
                            onChange={(e) => updateSchedule(index, 'breakStart', e.target.value)}
                            placeholder="Opcional"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Intervalo Fim</Label>
                          <Input
                            type="time"
                            value={day.breakEnd || ''}
                            onChange={(e) => updateSchedule(index, 'breakEnd', e.target.value)}
                            placeholder="Opcional"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <Badge variant="secondary">Fechado</Badge>
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  {hasMultipleUnits && unitsForCopy.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCopyDialog(true)}
                      size="lg"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar para outras unidades
                    </Button>
                  )}
                  <Button onClick={saveSchedule} disabled={saving} size="lg">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar Horários'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="special" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Adicionar Horário Especial</CardTitle>
                  <CardDescription>
                    Configure horários diferentes para datas específicas (eventos, feriados com atendimento, etc.)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Selecione a Data</Label>
                    <Calendar
                      mode="single"
                      selected={selectedSpecialDate}
                      onSelect={setSelectedSpecialDate}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border pointer-events-auto"
                      locale={ptBR}
                    />
                  </div>
                  
                  <div>
                    <Label>Motivo / Descrição</Label>
                    <Input
                      value={specialReason}
                      onChange={(e) => setSpecialReason(e.target.value)}
                      placeholder="Ex: Horário Estendido - Black Friday"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <Label>Barbearia Aberta</Label>
                    <Switch
                      checked={specialIsOpen}
                      onCheckedChange={setSpecialIsOpen}
                    />
                  </div>

                  {specialIsOpen && (
                    <div className="space-y-4 p-4 border border-border rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Abertura</Label>
                          <Input
                            type="time"
                            value={specialOpenTime}
                            onChange={(e) => setSpecialOpenTime(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Fechamento</Label>
                          <Input
                            type="time"
                            value={specialCloseTime}
                            onChange={(e) => setSpecialCloseTime(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Intervalo Início</Label>
                          <Input
                            type="time"
                            value={specialBreakStart}
                            onChange={(e) => setSpecialBreakStart(e.target.value)}
                            placeholder="Opcional"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Intervalo Fim</Label>
                          <Input
                            type="time"
                            value={specialBreakEnd}
                            onChange={(e) => setSpecialBreakEnd(e.target.value)}
                            placeholder="Opcional"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Button onClick={addSpecialHour} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Horário Especial
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Horários Especiais Configurados</CardTitle>
                  <CardDescription>
                    Datas com horários de funcionamento diferentes do padrão
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {specialHours.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum horário especial configurado
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {specialHours.map((special) => (
                        <div
                          key={special.id}
                          className="flex items-start justify-between p-4 border border-border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">
                                {format(special.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                              {special.isOpen ? (
                                <Badge className="bg-success/10 text-success border-success/20">
                                  Aberto
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Fechado</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{special.reason}</p>
                            {special.isOpen && (
                              <div className="text-xs space-y-1">
                                <p>
                                  <span className="font-medium">Horário:</span>{' '}
                                  {special.openTime} - {special.closeTime}
                                </p>
                                {special.breakStart && special.breakEnd && (
                                  <p>
                                    <span className="font-medium">Intervalo:</span>{' '}
                                    {special.breakStart} - {special.breakEnd}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSpecialHour(special.id)}
                          >
                            <XCircle className="h-5 w-5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="blocked" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Adicionar Bloqueio</CardTitle>
                  <CardDescription>
                    Bloqueie datas específicas (feriados, manutenção, etc.)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Selecione a Data</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border pointer-events-auto"
                      locale={ptBR}
                    />
                  </div>
                  <div>
                    <Label>Motivo do Bloqueio</Label>
                    <Input
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Ex: Feriado Nacional, Manutenção..."
                    />
                  </div>
                  <Button onClick={addBlockedDate} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Bloquear Data
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Datas Bloqueadas</CardTitle>
                  <CardDescription>
                    Datas em que a barbearia não estará funcionando
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {blockedDates.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma data bloqueada
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {blockedDates.map((blocked) => (
                        <div
                          key={blocked.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {format(blocked.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                            <p className="text-sm text-muted-foreground">{blocked.reason}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBlockedDate(blocked.id)}
                          >
                            <XCircle className="h-5 w-5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
          </>
        )}
      </div>

      {/* Dialog para copiar horários */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copiar horários para outras unidades</DialogTitle>
            <DialogDescription>
              Selecione as unidades que receberão os mesmos horários de funcionamento configurados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {unitsForCopy.length > 1 && (
              <div className="flex items-center space-x-2 pb-2 border-b border-border">
                <Checkbox
                  id="select-all"
                  checked={selectedUnitsForCopy.length === unitsForCopy.length}
                  onCheckedChange={selectAllUnitsForCopy}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer"
                >
                  Selecionar todas as unidades
                </label>
              </div>
            )}
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {unitsForCopy.map(unit => (
                <div key={unit.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id={unit.id}
                    checked={selectedUnitsForCopy.includes(unit.id)}
                    onCheckedChange={() => toggleUnitForCopy(unit.id)}
                  />
                  <label
                    htmlFor={unit.id}
                    className="flex-1 text-sm cursor-pointer font-medium"
                  >
                    {unit.name}
                  </label>
                </div>
              ))}
            </div>
            
            {selectedUnitsForCopy.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Os horários existentes nas {selectedUnitsForCopy.length} unidade(s) selecionada(s) serão substituídos.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={copyScheduleToUnits} 
              disabled={copyingSchedule || selectedUnitsForCopy.length === 0}
            >
              {copyingSchedule ? 'Copiando...' : `Copiar para ${selectedUnitsForCopy.length} unidade(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default BusinessHours;
