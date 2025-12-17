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
import { Separator } from "@/components/ui/separator";
import { CPFCNPJInput } from "@/components/ui/cpf-cnpj-input";
import { CEPInput } from "@/components/ui/cep-input";
import { validateCPFOrCNPJ, formatPhone, ViaCEPResponse } from "@/lib/formatters";
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
import { Building2, Plus, Pencil, MapPin, Phone, Mail, Star, GitBranch, Save, User, FileText } from "lucide-react";
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
  cnpj?: string | null;
  responsible_name?: string | null;
  responsible_phone?: string | null;
  responsible_email?: string | null;
}

interface UnitFormData {
  name: string;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  address_number: string;
  phone: string;
  email: string;
  active: boolean;
}

interface ProfileFormData {
  name: string;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  address_number: string;
  phone: string;
  email: string;
  cnpj: string;
  responsible_name: string;
  responsible_phone: string;
  responsible_email: string;
}

const defaultUnitFormData: UnitFormData = {
  name: "",
  cep: "",
  street: "",
  neighborhood: "",
  city: "",
  state: "",
  address_number: "",
  phone: "",
  email: "",
  active: true,
};

const defaultProfileFormData: ProfileFormData = {
  name: "",
  cep: "",
  street: "",
  neighborhood: "",
  city: "",
  state: "",
  address_number: "",
  phone: "",
  email: "",
  cnpj: "",
  responsible_name: "",
  responsible_phone: "",
  responsible_email: "",
};

