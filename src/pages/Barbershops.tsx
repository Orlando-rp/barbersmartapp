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
import { Building2, Plus, Pencil, MapPin, Phone, Mail, Star, Home, GitBranch } from "lucide-react";
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
  parent_id?: string | null;
  isMatriz?: boolean;
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
        .select('*, parent_id')
        .in('id', barbershopIds)
        .order('name');

      if (error) throw error;
      
      // Adicionar is_primary e identificar matrizes
      const barbershopsWithInfo = (data || []).map(b => ({
        ...b,
        is_primary: userBarbershops.find(ub => ub.id === b.id)?.is_primary || false,
        isMatriz: !b.parent_id, // É matriz se não tem parent_id
      }));
      
      // Ordenar: matrizes primeiro, depois unidades
      barbershopsWithInfo.sort((a, b) => {
        if (a.isMatriz && !b.isMatriz) return -1;
        if (!a.isMatriz && b.isMatriz) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setBarbershops(barbershopsWithInfo);
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
        // Criar nova unidade - sempre vinculada à matriz do usuário
        // Encontrar a matriz do usuário (barbershop sem parent_id)
        const matriz = barbershops.find(b => b.isMatriz);
        const parentId = matriz?.id || null;
        
        const { data: newBarbershop, error: insertError } = await supabase
          .from('barbershops')
          .insert({
            name: formData.name.trim(),
            address: formData.address.trim() || null,
            phone: formData.phone.trim() || null,
            email: formData.email.trim() || null,
            active: formData.active,
            parent_id: parentId, // Vincula à matriz
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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Barbearia e Unidades</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerencie sua barbearia e suas unidades
            </p>
          </div>
          {/* Só pode adicionar unidade se já tem uma matriz */}
          {barbershops.some(b => b.isMatriz) && (
            <Button onClick={openCreateDialog} className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="sm:hidden">Nova</span>
              <span className="hidden sm:inline">Nova Unidade</span>
            </Button>
          )}
        </div>

        {barbershops.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
              <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-foreground mb-2 text-center">
                Nenhuma unidade cadastrada
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Estrutura Organizacional</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {barbershops.filter(b => b.isMatriz).length} barbearia(s), {barbershops.filter(b => !b.isMatriz).length} unidade(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {/* Mobile Cards View */}
              <div className="block lg:hidden space-y-3">
                {barbershops.map((barbershop) => (
                  <div 
                    key={barbershop.id} 
                    className={`border rounded-lg p-3 sm:p-4 space-y-3 ${
                      barbershop.isMatriz 
                        ? 'border-primary/50 bg-primary/5' 
                        : 'border-border ml-4'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-auto flex-shrink-0"
                                onClick={() => setPrimary(barbershop)}
                                disabled={barbershop.is_primary}
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    barbershop.is_primary
                                      ? 'fill-warning text-warning'
                                      : 'text-muted-foreground hover:text-warning'
                                  }`}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {barbershop.is_primary ? 'Unidade principal' : 'Definir como principal'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {barbershop.isMatriz ? (
                              <Home className="h-4 w-4 text-primary flex-shrink-0" />
                            ) : (
                              <GitBranch className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm truncate">{barbershop.name}</span>
                            {barbershop.is_primary && (
                              <Badge variant="outline" className="text-xs border-warning text-warning">
                                Principal
                              </Badge>
                            )}
                          </div>
                          <Badge className="mt-1" variant={barbershop.active ? "default" : "secondary"}>
                            {barbershop.active ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
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
                    </div>
                    
                    <div className="space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                      {barbershop.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="break-words">{barbershop.address}</span>
                        </div>
                      )}
                      {barbershop.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{barbershop.phone}</span>
                        </div>
                      )}
                      {barbershop.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{barbershop.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block">
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
                                          ? 'fill-warning text-warning'
                                          : 'text-muted-foreground hover:text-warning'
                                      }`}
                                    />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {barbershop.is_primary ? 'Unidade principal' : 'Definir como principal'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {barbershop.isMatriz ? (
                              <Home className="h-4 w-4 text-primary" />
                            ) : (
                              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="font-medium">{barbershop.name}</span>
                            {barbershop.is_primary && (
                              <Badge variant="outline" className="text-xs border-warning text-warning">
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
              </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contato@barbearia.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 bg-muted rounded-lg gap-4">
                <div className="min-w-0">
                  <Label htmlFor="active" className="text-sm">Unidade Ativa</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
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

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
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
