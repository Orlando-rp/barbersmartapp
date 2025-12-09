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
import { Clock, Calendar as CalendarIcon, XCircle, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const { barbershopId } = useAuth();
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

  useEffect(() => {
    if (barbershopId) {
      loadBusinessHours();
    }
  }, [barbershopId]);

  const importFromLegacySettings = async () => {
    if (!barbershopId) return;

    try {
      // Fetch legacy opening_hours from barbershops.settings
      const { data: barbershopData, error: barbershopError } = await supabase
        .from('barbershops')
        .select('settings')
        .eq('id', barbershopId)
        .maybeSingle();

      if (barbershopError) throw barbershopError;

      const legacyHours = barbershopData?.settings?.opening_hours;
      
      if (legacyHours && Object.keys(legacyHours).length > 0) {
        // Map legacy format to business_hours format
        const dayMapping: Record<string, string> = {
          'monday': 'monday',
          'tuesday': 'tuesday', 
          'wednesday': 'wednesday',
          'thursday': 'thursday',
          'friday': 'friday',
          'saturday': 'saturday',
          'sunday': 'sunday'
        };

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
          barbershop_id: barbershopId,
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
          barbershop_id: barbershopId,
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
        .eq('barbershop_id', barbershopId)
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
          .eq('barbershop_id', barbershopId)
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
          .eq('barbershop_id', barbershopId)
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
    if (!barbershopId) return;

    try {
      setSaving(true);

      // Delete existing schedules
      await supabase
        .from('business_hours')
        .delete()
        .eq('barbershop_id', barbershopId);

      // Insert new schedules
      const scheduleData = schedule.map(day => ({
        barbershop_id: barbershopId,
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

  const addBlockedDate = async () => {
    if (!selectedDate || !blockReason.trim() || !barbershopId) {
      toast.error('Selecione uma data e informe o motivo do bloqueio');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('blocked_dates')
        .insert({
          barbershop_id: barbershopId,
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
    if (!selectedSpecialDate || !specialReason.trim() || !barbershopId) {
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
          barbershop_id: barbershopId,
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

                <div className="flex justify-end">
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
      </div>
    </Layout>
  );
};

export default BusinessHours;