const Barbershops = () => {
  const { barbershops: userBarbershops, userRole, refreshBarbershops } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [matriz, setMatriz] = useState<Barbershop | null>(null);
  const [units, setUnits] = useState<Barbershop[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UnitFormData>(defaultUnitFormData);
  const [profileFormData, setProfileFormData] = useState<ProfileFormData>(defaultProfileFormData);

  useEffect(() => {
    loadBarbershops();
  }, [userBarbershops]);

  const loadBarbershops = async () => {
    try {
      setLoading(true);
      
      const barbershopIds = userBarbershops.map(b => b.id);
      
      if (barbershopIds.length === 0) {
        setBarbershops([]);
        setMatriz(null);
        setUnits([]);
        return;
      }

      const { data, error } = await supabase
        .from('barbershops')
        .select('*, parent_id, cnpj, responsible_name, responsible_phone, responsible_email')
        .in('id', barbershopIds)
        .order('name');

      if (error) throw error;
      
      const barbershopsWithInfo = (data || []).map(b => ({
        ...b,
        is_primary: userBarbershops.find(ub => ub.id === b.id)?.is_primary || false,
        isMatriz: !b.parent_id,
      }));
      
      // Separar matriz e unidades
      const matrizItem = barbershopsWithInfo.find(b => b.isMatriz) || null;
      const unitItems = barbershopsWithInfo.filter(b => !b.isMatriz);
      
      setBarbershops(barbershopsWithInfo);
      setMatriz(matrizItem);
      setUnits(unitItems);
    } catch (error) {
      console.error('Erro ao carregar barbearias:', error);
      toast.error('Erro ao carregar barbearias');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData(defaultUnitFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (barbershop: Barbershop) => {
    setEditingId(barbershop.id);
    // Parse existing address if available
    const addressParts = barbershop.address?.split(',').map(s => s.trim()) || [];
    setFormData({
      name: barbershop.name,
      cep: "",
      street: addressParts[0] || "",
      neighborhood: "",
      city: "",
      state: "",
      address_number: "",
      phone: barbershop.phone || "",
      email: barbershop.email || "",
      active: barbershop.active,
    });
    setDialogOpen(true);
  };

  const openProfileDialog = () => {
    if (matriz) {
      // Parse existing address if available
      const addressParts = matriz.address?.split(',').map(s => s.trim()) || [];
      setProfileFormData({
        name: matriz.name || "",
        cep: "",
        street: addressParts[0] || "",
        neighborhood: "",
        city: "",
        state: "",
        address_number: "",
        phone: matriz.phone || "",
        email: matriz.email || "",
        cnpj: matriz.cnpj || "",
        responsible_name: matriz.responsible_name || "",
        responsible_phone: matriz.responsible_phone || "",
        responsible_email: matriz.responsible_email || "",
      });
    }
    setProfileDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!matriz || !profileFormData.name.trim()) {
      toast.error('O nome da barbearia é obrigatório');
      return;
    }

    // Validate CPF/CNPJ if provided
    if (profileFormData.cnpj.trim()) {
      const validation = validateCPFOrCNPJ(profileFormData.cnpj);
      if (!validation.valid) {
        toast.error('CPF ou CNPJ inválido');
        return;
      }
    }

    try {
      setSavingProfile(true);

      // Build full address from components
      const addressParts = [
        profileFormData.street,
        profileFormData.address_number,
        profileFormData.neighborhood,
        profileFormData.city,
        profileFormData.state,
        profileFormData.cep
      ].filter(Boolean);
      const fullAddress = addressParts.join(', ') || null;

      const { error } = await supabase
        .from('barbershops')
        .update({
          name: profileFormData.name.trim(),
          address: fullAddress,
          phone: profileFormData.phone.trim() || null,
          email: profileFormData.email.trim() || null,
          cnpj: profileFormData.cnpj.trim() || null,
          responsible_name: profileFormData.responsible_name.trim() || null,
          responsible_phone: profileFormData.responsible_phone.trim() || null,
          responsible_email: profileFormData.responsible_email.trim() || null,
        })
        .eq('id', matriz.id);

      if (error) throw error;
      
      toast.success('Perfil da barbearia atualizado!');
      setProfileDialogOpen(false);
      loadBarbershops();
      await refreshBarbershops();
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('O nome da unidade é obrigatório');
      return;
    }

    try {
      setSaving(true);

      // Build full address from components
      const addressParts = [
        formData.street,
        formData.address_number,
        formData.neighborhood,
        formData.city,
        formData.state,
        formData.cep
      ].filter(Boolean);
      const fullAddress = addressParts.join(', ') || null;

      if (editingId) {
        const { error } = await supabase
          .from('barbershops')
          .update({
            name: formData.name.trim(),
            address: fullAddress,
            phone: formData.phone.trim() || null,
            email: formData.email.trim() || null,
            active: formData.active,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Unidade atualizada com sucesso!');
      } else {
        const parentId = matriz?.id || null;
        
        const { data: newBarbershop, error: insertError } = await supabase
          .from('barbershops')
          .insert({
            name: formData.name.trim(),
            address: fullAddress,
            phone: formData.phone.trim() || null,
            email: formData.email.trim() || null,
            active: formData.active,
            parent_id: parentId,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const { data: { user } } = await supabase.auth.getUser();
        if (user && newBarbershop) {
          const { error: linkError } = await supabase
            .from('user_barbershops')
            .insert({
              user_id: user.id,
              barbershop_id: newBarbershop.id,
              is_primary: units.length === 0,
            });
          
          if (linkError) {
            console.error('Erro ao associar usuário:', linkError);
          } else {
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: user.id,
                role: 'admin',
                barbershop_id: newBarbershop.id,
              });
            
            if (roleError) {
              console.error('Erro ao criar role:', roleError);
            }
            await refreshBarbershops();
          }
        }

        toast.success('Unidade criada com sucesso!');
      }

      setDialogOpen(false);
      loadBarbershops();
    } catch (error) {
      console.error('Erro ao salvar unidade:', error);
      toast.error('Erro ao salvar unidade');
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

      setUnits(prev =>
        prev.map(b =>
          b.id === barbershop.id ? { ...b, active: !b.active } : b
        )
      );

      toast.success(
        barbershop.active
          ? 'Unidade desativada'
          : 'Unidade ativada'
      );
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const setPrimary = async (barbershop: Barbershop) => {
    if (barbershop.is_primary) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_barbershops')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('user_barbershops')
        .update({ is_primary: true })
        .eq('user_id', user.id)
        .eq('barbershop_id', barbershop.id);

      if (error) throw error;

      setUnits(prev =>
        prev.map(b => ({
          ...b,
          is_primary: b.id === barbershop.id
        }))
      );

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
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Barbearia e Unidades</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie o perfil da sua barbearia e suas unidades operacionais
          </p>
        </div>

        {/* Perfil da Barbearia */}
        {matriz && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Perfil da Barbearia</CardTitle>
                    <CardDescription>Dados da empresa</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={openProfileDialog}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{matriz.name}</p>
                </div>
                {matriz.cnpj && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" /> CNPJ
                    </p>
                    <p className="font-medium">{matriz.cnpj}</p>
                  </div>
                )}
                {matriz.address && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Endereço
                    </p>
                    <p className="font-medium">{matriz.address}</p>
                  </div>
                )}
                {matriz.phone && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Telefone
                    </p>
                    <p className="font-medium">{matriz.phone}</p>
                  </div>
                )}
                {matriz.email && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </p>
                    <p className="font-medium">{matriz.email}</p>
                  </div>
                )}
                {matriz.responsible_name && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" /> Responsável
                    </p>
                    <p className="font-medium">{matriz.responsible_name}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unidades */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Unidades Operacionais</h2>
              <p className="text-sm text-muted-foreground">
                {units.length} unidade{units.length !== 1 ? 's' : ''} cadastrada{units.length !== 1 ? 's' : ''}
              </p>
            </div>
            {matriz && (
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Unidade</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            )}
          </div>

          {units.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 px-4">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2 text-center">
                  Nenhuma unidade cadastrada
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Crie sua primeira unidade operacional
                </p>
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Unidade
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 sm:p-6">
                {/* Mobile Cards View */}
                <div className="block lg:hidden space-y-3">
                  {units.map((unit) => (
                    <div 
                      key={unit.id} 
                      className="border rounded-lg p-4 space-y-3"
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
                                  onClick={() => setPrimary(unit)}
                                  disabled={unit.is_primary}
                                >
                                  <Star
                                    className={`h-4 w-4 ${
                                      unit.is_primary
                                        ? 'fill-warning text-warning'
                                        : 'text-muted-foreground hover:text-warning'
                                    }`}
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {unit.is_primary ? 'Unidade principal' : 'Definir como principal'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm truncate">{unit.name}</span>
                              {unit.is_primary && (
                                <Badge variant="outline" className="text-xs border-warning text-warning">
                                  Principal
                                </Badge>
                              )}
                            </div>
                            <Badge className="mt-1" variant={unit.active ? "default" : "secondary"}>
                              {unit.active ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(unit)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={unit.active}
                            onCheckedChange={() => toggleActive(unit)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        {unit.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{unit.address}</span>
                          </div>
                        )}
                        {unit.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{unit.phone}</span>
                          </div>
                        )}
                        {unit.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{unit.email}</span>
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
                      {units.map((unit) => (
                        <TableRow key={unit.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="p-0 h-auto"
                                      onClick={() => setPrimary(unit)}
                                      disabled={unit.is_primary}
                                    >
                                      <Star
                                        className={`h-4 w-4 ${
                                          unit.is_primary
                                            ? 'fill-warning text-warning'
                                            : 'text-muted-foreground hover:text-warning'
                                        }`}
                                      />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {unit.is_primary ? 'Unidade principal' : 'Definir como principal'}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <GitBranch className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{unit.name}</span>
                              {unit.is_primary && (
                                <Badge variant="outline" className="text-xs border-warning text-warning">
                                  Principal
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {unit.address ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {unit.address}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {unit.phone && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {unit.phone}
                                </div>
                              )}
                              {unit.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {unit.email}
                                </div>
                              )}
                              {!unit.phone && !unit.email && (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={unit.active ? "default" : "secondary"}>
                              {unit.active ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(unit)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Switch
                                checked={unit.active}
                                onCheckedChange={() => toggleActive(unit)}
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
        </div>

        {/* Dialog de Criar/Editar Unidade */}
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
                  placeholder="Ex: Unidade Centro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <CEPInput
                  id="cep"
                  placeholder="00000-000"
                  value={formData.cep}
                  onChange={(value) => setFormData({ ...formData, cep: value })}
                  onAddressFound={(address: ViaCEPResponse) => {
                    setFormData(prev => ({
                      ...prev,
                      street: address.logradouro || prev.street,
                      neighborhood: address.bairro || prev.neighborhood,
                      city: address.localidade || prev.city,
                      state: address.uf || prev.state,
                    }));
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    placeholder="Nome da rua"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    placeholder="Nº"
                    value={formData.address_number}
                    onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  placeholder="Nome do bairro"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="Nome da cidade"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">UF</Label>
                  <Input
                    id="state"
                    placeholder="UF"
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contato@unidade.com"
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

        {/* Dialog de Editar Perfil da Barbearia */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Perfil da Barbearia</DialogTitle>
              <DialogDescription>
                Dados cadastrais da empresa
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nome da Barbearia *</Label>
                <Input
                  id="profile-name"
                  placeholder="Nome da sua barbearia"
                  value={profileFormData.name}
                  onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-cnpj">CPF ou CNPJ</Label>
                <CPFCNPJInput
                  id="profile-cnpj"
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  value={profileFormData.cnpj}
                  onChange={(value) => setProfileFormData({ ...profileFormData, cnpj: value })}
                />
                <p className="text-xs text-muted-foreground">
                  Digite apenas números - a formatação é automática
                </p>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="profile-cep">CEP</Label>
                      <CEPInput
                        id="profile-cep"
                        placeholder="00000-000"
                        value={profileFormData.cep}
                        onChange={(value) => setProfileFormData({ ...profileFormData, cep: value })}
                        onAddressFound={(addr: ViaCEPResponse) => {
                          setProfileFormData(prev => ({
                            ...prev,
                            street: addr.logradouro,
                            neighborhood: addr.bairro,
                            city: addr.localidade,
                            state: addr.uf,
                          }));
                          toast.success('Endereço encontrado!');
                        }}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="profile-street">Rua</Label>
                      <Input
                        id="profile-street"
                        placeholder="Rua, Avenida..."
                        value={profileFormData.street}
                        onChange={(e) => setProfileFormData({ ...profileFormData, street: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="profile-number">Número</Label>
                      <Input
                        id="profile-number"
                        placeholder="123"
                        value={profileFormData.address_number}
                        onChange={(e) => setProfileFormData({ ...profileFormData, address_number: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label htmlFor="profile-neighborhood">Bairro</Label>
                      <Input
                        id="profile-neighborhood"
                        placeholder="Bairro"
                        value={profileFormData.neighborhood}
                        onChange={(e) => setProfileFormData({ ...profileFormData, neighborhood: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 space-y-2">
                      <Label htmlFor="profile-city">Cidade</Label>
                      <Input
                        id="profile-city"
                        placeholder="Cidade"
                        value={profileFormData.city}
                        onChange={(e) => setProfileFormData({ ...profileFormData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-state">UF</Label>
                      <Input
                        id="profile-state"
                        placeholder="SP"
                        maxLength={2}
                        value={profileFormData.state}
                        onChange={(e) => setProfileFormData({ ...profileFormData, state: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">Telefone</Label>
                  <Input
                    id="profile-phone"
                    placeholder="(11) 99999-9999"
                    value={profileFormData.phone}
                    onChange={(e) => setProfileFormData({ ...profileFormData, phone: formatPhone(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    placeholder="contato@barbearia.com"
                    value={profileFormData.email}
                    onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Responsável Legal
                </h4>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="responsible-name">Nome do Responsável</Label>
                    <Input
                      id="responsible-name"
                      placeholder="Nome completo"
                      value={profileFormData.responsible_name}
                      onChange={(e) => setProfileFormData({ ...profileFormData, responsible_name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsible-phone">Telefone</Label>
                      <Input
                        id="responsible-phone"
                        placeholder="(11) 99999-9999"
                        value={profileFormData.responsible_phone}
                        onChange={(e) => setProfileFormData({ ...profileFormData, responsible_phone: formatPhone(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="responsible-email">Email</Label>
                      <Input
                        id="responsible-email"
                        type="email"
                        placeholder="responsavel@email.com"
                        value={profileFormData.responsible_email}
                        onChange={(e) => setProfileFormData({ ...profileFormData, responsible_email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
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
