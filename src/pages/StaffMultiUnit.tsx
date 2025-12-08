import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  Plus,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Check,
  X,
  UserPlus,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  user_id: string;
  barbershop_id: string;
  specialties: string[];
  commission_rate: number;
  schedule: Record<string, { start: string; end: string; enabled: boolean }>;
  active: boolean;
  barbershop_name?: string;
  profiles?: {
    full_name: string;
    phone: string;
    avatar_url: string;
  };
}

interface UserWithStaff {
  user_id: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  units: StaffMember[];
}

interface Barbershop {
  id: string;
  name: string;
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

const StaffMultiUnit = () => {
  const { barbershops, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithStaff[]>([]);
  const [allBarbershops, setAllBarbershops] = useState<Barbershop[]>([]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithStaff | null>(null);
  const [selectedBarbershop, setSelectedBarbershop] = useState<Barbershop | null>(null);
  const [unitConfig, setUnitConfig] = useState<{
    commission_rate: number;
    schedule: Record<string, { start: string; end: string; enabled: boolean }>;
    specialties: string[];
    active: boolean;
  }>({
    commission_rate: 0,
    schedule: DEFAULT_SCHEDULE,
    specialties: [],
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [addUnitDialogOpen, setAddUnitDialogOpen] = useState(false);
  const [selectedAddBarbershop, setSelectedAddBarbershop] = useState<string>('');

  useEffect(() => {
    fetchAllData();
  }, [barbershops]);

  const fetchAllData = async () => {
    if (barbershops.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const barbershopIds = barbershops.map(b => b.id);

      // Buscar todas as barbearias disponíveis (para super admin)
      if (userRole === 'super_admin') {
        const { data: allShops } = await supabase
          .from('barbershops')
          .select('id, name')
          .eq('active', true);
        setAllBarbershops(allShops || []);
      } else {
        setAllBarbershops(barbershops.map(b => ({ id: b.id, name: b.name })));
      }

      // Buscar todos os staff das barbearias do usuário
      const { data: staffData, error } = await supabase
        .from('staff')
        .select(`
          *,
          profiles!staff_user_id_fkey(full_name, phone, avatar_url),
          barbershops(name)
        `)
        .in('barbershop_id', barbershopIds);

      if (error) throw error;

      // Agrupar por user_id
      const userMap = new Map<string, UserWithStaff>();

      staffData?.forEach((staff: any) => {
        const userId = staff.user_id;
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            user_id: userId,
            full_name: staff.profiles?.full_name || 'Nome não disponível',
            phone: staff.profiles?.phone || '',
            avatar_url: staff.profiles?.avatar_url || '',
            units: [],
          });
        }

        userMap.get(userId)!.units.push({
          ...staff,
          barbershop_name: staff.barbershops?.name || 'Unidade',
        });
      });

      setUsers(Array.from(userMap.values()));
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar profissionais');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureUnit = (user: UserWithStaff, unit: StaffMember) => {
    setSelectedUser(user);
    setSelectedBarbershop({ id: unit.barbershop_id, name: unit.barbershop_name || '' });
    setUnitConfig({
      commission_rate: unit.commission_rate || 0,
      schedule: unit.schedule || DEFAULT_SCHEDULE,
      specialties: unit.specialties || [],
      active: unit.active,
    });
    setConfigDialogOpen(true);
  };

  const handleAddUnitClick = (user: UserWithStaff) => {
    setSelectedUser(user);
    setSelectedAddBarbershop('');
    setAddUnitDialogOpen(true);
  };

  const handleAddUnit = async () => {
    if (!selectedUser || !selectedAddBarbershop) return;

    try {
      setSaving(true);

      // Verificar se já existe
      const existing = selectedUser.units.find(u => u.barbershop_id === selectedAddBarbershop);
      if (existing) {
        toast.error('Este profissional já está vinculado a esta unidade');
        return;
      }

      const { error } = await supabase
        .from('staff')
        .insert({
          user_id: selectedUser.user_id,
          barbershop_id: selectedAddBarbershop,
          commission_rate: 0,
          schedule: DEFAULT_SCHEDULE,
          specialties: [],
          active: true,
        });

      if (error) throw error;

      toast.success('Profissional vinculado à unidade');
      setAddUnitDialogOpen(false);
      fetchAllData();
    } catch (error: any) {
      console.error('Erro ao vincular:', error);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedUser || !selectedBarbershop) return;

    try {
      setSaving(true);

      const unit = selectedUser.units.find(u => u.barbershop_id === selectedBarbershop.id);
      if (!unit) throw new Error('Unidade não encontrada');

      const { error } = await supabase
        .from('staff')
        .update({
          commission_rate: unitConfig.commission_rate,
          schedule: unitConfig.schedule,
          specialties: unitConfig.specialties,
          active: unitConfig.active,
        })
        .eq('id', unit.id);

      if (error) throw error;

      toast.success('Configurações salvas com sucesso');
      setConfigDialogOpen(false);
      fetchAllData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromUnit = async (user: UserWithStaff, unit: StaffMember) => {
    if (user.units.length <= 1) {
      toast.error('O profissional deve estar vinculado a pelo menos uma unidade');
      return;
    }

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', unit.id);

      if (error) throw error;

      toast.success('Profissional removido da unidade');
      fetchAllData();
    } catch (error: any) {
      console.error('Erro ao remover:', error);
      toast.error(error.message);
    }
  };

  const handleScheduleChange = (day: string, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    setUnitConfig(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          [field]: value,
        },
      },
    }));
  };

