import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, CheckCircle, XCircle, UserPlus, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
    user_roles?: {
      id: string;
      role: string;
    }[];
  };
}

const Staff = () => {
  const { barbershopId, user } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [isCurrentUserInStaff, setIsCurrentUserInStaff] = useState(true);
  const [addingSelf, setAddingSelf] = useState(false);

  useEffect(() => {
    if (barbershopId) {
      fetchStaff();
    } else {
      setLoading(false);
    }
  }, [barbershopId]);

  // Real-time updates
  useEffect(() => {
    if (!barbershopId) return;

    const channel = supabase
      .channel('staff-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        () => {
          fetchStaff();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  const fetchStaff = async () => {
    if (!barbershopId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Buscar staff da barbearia
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select(`
          *,
          profiles!staff_user_id_fkey(
            full_name, 
            phone, 
            avatar_url
          )
        `)
        .eq('barbershop_id', barbershopId)
        .order('active', { ascending: false })
        .order('created_at', { ascending: false });

      if (staffError) throw staffError;

      // Buscar roles separadamente para cada membro (incluindo ID para updates)
      const staffWithRoles = await Promise.all((staffData || []).map(async (member) => {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('id, role')
          .eq('user_id', member.user_id)
          .eq('barbershop_id', barbershopId);
        
        return {
          ...member,
          user_roles: rolesData || [],
          profiles: {
            ...member.profiles,
            user_roles: rolesData || []
          }
        };
      }));

      setStaff(staffWithRoles);
      
      // Check if current user is in staff list
      if (user) {
        const currentUserInStaff = staffWithRoles.some(s => s.user_id === user.id);
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
          is_also_barber: true,
          specialties: ['Corte', 'Barba'],
          commission_rate: 50,
          active: true,
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
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Equipe</h1>
            <p className="text-muted-foreground">
              Gerencie os membros da sua equipe
            </p>
          </div>
          <Button onClick={handleAdd} variant="premium">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Membro
          </Button>
        </div>

        {/* Alert for admin not in staff list */}
        {!isCurrentUserInStaff && !loading && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-foreground">Você não está na lista de profissionais</p>
                    <p className="text-sm text-muted-foreground">
                      Clique para se adicionar como profissional e poder receber agendamentos
                    </p>
                  </div>
                </div>
                <Button onClick={handleAddSelfAsStaff} disabled={addingSelf} variant="outline">
                  {addingSelf ? 'Adicionando...' : 'Adicionar-me como Profissional'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle>Membros da Equipe</CardTitle>
            <CardDescription>
              {staff.length} {staff.length === 1 ? 'membro cadastrado' : 'membros cadastrados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : staff.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Nenhum membro da equipe cadastrado
                </p>
                <Button onClick={handleAdd} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Primeiro Membro
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Especialidades</TableHead>
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
                            <span>{member.profiles?.full_name || 'Nome não disponível'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{member.profiles?.phone || '-'}</TableCell>
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
                        <TableCell>
                          {member.specialties && member.specialties.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {member.specialties.slice(0, 2).map((spec, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                              {member.specialties.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{member.specialties.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Nenhuma</span>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(member)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(member)}
                            >
                              {member.active ? (
                                <XCircle className="h-4 w-4 text-orange-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(member.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
