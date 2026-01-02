import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  Clock,
  Send,
  AlertTriangle,
  Phone,
  Server,
  Activity,
  Eye,
  TestTube,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface SystemHealth {
  evolutionApi: {
    configured: boolean;
    apiUrl: string | null;
    reachable: boolean | null;
  };
  otpInstance: {
    configured: boolean;
    instanceName: string | null;
    status: string | null;
    phoneNumber: string | null;
  };
  barbershopConfigs: {
    total: number;
    active: number;
    connected: number;
  };
}

interface WhatsAppLog {
  id: string;
  barbershop_id: string | null;
  barbershop_name?: string;
  phone: string;
  message_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  provider: string;
}

interface BarbershopConfig {
  id: string;
  barbershop_id: string;
  barbershop_name: string;
  provider: string;
  is_active: boolean;
  instance_name: string | null;
  connection_status: string | null;
  updated_at: string;
}

export const WhatsAppDiagnosticPanel = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [configs, setConfigs] = useState<BarbershopConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedBarbershopLogs, setSelectedBarbershopLogs] = useState<WhatsAppLog[]>([]);
  const [selectedBarbershopName, setSelectedBarbershopName] = useState("");

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchHealth(),
        fetchLogs(),
        fetchConfigs(),
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    // Evolution API config
    const { data: evolutionData } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'evolution_api')
      .maybeSingle();

    // OTP config
    const { data: otpData } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'otp_whatsapp')
      .maybeSingle();

    // WhatsApp configs count
    const { data: allConfigs } = await supabase
      .from('whatsapp_config')
      .select('id, is_active, config')
      .eq('provider', 'evolution');

    const activeConfigs = allConfigs?.filter(c => c.is_active) || [];
    const connectedConfigs = allConfigs?.filter(c => 
      c.is_active && c.config?.connection_status === 'connected'
    ) || [];

    setHealth({
      evolutionApi: {
        configured: !!(evolutionData?.value?.api_url && evolutionData?.value?.api_key),
        apiUrl: evolutionData?.value?.api_url || null,
        reachable: null, // Will be checked on demand
      },
      otpInstance: {
        configured: !!otpData?.value?.instance_name,
        instanceName: otpData?.value?.instance_name || null,
        status: otpData?.value?.status || null,
        phoneNumber: otpData?.value?.phone_number || null,
      },
      barbershopConfigs: {
        total: allConfigs?.length || 0,
        active: activeConfigs.length,
        connected: connectedConfigs.length,
      },
    });
  };

  const fetchLogs = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: logsData, error } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Erro ao buscar logs:', error);
      return;
    }

    // Get barbershop names
    const barbershopIds = [...new Set(logsData?.filter(l => l.barbershop_id).map(l => l.barbershop_id) || [])];
    const { data: barbershops } = await supabase
      .from('barbershops')
      .select('id, name')
      .in('id', barbershopIds);

    const barbershopMap = new Map(barbershops?.map(b => [b.id, b.name]) || []);

    setLogs((logsData || []).map(log => ({
      ...log,
      barbershop_name: log.barbershop_id ? barbershopMap.get(log.barbershop_id) || 'Desconhecida' : 'Global (OTP)',
    })));
  };

  const fetchConfigs = async () => {
    const { data: configsData, error } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('provider', 'evolution')
      .not('barbershop_id', 'is', null);

    if (error) {
      console.error('Erro ao buscar configs:', error);
      return;
    }

    // Get barbershop names
    const barbershopIds = configsData?.map(c => c.barbershop_id) || [];
    const { data: barbershops } = await supabase
      .from('barbershops')
      .select('id, name')
      .in('id', barbershopIds);

    const barbershopMap = new Map(barbershops?.map(b => [b.id, b.name]) || []);

    setConfigs((configsData || []).map(config => ({
      id: config.id,
      barbershop_id: config.barbershop_id,
      barbershop_name: barbershopMap.get(config.barbershop_id) || 'Desconhecida',
      provider: config.provider,
      is_active: config.is_active,
      instance_name: config.config?.instance_name || null,
      connection_status: config.config?.connection_status || null,
      updated_at: config.updated_at,
    })));
  };

  const checkApiReachability = async () => {
    if (!health?.evolutionApi.apiUrl) return;

    setRefreshing(true);
    try {
      const { data: evolutionData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'fetchInstances',
          apiUrl: evolutionData?.value?.api_url,
          apiKey: evolutionData?.value?.api_key,
        }
      });

      if (error) throw error;

      setHealth(prev => prev ? {
        ...prev,
        evolutionApi: {
          ...prev.evolutionApi,
          reachable: true,
        }
      } : null);

      toast.success('Evolution API está acessível');
    } catch (error) {
      console.error('Erro ao verificar API:', error);
      setHealth(prev => prev ? {
        ...prev,
        evolutionApi: {
          ...prev.evolutionApi,
          reachable: false,
        }
      } : null);
      toast.error('Evolution API não está acessível');
    } finally {
      setRefreshing(false);
    }
  };

  const reconnectInstance = async (instanceName: string, barbershopId: string) => {
    setRefreshing(true);
    try {
      const { data: evolutionData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();

      if (!evolutionData?.value?.api_url) {
        toast.error('Evolution API não configurada');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'connectionState',
          apiUrl: evolutionData.value.api_url,
          apiKey: evolutionData.value.api_key,
          instanceName,
        }
      });

      if (error) throw error;

      const isConnected = data?.state === 'open' || data?.instance?.state === 'open';
      
      // Update config in database
      await supabase
        .from('whatsapp_config')
        .update({
          is_active: isConnected,
          config: {
            instance_name: instanceName,
            connection_status: isConnected ? 'connected' : 'disconnected',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution');

      toast.success(isConnected ? 'Instância conectada!' : 'Instância desconectada');
      await fetchConfigs();
    } catch (error) {
      console.error('Erro ao reconectar:', error);
      toast.error('Erro ao verificar instância');
    } finally {
      setRefreshing(false);
    }
  };

  const sendTestOtp = async () => {
    if (!testPhone || testPhone.length < 10) {
      toast.error('Digite um número de telefone válido');
      return;
    }

    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp-whatsapp', {
        body: { phone: testPhone }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('OTP enviado com sucesso!', {
        description: `Código enviado para ${testPhone}`
      });
      setTestDialogOpen(false);
      setTestPhone("");
      await fetchLogs();
    } catch (error: any) {
      console.error('Erro ao enviar OTP:', error);
      toast.error('Erro ao enviar OTP', {
        description: error.message || 'Verifique os logs para mais detalhes'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const viewBarbershopLogs = async (barbershopId: string, barbershopName: string) => {
    const shopLogs = logs.filter(l => l.barbershop_id === barbershopId);
    setSelectedBarbershopLogs(shopLogs);
    setSelectedBarbershopName(barbershopName);
    setLogsDialogOpen(true);
  };

  const getStatusBadge = (status: string | null, isActive: boolean) => {
    if (!status || status === 'disconnected' || !isActive) {
      return (
        <Badge variant="outline" className="text-muted-foreground border-border text-xs">
          <WifiOff className="h-3 w-3 mr-1" />
          Desconectado
        </Badge>
      );
    }
    if (status === 'connected') {
      return (
        <Badge className="bg-success/20 text-success border-success/50 text-xs">
          <Wifi className="h-3 w-3 mr-1" />
          Conectado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-warning border-warning/50 text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.phone.includes(searchTerm) || 
                         log.barbershop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.message_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = logFilter === 'all' || 
                         (logFilter === 'success' && log.status === 'sent') ||
                         (logFilter === 'failed' && log.status === 'failed');
    return matchesSearch && matchesFilter;
  });

  const logStats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-warning" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-warning" />
            Saúde do Sistema WhatsApp
          </CardTitle>
          <CardDescription>
            Visão geral do status de todas as integrações WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Evolution API */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Evolution API</p>
                <p className="text-sm text-muted-foreground">
                  {health?.evolutionApi.apiUrl || 'Não configurado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {health?.evolutionApi.configured ? (
                <>
                  {health.evolutionApi.reachable === null ? (
                    <Badge variant="outline">Não verificado</Badge>
                  ) : health.evolutionApi.reachable ? (
                    <Badge className="bg-success/20 text-success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Acessível
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inacessível
                    </Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={checkApiReachability}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Não configurado
                </Badge>
              )}
            </div>
          </div>

          {/* OTP Instance */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Instância OTP Global</p>
                <p className="text-sm text-muted-foreground">
                  {health?.otpInstance.instanceName || 'Não configurado'}
                  {health?.otpInstance.phoneNumber && ` (+${health.otpInstance.phoneNumber})`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {health?.otpInstance.configured ? (
                health.otpInstance.status === 'connected' ? (
                  <Badge className="bg-success/20 text-success">
                    <Wifi className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-warning border-warning">
                    <WifiOff className="h-3 w-3 mr-1" />
                    {health.otpInstance.status || 'Desconectado'}
                  </Badge>
                )
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Não configurado
                </Badge>
              )}
            </div>
          </div>

          {/* Barbershop Configs Summary */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Barbearias com WhatsApp</p>
                <p className="text-sm text-muted-foreground">
                  {health?.barbershopConfigs.connected} conectadas de {health?.barbershopConfigs.total} configuradas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {health?.barbershopConfigs.active} ativas
              </Badge>
              <Badge className="bg-success/20 text-success">
                {health?.barbershopConfigs.connected} conectadas
              </Badge>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setTestDialogOpen(true)}
              disabled={!health?.evolutionApi.configured}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Testar Envio OTP
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchAllData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar Tudo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Configs and Logs */}
      <Tabs defaultValue="configs" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="configs">
            <Building2 className="h-4 w-4 mr-2" />
            Configurações ({configs.length})
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Clock className="h-4 w-4 mr-2" />
            Logs ({logs.length})
          </TabsTrigger>
        </TabsList>

        {/* Configs Tab */}
        <TabsContent value="configs">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Configurações WhatsApp por Barbearia</CardTitle>
              <CardDescription>
                Gerencie as instâncias WhatsApp de cada barbearia
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma barbearia com WhatsApp configurado
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Barbearia</TableHead>
                        <TableHead>Instância</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Última Atualização</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((config) => (
                        <TableRow key={config.id} className="border-border">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-warning" />
                              <span className="font-medium text-foreground">{config.barbershop_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {config.instance_name || '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(config.connection_status, config.is_active)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(config.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewBarbershopLogs(config.barbershop_id, config.barbershop_name)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {config.instance_name && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => reconnectInstance(config.instance_name!, config.barbershop_id)}
                                  disabled={refreshing}
                                >
                                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                                </Button>
                              )}
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
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-foreground">Logs de Envio (Últimos 7 dias)</CardTitle>
                  <CardDescription>
                    Histórico de mensagens enviadas via WhatsApp
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{logStats.total} total</Badge>
                  <Badge className="bg-success/20 text-success">{logStats.success} enviadas</Badge>
                  <Badge variant="destructive">{logStats.failed} falhas</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por telefone, barbearia ou tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-muted border-border"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={logFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogFilter('all')}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={logFilter === 'success' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogFilter('success')}
                  >
                    Sucesso
                  </Button>
                  <Button
                    variant={logFilter === 'failed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogFilter('failed')}
                  >
                    Falhas
                  </Button>
                </div>
              </div>

              {/* Logs Table */}
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum log encontrado
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-x-auto max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow className="border-border">
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Barbearia</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.slice(0, 100).map((log) => (
                        <TableRow key={log.id} className="border-border">
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-foreground text-sm">
                            {log.barbershop_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {log.phone}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {log.message_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.status === 'sent' ? (
                              <Badge className="bg-success/20 text-success text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Enviado
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                <XCircle className="h-3 w-3 mr-1" />
                                Falha
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-destructive text-xs max-w-[200px] truncate">
                            {log.error_message || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test OTP Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-warning" />
              Testar Envio de OTP
            </DialogTitle>
            <DialogDescription>
              Envie um código OTP de teste para verificar se o sistema está funcionando corretamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">Número de Telefone</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="test-phone"
                  placeholder="11999999999"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Digite apenas os números (DDD + número)
              </p>
            </div>

            {!health?.otpInstance.configured || health?.otpInstance.status !== 'connected' ? (
              <Alert className="border-warning/50 bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">Atenção</AlertTitle>
                <AlertDescription className="text-warning/90">
                  A instância OTP global não está conectada. O sistema tentará usar uma instância de barbearia como fallback.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={sendTestOtp} disabled={testLoading}>
              {testLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar OTP de Teste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barbershop Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-warning" />
              Logs de {selectedBarbershopName}
            </DialogTitle>
            <DialogDescription>
              Histórico de mensagens enviadas por esta barbearia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBarbershopLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log encontrado para esta barbearia
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-x-auto max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow className="border-border">
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBarbershopLogs.map((log) => (
                      <TableRow key={log.id} className="border-border">
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {log.phone}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.message_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.status === 'sent' ? (
                            <Badge className="bg-success/20 text-success text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Enviado
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Falha
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-destructive text-xs max-w-[150px] truncate">
                          {log.error_message || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
