import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Plus, Pencil, MapPin, Phone, Mail, Star } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Barbershop {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
  is_primary?: boolean;
}

interface BarbershopFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  active: boolean;
}

const defaultFormData: BarbershopFormData = {
  name: "",
  address: "",
  phone: "",
  email: "",
  active: true,
};

const Barbershops = () => {
  const { barbershops: userBarbershops, userRole, refreshBarbershops } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BarbershopFormData>(defaultFormData);

  useEffect(() => {
    loadBarbershops();
  }, [userBarbershops]);

  const loadBarbershops = async () => {
    try {
      setLoading(true);
      
      // Carregar barbearias que o usuário tem acesso
      const barbershopIds = userBarbershops.map(b => b.id);
      
      if (barbershopIds.length === 0) {
        setBarbershops([]);
        return;
      }

      const { data, error } = await supabase
        .from('barbershops')
        .select('*')
        .in('id', barbershopIds)
        .order('name');

      if (error) throw error;
      
      // Adicionar is_primary do contexto do usuário
      const barbershopsWithPrimary = (data || []).map(b => ({
        ...b,
        is_primary: userBarbershops.find(ub => ub.id === b.id)?.is_primary || false
      }));
      
      setBarbershops(barbershopsWithPrimary);
    } catch (error) {
      console.error('Erro ao carregar barbearias:', error);
      toast.error('Erro ao carregar barbearias');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (barbershop: Barbershop) => {
    setEditingId(barbershop.id);
    setFormData({
      name: barbershop.name,
      address: barbershop.address || "",
      phone: barbershop.phone || "",
      email: barbershop.email || "",
      active: barbershop.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('O nome da barbearia é obrigatório');
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        // Atualizar barbearia existente
        const { error } = await supabase
          .from('barbershops')
          .update({
            name: formData.name.trim(),
            address: formData.address.trim() || null,
            phone: formData.phone.trim() || null,
            email: formData.email.trim() || null,
            active: formData.active,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Barbearia atualizada com sucesso!');
      } else {
        // Criar nova barbearia
        const { data: newBarbershop, error: insertError } = await supabase
          .from('barbershops')
          .insert({
            name: formData.name.trim(),
            address: formData.address.trim() || null,
            phone: formData.phone.trim() || null,
            email: formData.email.trim() || null,
            active: formData.active,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Associar o usuário à nova barbearia
        const { data: { user } } = await supabase.auth.getUser();
        if (user && newBarbershop) {
          const { error: linkError } = await supabase
            .from('user_barbershops')
            .insert({
              user_id: user.id,
              barbershop_id: newBarbershop.id,
              is_primary: barbershops.length === 0, // Primeira barbearia é a principal
            });
          
          if (linkError) {
            console.error('Erro ao associar usuário à barbearia:', linkError);
            toast.error('Barbearia criada, mas houve erro ao associá-la ao usuário.');
          } else {
            // Criar a role de admin para o usuário
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: user.id,
                role: 'admin',
                barbershop_id: newBarbershop.id,
              });
            
            if (roleError) {
              console.error('Erro ao criar role de admin:', roleError);
            }

            // Verificar se há registro pendente de barbeiro (do cadastro inicial)
            const pendingBarberData = localStorage.getItem('pendingBarberRegistration');
            if (pendingBarberData) {
              try {
                const barberData = JSON.parse(pendingBarberData);
                if (barberData.isAlsoBarber && barberData.userId === user.id) {
                  // Criar registro de staff para o admin que também atende
                  const { error: staffError } = await supabase
                    .from('staff')
                    .insert({
                      user_id: user.id,
                      barbershop_id: newBarbershop.id,
                      is_also_barber: true,
                      specialties: ['Corte', 'Barba'],
                      commission_rate: 50,
                      active: true,
                    });
                  
                  if (staffError) {
                    console.error('Erro ao criar registro de barbeiro:', staffError);
                  } else {
                    toast.success('Você foi registrado como barbeiro nesta unidade!');
                  }
                  
                  // Limpar o registro pendente
                  localStorage.removeItem('pendingBarberRegistration');
                }
              } catch (e) {
                console.error('Erro ao processar registro de barbeiro:', e);
              }
            }
            
            // Atualizar automaticamente o seletor de barbearias
            await refreshBarbershops();
          }
        }

        toast.success('Barbearia criada com sucesso!');
      }

      setDialogOpen(false);
      loadBarbershops();
    } catch (error) {
      console.error('Erro ao salvar barbearia:', error);
      toast.error('Erro ao salvar barbearia');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (barbershop: Barbershop) => {
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({ active: !barbershop.active })
        .eq('id', barbershop.id);

      if (error) throw error;

      setBarbershops(prev =>
        prev.map(b =>
          b.id === barbershop.id ? { ...b, active: !b.active } : b
        )
      );

      toast.success(
        barbershop.active
          ? 'Barbearia desativada'
          : 'Barbearia ativada'
      );
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status da barbearia');
    }
  };

  const setPrimary = async (barbershop: Barbershop) => {
    if (barbershop.is_primary) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Remover is_primary de todas as barbearias do usuário
      await supabase
        .from('user_barbershops')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      // Definir a nova barbearia como principal
      const { error } = await supabase
        .from('user_barbershops')
        .update({ is_primary: true })
        .eq('user_id', user.id)
        .eq('barbershop_id', barbershop.id);

      if (error) throw error;

      // Atualizar estado local
      setBarbershops(prev =>
        prev.map(b => ({
          ...b,
          is_primary: b.id === barbershop.id
        }))
      );

      // Atualizar o contexto global
      await refreshBarbershops();

      toast.success(`${barbershop.name} definida como unidade principal`);
    } catch (error) {
      console.error('Erro ao definir unidade principal:', error);
      toast.error('Erro ao definir unidade principal');
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minhas Unidades</h1>
            <p className="text-muted-foreground">
              Gerencie as unidades da sua barbearia
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Unidade
          </Button>
        </div>

        {barbershops.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma unidade cadastrada
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie sua primeira unidade para começar a gerenciar sua barbearia
              </p>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Unidade
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Unidades Cadastradas</CardTitle>
              <CardDescription>
                {barbershops.length} unidade{barbershops.length !== 1 ? 's' : ''} encontrada{barbershops.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {barbershops.map((barbershop) => (
                    <TableRow key={barbershop.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-0 h-auto"
                                  onClick={() => setPrimary(barbershop)}
                                  disabled={barbershop.is_primary}
                                >
                                  <Star
                                    className={`h-4 w-4 ${
                                      barbershop.is_primary
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-muted-foreground hover:text-yellow-400'
                                    }`}
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {barbershop.is_primary ? 'Unidade principal' : 'Definir como principal'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{barbershop.name}</span>
                          {barbershop.is_primary && (
                            <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-600">
                              Principal
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {barbershop.address ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {barbershop.address}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {barbershop.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {barbershop.phone}
                            </div>
                          )}
                          {barbershop.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {barbershop.email}
                            </div>
                          )}
                          {!barbershop.phone && !barbershop.email && (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={barbershop.active ? "default" : "secondary"}>
                          {barbershop.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(barbershop)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={barbershop.active}
                            onCheckedChange={() => toggleActive(barbershop)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Dialog de Criar/Editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Unidade' : 'Nova Unidade'}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Atualize as informações da unidade'
                  : 'Preencha os dados para criar uma nova unidade'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Unidade *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Barbearia Centro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  placeholder="Rua, número, bairro, cidade"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contato@barbearia.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <Label htmlFor="active">Unidade Ativa</Label>
                  <p className="text-sm text-muted-foreground">
                    Unidades inativas não aparecem para agendamento
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Barbershops;
