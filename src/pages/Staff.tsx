import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, CheckCircle, XCircle, UserPlus, User, Building2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { StaffDialog } from "@/components/dialogs/StaffDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StaffMember {
  id: string;
  user_id: string;
  barbershop_id: string;
  specialties: string[];
  commission_rate: number;
  schedule: any;
  active: boolean;
  is_also_barber?: boolean;
  user_roles?: {
    id: string;
    role: string;
  }[];
  profiles: {
    full_name: string;
    phone: string;
    avatar_url: string;
    preferred_name?: string | null;
    user_roles?: {
      id: string;
      role: string;
    }[];
  };
  services?: string[];
  barbershop_name?: string;
  units?: string[];
}

const Staff = () => {
  const { barbershopId, user, barbershops, selectedBarbershopId } = useAuth();
  const { sharedBarbershopId, matrizBarbershopId, allRelatedBarbershopIds, isUnit, loading: sharedLoading } = useSharedBarbershopId();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [isCurrentUserInStaff, setIsCurrentUserInStaff] = useState(true);
  const [addingSelf, setAddingSelf] = useState(false);

  // Get effective barbershop ID for fetching - use matrizBarbershopId or fall back to first available
  const effectiveBarbershopId = matrizBarbershopId || (barbershops.length > 0 ? barbershops[0].id : null);

  // Get all barbershop IDs for shared staff (matriz + unidades)
  const getAllBarbershopIds = async (): Promise<string[]> => {
    // If we already have allRelatedBarbershopIds from hook, use them
    if (allRelatedBarbershopIds.length > 0) {
      return allRelatedBarbershopIds;
    }
    
    // Fallback: get from first barbershop
    const rootId = effectiveBarbershopId;
    if (!rootId) return [];
    
    // Get parent and all children from database
    const { data } = await supabase
      .from('barbershops')
      .select('id, parent_id')
      .or(`id.eq.${rootId},parent_id.eq.${rootId}`);
    
    if (!data) return [rootId];
    
    // If rootId has a parent, use parent as the real root
    const currentItem = data.find(b => b.id === rootId);
    if (currentItem?.parent_id) {
      const { data: parentData } = await supabase
        .from('barbershops')
        .select('id')
        .or(`id.eq.${currentItem.parent_id},parent_id.eq.${currentItem.parent_id}`);
      return parentData?.map(b => b.id) || [rootId];
    }
    
    return data?.map(b => b.id) || [rootId];
  };

  useEffect(() => {
    // Fetch staff when we have effective barbershop ID or loading is complete
    if (!sharedLoading) {
      if (effectiveBarbershopId) {
        fetchStaff();
      } else {
        setLoading(false);
      }
    }
  }, [effectiveBarbershopId, sharedLoading]);

  // Real-time updates
  useEffect(() => {
    if (!effectiveBarbershopId) return;

    const channel = supabase
      .channel('staff-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff'
        },
        () => {
          fetchStaff();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveBarbershopId]);

  const fetchStaff = async () => {
    if (!effectiveBarbershopId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Get all barbershop IDs (matriz + unidades)
      const allBarbershopIds = await getAllBarbershopIds();
      
      // Buscar nomes das barbearias
      const { data: barbershopsData } = await supabase
        .from('barbershops')
        .select('id, name')
        .in('id', allBarbershopIds);
      
      const barbershopNames = new Map(barbershopsData?.map(b => [b.id, b.name]) || []);
      
      // Buscar staff de todas as unidades
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select(`
          *,
          profiles!staff_user_id_fkey(
            full_name, 
            phone, 
            avatar_url,
            preferred_name
          )
        `)
        .in('barbershop_id', allBarbershopIds)
        .order('active', { ascending: false })
        .order('created_at', { ascending: false });

      if (staffError) throw staffError;

      // Group by user_id to avoid duplicates, keeping info about which units
      const userStaffMap = new Map<string, StaffMember & { units: string[] }>();
      
      for (const member of staffData || []) {
        const existing = userStaffMap.get(member.user_id);
        const unitName = barbershopNames.get(member.barbershop_id) || 'Unidade';
        
        if (existing) {
          existing.units.push(unitName);
        } else {
          userStaffMap.set(member.user_id, {
            ...member,
            barbershop_name: unitName,
            units: [unitName]
          } as StaffMember & { units: string[] });
        }
      }

      // Buscar roles e serviços para cada membro único
      const staffWithRolesAndServices = await Promise.all(
        Array.from(userStaffMap.values()).map(async (member) => {
          // Buscar TODAS as roles do usuário (pode ter admin + barbeiro)
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('id, role')
            .eq('user_id', member.user_id)
            .in('barbershop_id', allBarbershopIds);
          
          // Buscar serviços do staff
          let serviceNames: string[] = [];
          try {
            const { data: staffServices } = await supabase
              .from('staff_services')
              .select('service_id')
              .eq('staff_id', member.id)
              .eq('is_active', true);
            
            if (staffServices && staffServices.length > 0) {
              const serviceIds = staffServices.map(ss => ss.service_id);
              const { data: servicesData } = await supabase
                .from('services')
                .select('name')
                .in('id', serviceIds);
              
              serviceNames = (servicesData || []).map(s => s.name);
            }
          } catch (e) {
            console.warn('Erro ao buscar serviços do staff:', e);
          }
          
          return {
            ...member,
            user_roles: rolesData || [],
            services: serviceNames,
            profiles: {
              full_name: member.profiles?.full_name || 'Nome não disponível',
              phone: member.profiles?.phone || '',
              avatar_url: member.profiles?.avatar_url || '',
              preferred_name: member.profiles?.preferred_name || null,
              user_roles: rolesData || []
            }
          };
        })
      );

      setStaff(staffWithRolesAndServices);
      
      // Check if current user is in staff list
      if (user) {
        const currentUserInStaff = staffWithRolesAndServices.some(s => s.user_id === user.id);
        setIsCurrentUserInStaff(currentUserInStaff);
      }
    } catch (error: any) {
      console.error('Erro ao carregar equipe:', error);
      toast({
        title: 'Erro ao carregar equipe',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSelfAsStaff = async () => {
    if (!user || !barbershopId) return;
    
    setAddingSelf(true);
    try {
      const { error } = await supabase
        .from('staff')
        .insert({
          user_id: user.id,
          barbershop_id: barbershopId,
          specialties: ['Corte', 'Barba'],
          commission_rate: 50,
          active: true,
          schedule: {
            monday: { start: '09:00', end: '18:00', enabled: true },
            tuesday: { start: '09:00', end: '18:00', enabled: true },
            wednesday: { start: '09:00', end: '18:00', enabled: true },
            thursday: { start: '09:00', end: '18:00', enabled: true },
            friday: { start: '09:00', end: '18:00', enabled: true },
            saturday: { start: '09:00', end: '14:00', enabled: true },
            sunday: { start: '00:00', end: '00:00', enabled: false },
          },
        });

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Você foi adicionado como profissional da equipe.',
      });

      fetchStaff();
    } catch (error: any) {
      console.error('Erro ao adicionar como staff:', error);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAddingSelf(false);
    }
  };

  const handleAdd = () => {
    setSelectedStaff(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (member: StaffMember) => {
    setSelectedStaff(member);
    setDialogOpen(true);
  };

  const handleToggleActive = async (member: StaffMember) => {
    try {
      const { error } = await supabase
        .from('staff')
        .update({ active: !member.active })
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: member.active ? 'Membro desativado' : 'Membro ativado',
        description: `${member.profiles.full_name} foi ${member.active ? 'desativado' : 'ativado'} com sucesso.`,
      });

      fetchStaff();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setStaffToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return;

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffToDelete);

      if (error) throw error;

      toast({
        title: 'Membro removido',
        description: 'Membro da equipe removido com sucesso.',
      });

      fetchStaff();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'barbeiro':
        return 'secondary';
      case 'recepcionista':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'barbeiro':
        return 'Barbeiro';
      case 'recepcionista':
        return 'Recepcionista';
      default:
        return role;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Equipe</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerencie os membros da sua equipe
            </p>
          </div>
          <Button onClick={handleAdd} variant="premium" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Membro
          </Button>
        </div>

        {/* Alert for admin not in staff list */}
        {!isCurrentUserInStaff && !loading && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="p-3 sm:py-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <UserPlus className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm sm:text-base">Você não está na lista de profissionais</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Clique para se adicionar como profissional
                    </p>
                  </div>
                </div>
                <Button onClick={handleAddSelfAsStaff} disabled={addingSelf} variant="outline" className="w-full sm:w-auto text-xs sm:text-sm shrink-0">
                  {addingSelf ? 'Adicionando...' : 'Adicionar-me'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="barbershop-card">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Membros da Equipe</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {staff.length} {staff.length === 1 ? 'membro cadastrado' : 'membros cadastrados'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : staff.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4 text-sm">
                  Nenhum membro da equipe cadastrado
                </p>
                <Button onClick={handleAdd} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Primeiro Membro
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="block md:hidden space-y-3">
                  {staff.map((member) => (
                    <Card key={member.id} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarImage src={member.profiles?.avatar_url} alt={member.profiles?.full_name} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {member.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || <User className="h-3 w-3" />}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{member.profiles?.full_name || 'Nome não disponível'}</p>
                              <p className="text-xs text-muted-foreground truncate">{member.profiles?.phone || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(member)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleActive(member)}>
                              {member.active ? (
                                <XCircle className="h-3.5 w-3.5 text-orange-500" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick(member.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {member.active ? (
                            <Badge variant="default" className="bg-green-500 text-xs">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Inativo</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{member.commission_rate}%</Badge>
                          {member.profiles?.user_roles && member.profiles.user_roles.length > 0 && (
                            member.profiles.user_roles.map((ur, idx) => (
                              <Badge key={idx} variant={getRoleBadgeVariant(ur.role)} className="text-xs">
                                {getRoleLabel(ur.role)}
                              </Badge>
                            ))
                          )}
                        </div>
                        
                        {/* Services display on mobile */}
                        {member.services && member.services.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            <span className="text-xs text-muted-foreground">Serviços:</span>
                            {member.services.slice(0, 2).map((service, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {service}
                              </Badge>
                            ))}
                            {member.services.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{member.services.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead className="hidden lg:table-cell">Serviços</TableHead>
                        <TableHead>Comissão</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={member.profiles?.avatar_url} alt={member.profiles?.full_name} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {member.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || <User className="h-4 w-4" />}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[150px]">{member.profiles?.full_name || 'Nome não disponível'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{member.profiles?.phone || '-'}</TableCell>
                          <TableCell>
                            {member.profiles?.user_roles && member.profiles.user_roles.length > 0 ? (
                              <div className="flex gap-1">
                                {member.profiles.user_roles.map((ur, idx) => (
                                  <Badge key={idx} variant={getRoleBadgeVariant(ur.role)}>
                                    {getRoleLabel(ur.role)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="outline">Sem função</Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {member.services && member.services.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {member.services.slice(0, 2).map((service, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {service}
                                  </Badge>
                                ))}
                                {member.services.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{member.services.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Todos</span>
                            )}
                          </TableCell>
                          <TableCell>{member.commission_rate}%</TableCell>
                          <TableCell>
                            {member.active ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="mr-1 h-3 w-3" />
                                Inativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(member)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleToggleActive(member)}>
                                {member.active ? (
                                  <XCircle className="h-4 w-4 text-orange-500" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(member.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <StaffDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedStaff(undefined);
          }}
          staff={selectedStaff}
          onSuccess={() => {
            fetchStaff();
            setDialogOpen(false);
            setSelectedStaff(undefined);
          }}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este membro da equipe? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Staff;