  const getAvailableUnitsForUser = (user: UserWithStaff) => {
    const userBarbershopIds = user.units.map(u => u.barbershop_id);
    return allBarbershops.filter(b => !userBarbershopIds.includes(b.id));
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

  if (barbershops.length <= 1 && userRole !== 'super_admin') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Staff Multi-Unidade</h2>
          <p className="text-muted-foreground max-w-md">
            Esta funcionalidade está disponível apenas para contas com múltiplas unidades de barbearia.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Staff Multi-Unidade
            </h1>
            <p className="text-muted-foreground">
              Gerencie profissionais em múltiplas unidades com configurações independentes
            </p>
          </div>
        </div>

        {/* Staff List */}
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle>Profissionais</CardTitle>
            <CardDescription>
              {users.length} profissional(is) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum profissional encontrado
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.user_id}
                    className="border border-border rounded-lg p-4 bg-background/50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{user.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{user.phone}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddUnitClick(user)}
                        disabled={getAvailableUnitsForUser(user).length === 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Unidade
                      </Button>
                    </div>

                    {/* Units Table */}
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Unidade</TableHead>
                            <TableHead>Comissão</TableHead>
                            <TableHead>Dias de Trabalho</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {user.units.map((unit) => {
                            const enabledDays = unit.schedule 
                              ? Object.entries(unit.schedule).filter(([_, v]) => v.enabled).length
                              : 0;

                            return (
                              <TableRow key={unit.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{unit.barbershop_name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    {unit.commission_rate}%
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {enabledDays} dias/semana
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {unit.active ? (
                                    <Badge variant="default" className="bg-green-500">
                                      <Check className="h-3 w-3 mr-1" />
                                      Ativo
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">
                                      <X className="h-3 w-3 mr-1" />
                                      Inativo
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleConfigureUnit(user, unit)}
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveFromUnit(user, unit)}
                                      disabled={user.units.length <= 1}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Unit Dialog */}
        <Dialog open={addUnitDialogOpen} onOpenChange={setAddUnitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar a Nova Unidade</DialogTitle>
              <DialogDescription>
                Vincule {selectedUser?.full_name} a outra unidade
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Selecione a Unidade</Label>
                <Select value={selectedAddBarbershop} onValueChange={setSelectedAddBarbershop}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedUser && getAvailableUnitsForUser(selectedUser).map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {shop.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddUnitDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddUnit} disabled={saving || !selectedAddBarbershop}>
                {saving ? 'Vinculando...' : 'Vincular'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Config Dialog */}
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar {selectedUser?.full_name} em {selectedBarbershop?.name}
              </DialogTitle>
              <DialogDescription>
                Configure horários, comissão e especialidades para esta unidade específica
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="schedule" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="schedule">
                  <Clock className="h-4 w-4 mr-2" />
                  Horários
                </TabsTrigger>
                <TabsTrigger value="commission">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Comissão
                </TabsTrigger>
                <TabsTrigger value="status">
                  <Settings className="h-4 w-4 mr-2" />
                  Status
                </TabsTrigger>
              </TabsList>

              {/* Schedule Tab */}
              <TabsContent value="schedule" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Configure os dias e horários de trabalho nesta unidade
                </p>

                <div className="space-y-3">
                  {Object.entries(DAY_LABELS).map(([day, label]) => {
                    const daySchedule = unitConfig.schedule[day] || DEFAULT_SCHEDULE[day as keyof typeof DEFAULT_SCHEDULE];

                    return (
                      <div
                        key={day}
                        className="flex items-center gap-4 p-3 rounded-lg border border-border bg-background/50"
                      >
                        <div className="flex items-center gap-3 w-32">
                          <Switch
                            checked={daySchedule.enabled}
                            onCheckedChange={(checked) => handleScheduleChange(day, 'enabled', checked)}
                          />
                          <span className={`font-medium ${!daySchedule.enabled ? 'text-muted-foreground' : ''}`}>
                            {label}
                          </span>
                        </div>

                        {daySchedule.enabled && (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              type="time"
                              value={daySchedule.start}
                              onChange={(e) => handleScheduleChange(day, 'start', e.target.value)}
                              className="w-32"
                            />
                            <span className="text-muted-foreground">até</span>
                            <Input
                              type="time"
                              value={daySchedule.end}
                              onChange={(e) => handleScheduleChange(day, 'end', e.target.value)}
                              className="w-32"
                            />
                          </div>
                        )}

                        {!daySchedule.enabled && (
                          <span className="text-sm text-muted-foreground">Folga</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Commission Tab */}
              <TabsContent value="commission" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Configure a taxa de comissão específica para esta unidade
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="commission">Taxa de Comissão (%)</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="commission"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={unitConfig.commission_rate}
                        onChange={(e) => setUnitConfig(prev => ({
                          ...prev,
                          commission_rate: parseFloat(e.target.value) || 0,
                        }))}
                        className="w-32"
                      />
                      <div className="flex-1">
                        <Progress value={unitConfig.commission_rate} className="h-3" />
                      </div>
                      <span className="font-bold text-lg w-16 text-right">
                        {unitConfig.commission_rate}%
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      <strong>Exemplo:</strong> Para um serviço de R$ 50,00, a comissão será de{' '}
                      <span className="text-primary font-semibold">
                        R$ {((50 * unitConfig.commission_rate) / 100).toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Status Tab */}
              <TabsContent value="status" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Configure o status do profissional nesta unidade
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      {unitConfig.active ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">Status Ativo</p>
                        <p className="text-sm text-muted-foreground">
                          {unitConfig.active 
                            ? 'Profissional pode receber agendamentos nesta unidade'
                            : 'Profissional não receberá agendamentos nesta unidade'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={unitConfig.active}
                      onCheckedChange={(checked) => setUnitConfig(prev => ({
                        ...prev,
                        active: checked,
                      }))}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveConfig} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default StaffMultiUnit;
