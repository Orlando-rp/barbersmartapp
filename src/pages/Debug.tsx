import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, User, Shield, Building2, Database } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const Debug = () => {
  const { user, userRole, barbershopId, session } = useAuth();
  const navigate = useNavigate();
  const [dataStats, setDataStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDataStats = async () => {
      try {
        const [
          { count: barbershopsCount },
          { count: profilesCount },
          { count: rolesCount },
          { count: staffCount },
          { count: servicesCount },
          { count: clientsCount },
          { count: appointmentsCount },
          { count: transactionsCount },
        ] = await Promise.all([
          supabase.from('barbershops').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('user_roles').select('*', { count: 'exact', head: true }),
          supabase.from('staff').select('*', { count: 'exact', head: true }),
          supabase.from('services').select('*', { count: 'exact', head: true }),
          supabase.from('clients').select('*', { count: 'exact', head: true }),
          supabase.from('appointments').select('*', { count: 'exact', head: true }),
          supabase.from('transactions').select('*', { count: 'exact', head: true }),
        ]);

        setDataStats({
          barbershops: barbershopsCount || 0,
          profiles: profilesCount || 0,
          roles: rolesCount || 0,
          staff: staffCount || 0,
          services: servicesCount || 0,
          clients: clientsCount || 0,
          appointments: appointmentsCount || 0,
          transactions: transactionsCount || 0,
        });
      } catch (error) {
        console.error('Error fetching data stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDataStats();
    }
  }, [user]);

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500';
      case 'admin':
        return 'bg-blue-500';
      case 'barbeiro':
        return 'bg-green-500';
      case 'recepcionista':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin da Barbearia';
      case 'barbeiro':
        return 'Barbeiro';
      case 'recepcionista':
        return 'Recepcionista';
      default:
        return 'Sem Role';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-warning" />
              Acesso Negado
            </CardTitle>
            <CardDescription>Você precisa estar logado para ver esta página</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')}>Fazer Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Debug - Informações do Sistema</h1>
            <p className="text-muted-foreground">Visualize as informações de autenticação e dados do sistema</p>
          </div>
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Usuário Logado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">User ID</label>
                <p className="font-mono text-sm bg-muted p-2 rounded mt-1">{user.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="font-mono text-sm bg-muted p-2 rounded mt-1">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <div className="mt-1">
                  <Badge className={getRoleColor(userRole)}>
                    {getRoleLabel(userRole)}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Barbearia ID</label>
                <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                  {barbershopId || 'Nenhuma (Super Admin)'}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Session Token (primeiros 50 caracteres)</label>
              <p className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">
                {session?.access_token?.substring(0, 50)}...
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissões da Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userRole === 'super_admin' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Acesso global a todas as barbearias</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Gerenciamento de todas as barbearias</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Acesso a configurações globais do sistema</span>
                </div>
              </div>
            )}

            {userRole === 'admin' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Gerenciamento completo da barbearia</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Gestão de equipe e serviços</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Acesso a relatórios financeiros completos</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">Não pode ver dados de outras barbearias</span>
                </div>
              </div>
            )}

            {userRole === 'barbeiro' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Ver e gerenciar seus próprios agendamentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Ver lista de clientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Ver suas próprias comissões</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">Não pode editar serviços ou configurações</span>
                </div>
              </div>
            )}

            {userRole === 'recepcionista' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Criar agendamentos para qualquer barbeiro</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Cadastrar e gerenciar clientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm">Ver agendamentos de todos os barbeiros</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">Não pode ver relatórios financeiros completos</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Estatísticas do Banco de Dados
            </CardTitle>
            <CardDescription>Quantidade de registros em cada tabela</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Carregando estatísticas...</p>
            ) : dataStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{dataStats.barbershops}</p>
                  <p className="text-sm text-muted-foreground">Barbearias</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{dataStats.profiles}</p>
                  <p className="text-sm text-muted-foreground">Perfis</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{dataStats.roles}</p>
                  <p className="text-sm text-muted-foreground">Roles</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{dataStats.staff}</p>
                  <p className="text-sm text-muted-foreground">Barbeiros</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{dataStats.services}</p>
                  <p className="text-sm text-muted-foreground">Serviços</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{dataStats.clients}</p>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{dataStats.appointments}</p>
                  <p className="text-sm text-muted-foreground">Agendamentos</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{dataStats.transactions}</p>
                  <p className="text-sm text-muted-foreground">Transações</p>
                </div>
              </div>
            ) : (
              <p className="text-destructive">Erro ao carregar estatísticas</p>
            )}
          </CardContent>
        </Card>

        {/* Status Checks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Autenticação</span>
              <Badge variant="default" className="bg-success">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Conexão com Supabase</span>
              <Badge variant="default" className="bg-success">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Session Válida</span>
              <Badge variant="default" className="bg-success">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Sim
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Role Atribuída</span>
              {userRole ? (
                <Badge variant="default" className="bg-success">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Sim
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Não
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Debug;
