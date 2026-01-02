import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  TestTube,
  Globe,
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

interface DiagnoseResult {
  success: boolean;
  functionVersion: string;
  timestamp: string;
  database: {
    evolutionApiConfigured: boolean;
    apiUrl: string | null;
    otpInstanceName: string | null;
    otpStatus: string | null;
  };
  resolved: {
    source: 'global' | 'barbershop_fallback';
    instanceName: string;
    barbershopId: string | null;
  } | null;
  health: {
    exists: boolean;
    connected: boolean;
    state: string | null;
    error: string | null;
  } | null;
  ready: boolean;
}

interface BarbershopStatus {
  id: string;
  name: string;
  hasOwnConfig: boolean;
  instanceName: string | null;
  status: 'connected' | 'disconnected' | 'not_configured';
  source: 'own' | 'global';
  lastUpdated: string | null;
}

interface WhatsAppLog {
  id: string;
  barbershop_id: string | null;
  barbershop_name?: string;
  recipient_phone: string;
  message_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export const WhatsAppDiagnosticPanel = () => {
  const [loading, setLoading] = useState(true);
  const [diagnoseResult, setDiagnoseResult] = useState<DiagnoseResult | null>(null);
  const [barbershopStatuses, setBarbershopStatuses] = useState<BarbershopStatus[]>([]);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Test OTP Dialog
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  
  // Diagnose loading
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        runDiagnose(),
        loadBarbershopStatuses(),
        loadLogs(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnose = async () => {
    setDiagnoseLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp-whatsapp', {
        body: { action: 'diagnose' }
      });

      if (error) throw error;
      setDiagnoseResult(data);
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      toast.error('Erro ao executar diagnóstico');
    } finally {
      setDiagnoseLoading(false);
    }
  };

  const loadBarbershopStatuses = async () => {
    try {
      // Buscar todas barbearias
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select('id, name')
        .order('name');

      // Buscar configs WhatsApp
      const { data: configs } = await supabase
        .from('whatsapp_config')
        .select('barbershop_id, config, is_active, updated_at')
        .eq('provider', 'evolution');

      const configMap = new Map(configs?.map(c => [c.barbershop_id, c]) || []);

      const statuses: BarbershopStatus[] = (barbershops || []).map(b => {
        const config = configMap.get(b.id);
        const hasOwnConfig = !!(config?.config?.instance_name);
        
        let status: 'connected' | 'disconnected' | 'not_configured' = 'not_configured';
        if (hasOwnConfig) {
          status = config?.config?.connection_status === 'connected' ? 'connected' : 'disconnected';
        }

        return {
          id: b.id,
          name: b.name,
          hasOwnConfig,
          instanceName: config?.config?.instance_name || null,
          status,
          source: hasOwnConfig ? 'own' : 'global',
          lastUpdated: config?.updated_at || null,
        };
      });

      setBarbershopStatuses(statuses);
    } catch (error) {
      console.error('Erro ao carregar status das barbearias:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: logsData } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

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
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  const sendTestOtp = async () => {
    if (!testPhone) {
      toast.error('Informe o número de telefone');
      return;
    }

    setTestLoading(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-otp-whatsapp', {
        body: { phone: testPhone }
      });

      setTestResult({ data, error: error?.message });
      
      if (data?.success) {
        toast.success(`OTP enviado via ${data.meta?.source}:${data.meta?.instanceName}`);
      } else {
        toast.error(data?.error || error?.message || 'Erro ao enviar OTP');
      }
    } catch (error: any) {
      setTestResult({ error: error.message });
      toast.error(error.message);
    } finally {
      setTestLoading(false);
    }
  };

  const filteredBarbershops = barbershopStatuses.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: 'connected' | 'disconnected' | 'not_configured') => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500"><Wifi className="h-3 w-3 mr-1" /> Conectado</Badge>;
      case 'disconnected':
        return <Badge variant="destructive"><WifiOff className="h-3 w-3 mr-1" /> Desconectado</Badge>;
      default:
        return <Badge variant="secondary"><Globe className="h-3 w-3 mr-1" /> Usa Global</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Geral do Sistema */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Status do Sistema WhatsApp
              </CardTitle>
              <CardDescription>
                Visão geral da configuração OTP e notificações
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setTestDialogOpen(true)}
              >
                <TestTube className="h-4 w-4 mr-2" />
                Testar OTP
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={runDiagnose}
                disabled={diagnoseLoading}
              >
                {diagnoseLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {diagnoseResult ? (
            <div className="space-y-4">
              {/* Status Principal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Evolution API */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Server className={`h-8 w-8 ${diagnoseResult.database.evolutionApiConfigured ? 'text-green-500' : 'text-destructive'}`} />
                  <div>
                    <p className="font-medium">Evolution API</p>
                    <p className="text-sm text-muted-foreground">
                      {diagnoseResult.database.evolutionApiConfigured ? 'Configurada' : 'Não configurada'}
                    </p>
                  </div>
                </div>

                {/* Instância Ativa */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <MessageSquare className={`h-8 w-8 ${diagnoseResult.health?.connected ? 'text-green-500' : 'text-amber-500'}`} />
                  <div>
                    <p className="font-medium">Instância Ativa</p>
                    <p className="text-sm text-muted-foreground">
                      {diagnoseResult.resolved?.instanceName || 'Nenhuma'}
                      {diagnoseResult.resolved?.source === 'barbershop_fallback' && (
                        <Badge variant="outline" className="ml-2 text-xs">Fallback</Badge>
                      )}
                    </p>
                  </div>
                </div>

                {/* Status de Conexão */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  {diagnoseResult.ready ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <XCircle className="h-8 w-8 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">
                      {diagnoseResult.ready ? 'Pronto para enviar' : 'Não disponível'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Alerta se não estiver pronto */}
              {!diagnoseResult.ready && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>WhatsApp não disponível</AlertTitle>
                  <AlertDescription>
                    {!diagnoseResult.database.evolutionApiConfigured 
                      ? 'Configure a Evolution API na aba "Evolution API".' 
                      : !diagnoseResult.resolved
                        ? 'Configure a instância OTP na aba "OTP WhatsApp" ou conecte o WhatsApp de uma barbearia.'
                        : `Instância "${diagnoseResult.resolved.instanceName}" está desconectada (state: ${diagnoseResult.health?.state}). Reconecte escaneando o QR Code.`
                    }
                  </AlertDescription>
                </Alert>
              )}

              {/* Detalhes Técnicos */}
              <div className="text-xs text-muted-foreground">
                <p>Função: v{diagnoseResult.functionVersion} | Último check: {format(new Date(diagnoseResult.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                {diagnoseResult.database.apiUrl && (
                  <p>API: {diagnoseResult.database.apiUrl}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Clique em atualizar para executar diagnóstico
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Barbearias */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                WhatsApp por Barbearia
              </CardTitle>
              <CardDescription>
                Status de conexão de cada barbearia
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar barbearia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barbearia</TableHead>
                  <TableHead>Configuração</TableHead>
                  <TableHead>Instância</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBarbershops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma barbearia encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBarbershops.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>
                        {b.hasOwnConfig ? (
                          <Badge variant="outline">Própria</Badge>
                        ) : (
                          <Badge variant="secondary">Global</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {b.instanceName || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(b.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {b.lastUpdated 
                          ? format(new Date(b.lastUpdated), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Resumo */}
          <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {barbershopStatuses.filter(b => b.status === 'connected').length} conectadas
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              {barbershopStatuses.filter(b => b.status === 'disconnected').length} desconectadas
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              {barbershopStatuses.filter(b => b.status === 'not_configured').length} usando global
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Logs Recentes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Logs Recentes (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Barbearia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.slice(0, 50).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.message_type || 'msg'}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.recipient_phone}</TableCell>
                    <TableCell className="text-sm">{log.barbershop_name}</TableCell>
                    <TableCell>
                      {log.status === 'sent' ? (
                        <Badge className="bg-green-500">Enviado</Badge>
                      ) : (
                        <Badge variant="destructive">Falhou</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {log.error_message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Teste OTP */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Testar Envio de OTP
            </DialogTitle>
            <DialogDescription>
              Envie um código OTP de teste para verificar se o sistema está funcionando.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">Número de Telefone</Label>
              <div className="flex gap-2">
                <Input
                  id="test-phone"
                  placeholder="11999999999"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
                <Button onClick={sendTestOtp} disabled={testLoading}>
                  {testLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {testResult && (
              <div className="p-3 rounded-md bg-muted text-sm font-mono overflow-auto max-h-60">
                <pre>{JSON.stringify(testResult, null, 2)}</pre>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
