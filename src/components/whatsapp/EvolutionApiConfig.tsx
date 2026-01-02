import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Globe,
  Server,
  AlertTriangle,
  Info,
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
  const [loadingConfig, setLoadingConfig] = useState(true);
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
  
  // Novo: indicador de fonte da configuração
  const [configSource, setConfigSource] = useState<'own' | 'global' | 'none'>('none');
  const [globalConfig, setGlobalConfig] = useState<{ apiUrl: string; apiKey: string } | null>(null);

  const handleSelectTemplate = (template: MessageTemplate) => {
    setTestMessage(template.message);
    setSelectedTemplateId(template.id);
    toast.success(`Template "${template.name}" selecionado`);
  };

  useEffect(() => {
    if (barbershopId) {
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

    setLoadingConfig(true);
    try {
      // 1. Buscar config global via edge function
      let globalApiUrl = '';
      let globalApiKey = '';
      
      try {
        const { data: globalData, error: globalError } = await supabase.functions.invoke('get-evolution-config');
        
        if (!globalError && globalData?.success && globalData?.config) {
          globalApiUrl = globalData.config.api_url || '';
          globalApiKey = globalData.config.api_key || '';
          setGlobalConfig({ apiUrl: globalApiUrl, apiKey: globalApiKey });
        }
      } catch (e) {
        console.error('Erro ao buscar config global:', e);
      }

      // 2. Buscar configuração específica da barbearia
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution')
        .maybeSingle();

      if (error && !error.message?.includes('whatsapp_config')) {
        console.error('Erro ao carregar config:', error);
      }

      // Determinar fonte da configuração
      const hasOwnConfig = !!(data?.config?.api_url && data?.config?.api_key);
      const hasGlobalConfig = !!(globalApiUrl && globalApiKey);

      if (hasOwnConfig) {
        setConfigSource('own');
        setConfig({
          apiUrl: data.config.api_url,
          apiKey: data.config.api_key,
          instanceName: data.config.instance_name || generatedInstanceName
        });
        if (data.config.connection_status) {
          setConnectionStatus(data.config.connection_status);
        }
        if (data.config.connected_phone) {
          setConnectedPhone(data.config.connected_phone);
        }
        
        // Verificar status real se marcado como conectado
        if (data.config.connection_status === 'connected') {
          setTimeout(() => checkConnection({
            apiUrl: data.config.api_url,
            apiKey: data.config.api_key,
            instanceName: data.config.instance_name || generatedInstanceName
          }), 1000);
        }
      } else if (hasGlobalConfig) {
        setConfigSource('global');
        setConfig({
          apiUrl: globalApiUrl,
          apiKey: globalApiKey,
          instanceName: data?.config?.instance_name || generatedInstanceName
        });
        
        // Se tem instância própria usando config global
        if (data?.config?.instance_name && data?.config?.connection_status === 'connected') {
          setConnectionStatus('connected');
          setTimeout(() => checkConnection({
            apiUrl: globalApiUrl,
            apiKey: globalApiKey,
            instanceName: data.config.instance_name
          }), 1000);
        }
      } else {
        setConfigSource('none');
        setConfig(prev => ({ ...prev, instanceName: generatedInstanceName }));
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoadingConfig(false);
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

      setConfigSource('own');
      toast.success("Configuração salva com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const useGlobalConfig = async () => {
    if (!globalConfig || !barbershopId) {
      toast.error("Configuração global não disponível");
      return;
    }

    try {
      setSaving(true);

      // Salvar apenas instância, herdando apiUrl e apiKey do global
      const { error } = await supabase
        .from('whatsapp_config')
        .upsert({
          barbershop_id: barbershopId,
          provider: 'evolution',
          config: {
            instance_name: config.instanceName,
            connection_status: 'disconnected'
          },
          is_active: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'barbershop_id,provider'
        });

      if (error) throw error;

      setConfig({
        apiUrl: globalConfig.apiUrl,
        apiKey: globalConfig.apiKey,
        instanceName: config.instanceName
      });
      setConfigSource('global');
      toast.success("Usando configuração global do servidor!");
    } catch (error) {
      console.error('Erro ao usar config global:', error);
      toast.error("Erro ao aplicar configuração");
    } finally {
      setSaving(false);
    }
  };

  const checkConnection = async (overrideConfig?: { apiUrl: string; apiKey: string; instanceName: string } | React.MouseEvent) => {
    const checkConfig = (overrideConfig && 'apiUrl' in overrideConfig) ? overrideConfig : config;
    
    if (!checkConfig.apiUrl || !checkConfig.instanceName) {
      if (!loadingConfig) {
        toast.error("Configure a URL e nome da instância primeiro");
      }
      return;
    }

    try {
      setCheckingConnection(true);

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'connectionState',
          apiUrl: checkConfig.apiUrl,
          apiKey: checkConfig.apiKey,
          instanceName: checkConfig.instanceName
        }
      });

      if (data?.success === false && data?.details?.status === 404) {
        setConnectionStatus('disconnected');
        setConnectedPhone(null);
        toast.info("Instância não encontrada. Clique em 'Conectar WhatsApp' para criar.");
        return;
      }

      if (error) throw error;

      if (data?.state === 'open' || data?.instance?.state === 'open') {
        setConnectionStatus('connected');
        const phone = await fetchInstanceInfo();
        if (phone) {
          toast.success(`WhatsApp conectado: +${phone}`);
        } else {
          toast.success("WhatsApp conectado!");
        }
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
          
          const phone = await fetchInstanceInfo();
          setConnectionStatus('connected');
          setQrModalOpen(false);
          
          if (phone) {
            toast.success(`WhatsApp conectado: +${phone}`);
          } else {
            toast.success("WhatsApp conectado com sucesso!");
          }
        }
      } catch (error) {
        console.error('Erro no polling:', error);
      }
    }, 3000);

    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }, 120000);
  };

  const fetchInstanceInfo = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'fetchInstances',
          apiUrl: config.apiUrl,
          apiKey: config.apiKey
        }
      });

      if (error) return null;

      let instanceList: any[] = [];
      if (data) {
        Object.keys(data).forEach(key => {
          if (!isNaN(Number(key)) && data[key] && typeof data[key] === 'object') {
            instanceList.push(data[key]);
          }
        });
      }

      for (const instanceData of instanceList) {
        const name = instanceData?.name || instanceData?.instanceName;
        
        if (name === config.instanceName) {
          const ownerJid = instanceData?.ownerJid;
          
          if (ownerJid) {
            const phoneNumber = ownerJid.split('@')[0];
            setConnectedPhone(phoneNumber);
            
            if (barbershopId) {
              await supabase
                .from('whatsapp_config')
                .upsert({
                  barbershop_id: barbershopId,
                  provider: 'evolution',
                  config: {
                    api_url: configSource === 'own' ? config.apiUrl : undefined,
                    api_key: configSource === 'own' ? config.apiKey : undefined,
                    instance_name: config.instanceName,
                    connection_status: 'connected',
                    connected_phone: phoneNumber
                  },
                  is_active: true,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'barbershop_id,provider'
                });
            }
            
            return phoneNumber;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar info da instância:', error);
      return null;
    }
  };

  const updateConnectionInDatabase = async (status: 'connected' | 'disconnected') => {
    if (!barbershopId) return;
    
    try {
      await supabase
        .from('whatsapp_config')
        .upsert({
          barbershop_id: barbershopId,
          provider: 'evolution',
          config: {
            api_url: configSource === 'own' ? config.apiUrl : undefined,
            api_key: configSource === 'own' ? config.apiKey : undefined,
            instance_name: config.instanceName,
            connection_status: status,
            connected_phone: status === 'connected' ? connectedPhone : null
          },
          is_active: status === 'connected',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'barbershop_id,provider'
        });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const sendTestMessage = async () => {
    if (!testPhone) {
      toast.error("Informe o número de telefone");
      return;
    }

    if (!config.apiUrl || !config.apiKey || !config.instanceName) {
      toast.error("Configure a Evolution API primeiro");
      return;
    }

    try {
      setSending(true);

      let formattedPhone = testPhone.replace(/\D/g, '');
      if (!formattedPhone.startsWith('55')) {
        formattedPhone = '55' + formattedPhone;
      }

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'sendMessage',
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName,
          to: formattedPhone,
          message: testMessage
        }
      });

      if (error) throw error;

      if (data?.success !== false) {
        toast.success("Mensagem enviada com sucesso!");
        setTestPhone("");
      } else {
        throw new Error(data?.error || "Erro ao enviar mensagem");
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Indicador de Fonte da Configuração */}
      <Alert className={configSource === 'own' ? 'border-primary' : configSource === 'global' ? 'border-blue-500' : 'border-amber-500'}>
        {configSource === 'own' ? (
          <>
            <Server className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Você está usando <strong>configuração própria</strong> do servidor Evolution.</span>
              {globalConfig && (
                <Button variant="ghost" size="sm" onClick={useGlobalConfig}>
                  Usar servidor global
                </Button>
              )}
            </AlertDescription>
          </>
        ) : configSource === 'global' ? (
          <>
            <Globe className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Você está usando o <strong>servidor global compartilhado</strong>. Apenas a instância é própria.</span>
              <Button variant="ghost" size="sm" onClick={() => setConfigSource('own')}>
                Configurar servidor próprio
              </Button>
            </AlertDescription>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span><strong>WhatsApp não configurado.</strong> Configure abaixo ou use o servidor global.</span>
              {globalConfig && (
                <Button variant="outline" size="sm" onClick={useGlobalConfig}>
                  Usar servidor global
                </Button>
              )}
            </AlertDescription>
          </>
        )}
      </Alert>

      {/* Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração Evolution API
          </CardTitle>
          <CardDescription>
            {configSource === 'global' 
              ? 'Servidor herdado do administrador. Configure apenas sua instância.'
              : 'Configure a conexão com o servidor Evolution API.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL e API Key - ocultos se usando global */}
          {configSource !== 'global' && (
            <>
              <div className="space-y-2">
                <Label>URL da API</Label>
                <Input
                  placeholder="https://api.evolution.seudominio.com"
                  value={config.apiUrl}
                  onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="Sua API Key"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Nome da Instância</Label>
            <Input
              placeholder="minha-instancia"
              value={config.instanceName}
              onChange={(e) => setConfig({ ...config, instanceName: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Nome único para identificar sua conexão WhatsApp
            </p>
          </div>

          {/* Status da Conexão */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <>
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Conectado</span>
                  {connectedPhone && (
                    <Badge variant="secondary">+{connectedPhone}</Badge>
                  )}
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                  <span className="font-medium">Conectando...</span>
                </>
              ) : connectionStatus === 'error' ? (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="font-medium">Erro</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Desconectado</span>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkConnection}
                disabled={checkingConnection}
              >
                {checkingConnection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={connectInstance}
                disabled={connectionStatus === 'connecting'}
              >
                <QrCode className="h-4 w-4 mr-2" />
                {connectionStatus === 'connected' ? 'Reconectar' : 'Conectar'}
              </Button>
            </div>
          </div>

          {/* Botão Salvar */}
          {configSource !== 'global' && (
            <Button onClick={saveConfig} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configuração
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Teste de Mensagem */}
      {connectionStatus === 'connected' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Testar Envio
            </CardTitle>
            <CardDescription>
              Envie uma mensagem de teste para verificar a conexão
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Número de Telefone</Label>
              <Input
                placeholder="11999999999"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>

            <MessageTemplates 
              onSelectTemplate={handleSelectTemplate}
              selectedTemplateId={selectedTemplateId}
            />

            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button onClick={sendTestMessage} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Mensagem
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        open={qrModalOpen}
        onOpenChange={(open) => {
          setQrModalOpen(open);
          if (!open && pollingRef.current) {
            clearInterval(pollingRef.current);
          }
        }}
        qrCode={qrCode}
        loading={qrLoading}
        instanceName={config.instanceName}
        onRefresh={connectInstance}
        connectionStatus={connectionStatus === 'error' ? 'error' : connectionStatus}
      />

      {/* Estatísticas e Logs */}
      <WhatsAppStats provider="evolution" />
      <WhatsAppLogs provider="evolution" />
    </div>
  );
};
