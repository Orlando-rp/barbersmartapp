import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, User, Shield, Building2, Database, Wifi, Server, RefreshCw, Key } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ConnectionStatus {
  frontend: 'checking' | 'connected' | 'error';
  edgeFunction: 'checking' | 'connected' | 'error' | 'pending';
  database: 'checking' | 'connected' | 'error';
}

interface SecretStatus {
  name: string;
  configured: boolean;
  description: string;
}

const Debug = () => {
  const { user, userRole, barbershopId, session } = useAuth();
  const navigate = useNavigate();
  const [dataStats, setDataStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    frontend: 'checking',
    edgeFunction: 'pending',
    database: 'checking'
  });
  const [supabaseInfo, setSupabaseInfo] = useState({
    url: '',
    projectId: ''
  });
  const [testingEdgeFunction, setTestingEdgeFunction] = useState(false);

  // Secrets configurados no Supabase Externo
  const requiredSecrets: SecretStatus[] = [
    { name: 'SUPABASE_URL', configured: true, description: 'URL do projeto Supabase' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', configured: true, description: 'Chave de serviço (admin)' },
    { name: 'SUPABASE_ANON_KEY', configured: true, description: 'Chave pública anônima' },
  ];

  const optionalSecrets: SecretStatus[] = [
    { name: 'EVOLUTION_API_URL', configured: true, description: 'URL da API Evolution' },
    { name: 'EVOLUTION_API_KEY', configured: true, description: 'Chave da API Evolution' },
    { name: 'OPENAI_API_KEY', configured: true, description: 'Chave da API OpenAI' },
    { name: 'RESEND_API_KEY', configured: true, description: 'Chave da API Resend' },
    { name: 'WHATSAPP_API_TOKEN', configured: true, description: 'Token WhatsApp (Meta)' },
    { name: 'WHATSAPP_PHONE_NUMBER_ID', configured: true, description: 'ID do número WhatsApp' },
    { name: 'GITHUB_PAT', configured: true, description: 'Token GitHub (deploy)' },
    { name: 'CPANEL_TOKEN', configured: true, description: 'Token cPanel (subdomínios)' },
  ];

  useEffect(() => {
    // Obter informações do Supabase
    const url = import.meta.env.VITE_SUPABASE_URL || '';
    const projectId = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
    setSupabaseInfo({ url, projectId });

    // Testar conexão frontend
    testFrontendConnection();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDataStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const testFrontendConnection = async () => {
    try {
      setConnectionStatus(prev => ({ ...prev, frontend: 'checking', database: 'checking' }));
      
      // Testar conexão básica com o Supabase
      const { data, error } = await supabase.from('barbershops').select('id').limit(1);
      
      if (error) {
        console.error('Frontend connection error:', error);
        setConnectionStatus(prev => ({ ...prev, frontend: 'error', database: 'error' }));
      } else {
        setConnectionStatus(prev => ({ ...prev, frontend: 'connected', database: 'connected' }));
      }
    } catch (err) {
      console.error('Frontend connection exception:', err);
      setConnectionStatus(prev => ({ ...prev, frontend: 'error', database: 'error' }));
    }
  };

  const testEdgeFunctionConnection = async () => {
    setTestingEdgeFunction(true);
    setConnectionStatus(prev => ({ ...prev, edgeFunction: 'checking' }));
    
    try {
      // Tentar chamar uma edge function simples para testar
      const { data, error } = await supabase.functions.invoke('get-evolution-config', {
        method: 'POST',
        body: {}
      });
      
      if (error) {
        console.error('Edge function error:', error);
        setConnectionStatus(prev => ({ ...prev, edgeFunction: 'error' }));
        toast.error('Erro ao conectar com Edge Functions');
      } else {
        setConnectionStatus(prev => ({ ...prev, edgeFunction: 'connected' }));
        toast.success('Edge Functions conectadas com sucesso!');
      }
    } catch (err) {
      console.error('Edge function exception:', err);
      setConnectionStatus(prev => ({ ...prev, edgeFunction: 'error' }));
      toast.error('Erro ao testar Edge Functions');
    } finally {
      setTestingEdgeFunction(false);
    }
  };

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
      ] = await Promise.all([
        supabase.from('barbershops').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }),
        supabase.from('staff').select('*', { count: 'exact', head: true }),
        supabase.from('services').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
      ]);

      setDataStats({
        barbershops: barbershopsCount || 0,
        profiles: profilesCount || 0,
        roles: rolesCount || 0,
        staff: staffCount || 0,
        services: servicesCount || 0,
        clients: clientsCount || 0,
        appointments: appointmentsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching data stats:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusBadge = (status: 'checking' | 'connected' | 'error' | 'pending') => {
    switch (status) {
      case 'checking':
        return (
          <Badge variant="secondary" className="animate-pulse">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Verificando...
          </Badge>
        );
      case 'connected':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Aguardando teste
          </Badge>
        );
    }
  };

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
            <p className="text-muted-foreground">Diagnóstico de conexão com Supabase Externo</p>
          </div>
        </div>

        {/* Supabase Connection Info */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Conexão Supabase Externo
            </CardTitle>
            <CardDescription>
              Status da conexão com o projeto Supabase configurado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">URL do Supabase</label>
                <p className="font-mono text-sm bg-muted p-2 rounded mt-1 break-all">
                  {supabaseInfo.url || 'Não configurado'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Project ID</label>
                <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                  {supabaseInfo.projectId || 'Não identificado'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm font-medium">Frontend</span>
                </div>
                {getStatusBadge(connectionStatus.frontend)}
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="text-sm font-medium">Database</span>
                </div>
                {getStatusBadge(connectionStatus.database)}
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <span className="text-sm font-medium">Edge Functions</span>
                </div>
                {getStatusBadge(connectionStatus.edgeFunction)}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testFrontendConnection}
                disabled={connectionStatus.frontend === 'checking'}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${connectionStatus.frontend === 'checking' ? 'animate-spin' : ''}`} />
                Testar Conexão
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testEdgeFunctionConnection}
                disabled={testingEdgeFunction}
              >
                <Server className={`h-4 w-4 mr-2 ${testingEdgeFunction ? 'animate-spin' : ''}`} />
                Testar Edge Functions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Secrets Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Secrets Configurados
            </CardTitle>
            <CardDescription>
              Variáveis de ambiente necessárias para as Edge Functions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2 text-primary">Obrigatórios (Supabase)</h4>
              <div className="space-y-2">
                {requiredSecrets.map((secret) => (
                  <div key={secret.name} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div>
                      <span className="font-mono text-sm">{secret.name}</span>
                      <p className="text-xs text-muted-foreground">{secret.description}</p>
                    </div>
                    <Badge className={secret.configured ? 'bg-green-500' : 'bg-destructive'}>
                      {secret.configured ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Configurado
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Pendente
                        </>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Opcionais (Integrações)</h4>
              <div className="space-y-2">
                {optionalSecrets.map((secret) => (
                  <div key={secret.name} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div>
                      <span className="font-mono text-sm">{secret.name}</span>
                      <p className="text-xs text-muted-foreground">{secret.description}</p>
                    </div>
                    <Badge variant="outline" className={secret.configured ? 'border-green-500 text-green-600' : ''}>
                      {secret.configured ? 'Configurado' : 'Não configurado'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Info Card */}
        {user && (
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
        )}

        {/* Permissions Card */}
        {user && userRole && (
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
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Acesso global a todas as barbearias</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Gerenciamento de todas as barbearias</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Acesso a configurações globais do sistema</span>
                  </div>
                </div>
              )}

              {userRole === 'admin' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Gerenciamento completo da barbearia</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Gestão de equipe e serviços</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
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
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Ver e gerenciar seus próprios agendamentos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Ver lista de clientes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
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
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Criar agendamentos para qualquer barbeiro</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Cadastrar e gerenciar clientes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
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
        )}

        {/* Database Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Estatísticas do Banco de Dados
            </CardTitle>
            <CardDescription>Quantidade de registros em cada tabela (Supabase Externo)</CardDescription>
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
              </div>
            ) : !user ? (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Faça login para ver estatísticas detalhadas</p>
                <Button onClick={() => navigate('/auth')} className="mt-2">
                  Fazer Login
                </Button>
              </div>
            ) : (
              <p className="text-destructive">Erro ao carregar estatísticas</p>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
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
              {user ? (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ativo
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Não logado
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Conexão com Supabase</span>
              {getStatusBadge(connectionStatus.frontend)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Session Válida</span>
              {session ? (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Sim
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Não
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Role Atribuída</span>
              {userRole ? (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {getRoleLabel(userRole)}
                </Badge>
              ) : (
                <Badge variant="secondary">
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
