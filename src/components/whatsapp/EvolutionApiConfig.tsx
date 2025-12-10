import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Wifi, 
  WifiOff, 
  QrCode,
  RefreshCw,
  Loader2,
  Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { WhatsAppLogs } from "./WhatsAppLogs";
import { WhatsAppStats } from "./WhatsAppStats";
import { QRCodeModal } from "./QRCodeModal";
import { MessageTemplates, MessageTemplate } from "./MessageTemplates";

interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

interface EvolutionApiConfigProps {
  isSaasAdmin?: boolean;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Gera nome único da instância baseado no barbershopId
const generateInstanceName = (barbershopId: string): string => {
  const shortId = barbershopId.split('-')[0];
  return `bs-${shortId}`;
};

export const EvolutionApiConfig = ({ isSaasAdmin = false }: EvolutionApiConfigProps) => {
  const { user, barbershopId } = useAuth();
  const generatedInstanceName = barbershopId ? generateInstanceName(barbershopId) : '';
  
  const [config, setConfig] = useState<EvolutionConfig>({
    apiUrl: '',
    apiKey: '',
    instanceName: generatedInstanceName
  });
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste do BarberSmart via Evolution API.");
  const [sending, setSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [isUsingGlobalConfig, setIsUsingGlobalConfig] = useState(false);

  const handleSelectTemplate = (template: MessageTemplate) => {
    setTestMessage(template.message);
    setSelectedTemplateId(template.id);
    toast.success(`Template "${template.name}" selecionado`);
  };

  useEffect(() => {
    if (barbershopId) {
      // Define instanceName automaticamente se não estiver definido
      if (!config.instanceName) {
        setConfig(prev => ({ ...prev, instanceName: generateInstanceName(barbershopId) }));
      }
      loadConfig();
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [barbershopId]);

  const loadConfig = async () => {
    if (!barbershopId) return;

    try {
      // Primeiro buscar config global da tabela system_config
      const { data: globalConfig } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', 'evolution_api')
        .maybeSingle();

      const globalApiUrl = globalConfig?.value?.api_url || '';
      const globalApiKey = globalConfig?.value?.api_key || '';

      // Depois buscar configuração específica da barbearia
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution')
        .maybeSingle();

      if (error && !error.message?.includes('whatsapp_config')) {
        console.error('Erro ao carregar config:', error);
      }

      if (data?.config) {
        // Usa config local, mas herda api_url e api_key da global se não existir local
        setConfig({
          apiUrl: data.config.api_url || globalApiUrl,
          apiKey: data.config.api_key || globalApiKey,
          instanceName: data.config.instance_name || generatedInstanceName
        });
        if (data.config.connection_status) {
          setConnectionStatus(data.config.connection_status);
        }
        if (data.config.connected_phone) {
          setConnectedPhone(data.config.connected_phone);
        }
        setIsUsingGlobalConfig(!data.config.api_url && !data.config.api_key && (!!globalApiUrl || !!globalApiKey));
        
        // Se já está marcado como conectado, verificar status real
        if (data.config.connection_status === 'connected') {
          setTimeout(() => checkConnection(), 1000);
        }
      } else if (globalApiUrl || globalApiKey) {
        // Usar config global com instanceName local
        setConfig({
          apiUrl: globalApiUrl,
          apiKey: globalApiKey,
          instanceName: generatedInstanceName
        });
        setIsUsingGlobalConfig(true);
      } else {
        // Sem nenhuma config, apenas usar instanceName gerado
        setConfig(prev => ({ ...prev, instanceName: generatedInstanceName }));
        setIsUsingGlobalConfig(false);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const saveConfig = async () => {
    if (!barbershopId) {
      toast.error("ID da barbearia não encontrado");
      return;
    }

    if (!config.apiUrl || !config.apiKey || !config.instanceName) {
      toast.error("Preencha todos os campos de configuração");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('whatsapp_config')
        .upsert({
          barbershop_id: barbershopId,
          provider: 'evolution',
          config: {
            api_url: config.apiUrl,
            api_key: config.apiKey,
            instance_name: config.instanceName,
            connection_status: connectionStatus
          },
          is_active: connectionStatus === 'connected',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'barbershop_id,provider'
        });

      if (error) throw error;

      toast.success("Configuração salva com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const checkConnection = async () => {
    if (!config.apiUrl || !config.instanceName) {
      toast.error("Configure a URL e nome da instância primeiro");
      return;
    }

    try {
      setCheckingConnection(true);

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'connectionState',
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName
        }
      });

      // Handle instance not found (404) - treat as disconnected, not error
      if (data?.success === false && data?.details?.status === 404) {
        setConnectionStatus('disconnected');
        setConnectedPhone(null);
        toast.info("Instância não encontrada. Clique em 'Conectar WhatsApp' para criar.");
        return;
      }

      if (error) throw error;

      if (data?.state === 'open' || data?.instance?.state === 'open') {
        setConnectionStatus('connected');
        // Buscar informações da instância incluindo número
        await fetchInstanceInfo();
        await updateConnectionInDatabase('connected');
        toast.success("WhatsApp conectado!");
      } else {
        setConnectionStatus('disconnected');
        setConnectedPhone(null);
        await updateConnectionInDatabase('disconnected');
        toast.info("WhatsApp não está conectado");
      }
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      setConnectionStatus('error');
      toast.error("Erro ao verificar conexão");
    } finally {
      setCheckingConnection(false);
    }
  };

  const connectInstance = async () => {
    if (!config.apiUrl || !config.apiKey || !config.instanceName) {
      toast.error("Preencha todos os campos de configuração primeiro");
      return;
    }

    try {
      setQrLoading(true);
      setQrModalOpen(true);
      setConnectionStatus('connecting');

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'connect',
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName
        }
      });

      if (error) throw error;

      if (data?.base64 || data?.code) {
        const qrBase64 = data.base64 || data.code;
        setQrCode(qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`);
        startPollingConnection();
      } else {
        throw new Error("QR Code não recebido");
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      setConnectionStatus('error');
      toast.error("Erro ao gerar QR Code");
    } finally {
      setQrLoading(false);
    }
  };

  const startPollingConnection = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke('send-whatsapp-evolution', {
          body: {
            action: 'connectionState',
            apiUrl: config.apiUrl,
            apiKey: config.apiKey,
            instanceName: config.instanceName
          }
        });

        if (data?.state === 'open' || data?.instance?.state === 'open') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          
          // Buscar informações da instância para obter o número conectado
          await fetchInstanceInfo();
          
          setConnectionStatus('connected');
          setQrModalOpen(false);
          toast.success("WhatsApp conectado com sucesso!");
          
          // Atualizar status no banco de dados
          await updateConnectionInDatabase('connected');
        }
      } catch (error) {
        console.error('Erro no polling:', error);
      }
    }, 3000);

    // Stop polling after 2 minutes
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }, 120000);
  };

  const fetchInstanceInfo = async () => {
    try {
      const { data } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'instanceInfo',
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName
        }
      });

      console.log('Instance info:', data);

      // Evolution API retorna array de instâncias ou objeto com a instância
      const instances = data?.instances || data || [];
      const instance = Array.isArray(instances) ? instances[0] : instances;
      
      if (instance?.owner || instance?.ownerJid || instance?.instance?.owner) {
        const ownerJid = instance.owner || instance.ownerJid || instance.instance?.owner;
        const phoneNumber = ownerJid?.split('@')?.[0] || ownerJid;
        setConnectedPhone(phoneNumber);
        console.log('Connected phone:', phoneNumber);
      }
    } catch (error) {
      console.error('Erro ao buscar info da instância:', error);
    }
  };

  const updateConnectionInDatabase = async (status: 'connected' | 'disconnected') => {
    if (!barbershopId) return;
    
    try {
      await supabase
        .from('whatsapp_config')
        .update({
          config: {
            api_url: config.apiUrl,
            api_key: config.apiKey,
            instance_name: config.instanceName,
            connection_status: status,
            connected_phone: status === 'connected' ? connectedPhone : null
          },
          is_active: status === 'connected',
          updated_at: new Date().toISOString()
        })
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution');
    } catch (error) {
      console.error('Erro ao atualizar status no banco:', error);
    }
  };

  const disconnectInstance = async () => {
    if (!config.apiUrl || !config.instanceName) return;

    try {
      setCheckingConnection(true);

      // Primeiro faz logout da sessão
      await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'logout',
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName
        }
      });

      // Depois exclui a instância completamente
      const { error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'deleteInstance',
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName
        }
      });

      if (error) {
        console.error('Erro ao excluir instância:', error);
      }

      // Atualiza status no banco de dados
      await supabase
        .from('whatsapp_config')
        .update({
          config: {
            api_url: config.apiUrl,
            api_key: config.apiKey,
            instance_name: config.instanceName,
            connection_status: 'disconnected'
          },
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution');

      setConnectionStatus('disconnected');
      toast.success("WhatsApp desconectado e instância excluída");
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast.error("Erro ao desconectar");
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast.error("Preencha o telefone e a mensagem");
      return;
    }

    if (!barbershopId) {
      toast.error("ID da barbearia não encontrado");
      return;
    }

    if (connectionStatus !== 'connected') {
      toast.error("Conecte o WhatsApp primeiro");
      return;
    }

    try {
      setSending(true);

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'sendText',
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName,
          to: testPhone,
          message: testMessage,
          barbershopId,
          recipientName: 'Teste',
          createdBy: user?.id
        }
      });

      if (error) throw error;

      if (data?.success || data?.key) {
        toast.success("Mensagem enviada com sucesso!");
        setTestPhone("");
      } else {
        throw new Error(data?.error || "Falha ao enviar mensagem");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const refreshQRCode = async () => {
    setQrLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'connect',
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName
        }
      });

      if (error) throw error;

      if (data?.base64 || data?.code) {
        const qrBase64 = data.base64 || data.code;
        setQrCode(qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar QR:', error);
      toast.error("Erro ao atualizar QR Code");
    } finally {
      setQrLoading(false);
    }
  };

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-success/10 text-success"><Wifi className="h-3 w-3 mr-1" />Conectado</Badge>;
      case 'connecting':
        return <Badge className="bg-warning/10 text-warning"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Conectando</Badge>;
      case 'error':
        return <Badge className="bg-destructive/10 text-destructive"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="outline"><WifiOff className="h-3 w-3 mr-1" />Desconectado</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard - Always on top */}
      <WhatsAppStats provider="evolution" />

      {/* Server Configuration - Only for SaaS Admin */}
      {isSaasAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Configuração do Servidor
            </CardTitle>
            <CardDescription>
              Configure a conexão com seu servidor Evolution API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">URL do Servidor</Label>
              <Input
                id="api-url"
                type="url"
                value={config.apiUrl}
                onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                placeholder="https://api.evolution.seudominio.com"
              />
              <p className="text-xs text-muted-foreground">
                URL base do seu servidor Evolution API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">API Key (Global)</Label>
              <Input
                id="api-key"
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sua-api-key-global"
              />
              <p className="text-xs text-muted-foreground">
                Chave de API configurada no servidor Evolution
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="instance-name">Nome da Instância</Label>
                <Badge variant="secondary" className="text-xs">Gerado automaticamente</Badge>
              </div>
              <Input
                id="instance-name"
                type="text"
                value={config.instanceName}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Identificador único gerado com base no ID da sua barbearia
              </p>
            </div>

            <Button onClick={saveConfig} disabled={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              Status da Conexão
            </span>
            {getConnectionBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={checkConnection}
              disabled={checkingConnection || !config.apiUrl || !config.instanceName}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${checkingConnection ? 'animate-spin' : ''}`} />
              Verificar Status
            </Button>

            {connectionStatus !== 'connected' ? (
              <Button
                onClick={connectInstance}
                disabled={!config.apiUrl || !config.apiKey || !config.instanceName}
              >
                <QrCode className="mr-2 h-4 w-4" />
                Conectar WhatsApp
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={disconnectInstance}
                disabled={checkingConnection}
              >
                <WifiOff className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            )}
          </div>

          {connectionStatus === 'connected' && (
            <div className="p-4 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">WhatsApp conectado e pronto para uso!</span>
              </div>
            </div>
          )}

          {/* Diagnóstico detalhado */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Diagnóstico da Conexão
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">URL do Servidor:</p>
                <p className="font-mono text-xs break-all">
                  {config.apiUrl || <span className="text-destructive">Não configurado</span>}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">API Key:</p>
                <p className="font-mono text-xs">
                  {config.apiKey ? '••••••••' + config.apiKey.slice(-4) : <span className="text-destructive">Não configurado</span>}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Nome da Instância:</p>
                <p className="font-mono text-xs">
                  {config.instanceName || <span className="text-destructive">Não configurado</span>}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Telefone Conectado:</p>
                <p className="font-mono text-xs">
                  {connectedPhone ? (
                    <span className="text-success font-medium">+{connectedPhone}</span>
                  ) : connectionStatus === 'connected' ? (
                    <span className="text-warning">Verificando...</span>
                  ) : (
                    <span className="text-muted-foreground">Nenhum</span>
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Usando Config Global:</p>
                <p className="text-xs">
                  {isUsingGlobalConfig ? (
                    <Badge variant="outline" className="text-xs">Sim</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Não</Badge>
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Status Atual:</p>
                <p className="text-xs">
                  {getConnectionBadge()}
                </p>
              </div>
            </div>
            
            {(!config.apiUrl || !config.apiKey) && (
              <div className="mt-2 p-3 bg-warning/10 border border-warning/20 rounded text-sm">
                <p className="text-warning font-medium">⚠️ Configuração Incompleta</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {!config.apiUrl && "URL do servidor não está configurada. "}
                  {!config.apiKey && "API Key não está configurada. "}
                  {isUsingGlobalConfig 
                    ? "Verifique a configuração global no portal SaaS Admin." 
                    : "Configure os dados acima ou peça ao administrador SaaS para configurar globalmente."}
                </p>
              </div>
            )}

            {connectionStatus === 'disconnected' && config.apiUrl && config.apiKey && (
              <div className="mt-2 p-3 bg-muted border rounded text-sm">
                <p className="font-medium">📱 Próximos passos:</p>
                <ol className="text-xs text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                  <li>Clique em "Conectar WhatsApp"</li>
                  <li>Escaneie o QR Code com seu telefone</li>
                  <li>Aguarde a conexão ser estabelecida</li>
                </ol>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <MessageTemplates 
        onSelectTemplate={handleSelectTemplate}
        selectedTemplateId={selectedTemplateId}
      />

      {/* Test Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar Mensagem de Teste
          </CardTitle>
          <CardDescription>
            Teste a integração enviando uma mensagem via Evolution API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="evo-phone">Número de Telefone (com DDI)</Label>
            <Input
              id="evo-phone"
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="5511999999999"
              disabled={sending || connectionStatus !== 'connected'}
            />
            <p className="text-xs text-muted-foreground">
              Formato: código do país + DDD + número (ex: 5511999999999)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evo-message">Mensagem</Label>
            <Textarea
              id="evo-message"
              value={testMessage}
              onChange={(e) => {
                setTestMessage(e.target.value);
                setSelectedTemplateId(undefined);
              }}
              placeholder="Digite sua mensagem de teste..."
              rows={8}
              disabled={sending || connectionStatus !== 'connected'}
            />
            <p className="text-xs text-muted-foreground">
              Use variáveis como {'{nome}'}, {'{data}'}, {'{hora}'} para personalizar
            </p>
          </div>

          <Button 
            onClick={handleSendTest} 
            disabled={sending || !testPhone.trim() || !testMessage.trim() || connectionStatus !== 'connected'}
            className="w-full"
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Enviando..." : "Enviar Mensagem de Teste"}
          </Button>

          {connectionStatus !== 'connected' && (
            <p className="text-sm text-muted-foreground text-center">
              Conecte o WhatsApp primeiro para enviar mensagens
            </p>
          )}
        </CardContent>
      </Card>

      {/* Logs with Stats Dashboard */}
      <WhatsAppLogs provider="evolution" />

      {/* QR Code Modal */}
      <QRCodeModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        qrCode={qrCode}
        instanceName={config.instanceName}
        onRefresh={refreshQRCode}
        connectionStatus={connectionStatus}
        loading={qrLoading}
      />
    </div>
  );
};
