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

    setLoadingConfig(true);
    try {
      // Buscar config global via edge function (bypass RLS)
      let globalApiUrl = '';
      let globalApiKey = '';
      
      try {
        const { data: globalData, error: globalError } = await supabase.functions.invoke('get-evolution-config');
        
        console.log('[EvolutionApiConfig] Global config response:', { globalData, globalError });
        
        if (!globalError && globalData?.success && globalData?.config) {
          globalApiUrl = globalData.config.api_url || '';
          globalApiKey = globalData.config.api_key || '';
          console.log('[EvolutionApiConfig] Global config loaded:', { 
            hasUrl: !!globalApiUrl, 
            hasKey: !!globalApiKey,
            url: globalApiUrl 
          });
        } else {
          console.log('[EvolutionApiConfig] No global config or error:', globalError);
        }
      } catch (globalErr) {
        console.error('[EvolutionApiConfig] Error fetching global config:', globalErr);
      }

      // Depois buscar configuração específica da barbearia
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution')
        .maybeSingle();

      console.log('[EvolutionApiConfig] Local config:', { data, error });

      if (error && !error.message?.includes('whatsapp_config')) {
        console.error('Erro ao carregar config:', error);
      }

      const finalApiUrl = data?.config?.api_url || globalApiUrl;
      const finalApiKey = data?.config?.api_key || globalApiKey;
      const finalInstanceName = data?.config?.instance_name || generatedInstanceName;

      console.log('[EvolutionApiConfig] Final config:', { 
        hasUrl: !!finalApiUrl, 
        hasKey: !!finalApiKey, 
        instanceName: finalInstanceName 
      });

      if (data?.config) {
        // Usa config local, mas herda api_url e api_key da global se não existir local
        setConfig({
          apiUrl: finalApiUrl,
          apiKey: finalApiKey,
          instanceName: finalInstanceName
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
        // Buscar informações da instância incluindo número - retorna o telefone encontrado
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
          
          // Buscar informações da instância para obter o número conectado
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

    // Stop polling after 2 minutes
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

      if (error) {
        console.error('Erro ao buscar instâncias:', error);
        return null;
      }

      console.log('[fetchInstanceInfo] Raw response:', JSON.stringify(data, null, 2));

      // A resposta vem como objeto com índices numéricos: {"0": {...}, "1": {...}, "success": true}
      let instanceList: any[] = [];
      
      if (data) {
        Object.keys(data).forEach(key => {
          if (!isNaN(Number(key)) && data[key] && typeof data[key] === 'object') {
            instanceList.push(data[key]);
          }
        });
      }

      console.log('[fetchInstanceInfo] Parsed instances:', instanceList.length);

      // Procurar a instância pelo nome
      for (const instanceData of instanceList) {
        const name = instanceData?.name || instanceData?.instanceName;
        
        console.log('[fetchInstanceInfo] Checking:', name, 'vs', config.instanceName);
        
        if (name === config.instanceName) {
          console.log('[fetchInstanceInfo] Found matching instance:', instanceData);
          
          // ownerJid está no formato "554199550969@s.whatsapp.net"
          const ownerJid = instanceData?.ownerJid;
          
          if (ownerJid) {
            const phoneNumber = ownerJid.split('@')[0];
            setConnectedPhone(phoneNumber);
            console.log('[fetchInstanceInfo] Connected phone:', phoneNumber);
            
            // Atualizar no banco de dados imediatamente com o telefone encontrado
            if (barbershopId) {
              await supabase
                .from('whatsapp_config')
                .upsert({
                  barbershop_id: barbershopId,
                  provider: 'evolution',
                  config: {
                    api_url: config.apiUrl,
                    api_key: config.apiKey,
                    instance_name: config.instanceName,
                    connection_status: instanceData.connectionStatus === 'open' ? 'connected' : 'disconnected',
                    connected_phone: phoneNumber
                  },
                  is_active: instanceData.connectionStatus === 'open',
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'barbershop_id,provider'
                });
            }
            
            return phoneNumber;
          } else {
            console.log('[fetchInstanceInfo] No ownerJid found');
            setConnectedPhone(null);
          }
          break;
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
            api_url: config.apiUrl,
            api_key: config.apiKey,
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
        .upsert({
          barbershop_id: barbershopId,
          provider: 'evolution',
          config: {
            api_url: config.apiUrl,
            api_key: config.apiKey,
            instance_name: config.instanceName,
            connection_status: 'disconnected'
          },
          is_active: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'barbershop_id,provider'
        });

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

  const reconfigureWebhook = async () => {
    if (!config.apiUrl || !config.apiKey || !config.instanceName) {
      toast.error("Configure a instância primeiro");
      return;
    }

    try {
      setCheckingConnection(true);
      
      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'setWebhook',
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName
        }
      });

      if (error) throw error;

      if (data?.success || data?.url) {
        toast.success("Webhook reconfigurado com sucesso! Agora as mensagens serão recebidas.");
      } else {
        throw new Error(data?.error || "Erro ao configurar webhook");
      }
    } catch (error) {
      console.error('Erro ao reconfigurar webhook:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao reconfigurar webhook");
    } finally {
      setCheckingConnection(false);
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
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Configuração do Servidor
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Configure a conexão com seu servidor Evolution API
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="api-url" className="text-xs sm:text-sm">URL do Servidor</Label>
              <Input
                id="api-url"
                type="url"
                value={config.apiUrl}
                onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                placeholder="https://api.evolution.seudominio.com"
                className="text-sm"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                URL base do servidor Evolution API
              </p>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="api-key" className="text-xs sm:text-sm">API Key (Global)</Label>
              <Input
                id="api-key"
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sua-api-key-global"
                className="text-sm"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Chave de API do servidor Evolution
              </p>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="instance-name" className="text-xs sm:text-sm">Nome da Instância</Label>
                <Badge variant="secondary" className="text-[10px] sm:text-xs">Auto</Badge>
              </div>
              <Input
                id="instance-name"
                type="text"
                value={config.instanceName}
                readOnly
                className="bg-muted cursor-not-allowed text-sm"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Identificador único gerado automaticamente
              </p>
            </div>

            <Button onClick={saveConfig} disabled={saving} className="w-full text-xs sm:text-sm" size="sm">
              <Save className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {saving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="flex items-center gap-2 text-sm sm:text-base">
              <Wifi className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Status da Conexão
            </span>
            {getConnectionBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
          {loadingConfig ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando configuração...</span>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={checkConnection}
                  disabled={checkingConnection || !config.apiUrl || !config.instanceName}
                  className="text-xs sm:text-sm"
                  size="sm"
                >
                  <RefreshCw className={`mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 ${checkingConnection ? 'animate-spin' : ''}`} />
                  Verificar Status
                </Button>

                {connectionStatus !== 'connected' ? (
                  <Button
                    onClick={connectInstance}
                    disabled={!config.apiUrl || !config.apiKey || !config.instanceName}
                    className="text-xs sm:text-sm"
                    size="sm"
                  >
                    <QrCode className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Conectar WhatsApp
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={reconfigureWebhook}
                  disabled={checkingConnection}
                  className="text-xs sm:text-sm"
                  size="sm"
                >
                  <Settings className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Reconfigurar Webhook
                </Button>
                <Button
                  variant="destructive"
                  onClick={disconnectInstance}
                  disabled={checkingConnection}
                  className="text-xs sm:text-sm"
                  size="sm"
                >
                  <WifiOff className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Desconectar
                </Button>
              </>
            )}
          </div>

          {connectionStatus === 'connected' && (
            <div className="p-3 sm:p-4 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">WhatsApp conectado!</span>
              </div>
            </div>
          )}

          {/* Diagnóstico detalhado */}
          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border space-y-2 sm:space-y-3">
            <h4 className="font-medium text-xs sm:text-sm flex items-center gap-2">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Diagnóstico da Conexão
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-muted-foreground text-[10px] sm:text-xs">URL do Servidor:</p>
                <p className="font-mono text-[10px] sm:text-xs break-all">
                  {config.apiUrl || <span className="text-destructive">Não configurado</span>}
                </p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-muted-foreground text-[10px] sm:text-xs">API Key:</p>
                <p className="font-mono text-[10px] sm:text-xs">
                  {config.apiKey ? '••••••••' + config.apiKey.slice(-4) : <span className="text-destructive">Não configurado</span>}
                </p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-muted-foreground text-[10px] sm:text-xs">Instância:</p>
                <p className="font-mono text-[10px] sm:text-xs">
                  {config.instanceName || <span className="text-destructive">Não configurado</span>}
                </p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-muted-foreground text-[10px] sm:text-xs">Telefone:</p>
                <p className="font-mono text-[10px] sm:text-xs">
                  {connectedPhone ? (
                    <span className="text-success font-medium">+{connectedPhone}</span>
                  ) : connectionStatus === 'connected' ? (
                    <span className="text-warning">Verificando...</span>
                  ) : (
                    <span className="text-muted-foreground">Nenhum</span>
                  )}
                </p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-muted-foreground text-[10px] sm:text-xs">Config Global:</p>
                <p className="text-[10px] sm:text-xs">
                  {isUsingGlobalConfig ? (
                    <Badge variant="outline" className="text-[10px] sm:text-xs h-5">Sim</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] sm:text-xs h-5">Não</Badge>
                  )}
                </p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-muted-foreground text-[10px] sm:text-xs">Status:</p>
                <div className="text-[10px] sm:text-xs">
                  {getConnectionBadge()}
                </div>
              </div>
            </div>
            
            {(!config.apiUrl || !config.apiKey) && (
              <div className="mt-2 p-2 sm:p-3 bg-warning/10 border border-warning/20 rounded text-xs sm:text-sm">
                <p className="text-warning font-medium text-xs">⚠️ Config Incompleta</p>
                <p className="text-muted-foreground text-[10px] sm:text-xs mt-1">
                  {!config.apiUrl && "URL não configurada. "}
                  {!config.apiKey && "API Key não configurada. "}
                  {isUsingGlobalConfig 
                    ? "Verifique config global no SaaS Admin." 
                    : "Configure acima ou peça ao admin SaaS."}
                </p>
              </div>
            )}

            {connectionStatus === 'disconnected' && config.apiUrl && config.apiKey && (
              <div className="mt-2 p-2 sm:p-3 bg-muted border rounded text-xs sm:text-sm">
                <p className="font-medium text-xs">📱 Próximos passos:</p>
                <ol className="text-[10px] sm:text-xs text-muted-foreground mt-1 space-y-0.5 sm:space-y-1 list-decimal list-inside">
                  <li>Clique em "Conectar WhatsApp"</li>
                  <li>Escaneie o QR Code</li>
                  <li>Aguarde a conexão</li>
                </ol>
              </div>
            )}
          </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Templates */}
      <MessageTemplates 
        onSelectTemplate={handleSelectTemplate}
        selectedTemplateId={selectedTemplateId}
      />

      {/* Test Message */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Enviar Mensagem de Teste
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Teste a integração via Evolution API
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="evo-phone" className="text-xs sm:text-sm">Telefone (com DDI)</Label>
            <Input
              id="evo-phone"
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="5511999999999"
              disabled={sending || connectionStatus !== 'connected'}
              className="text-sm"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Formato: país + DDD + número
            </p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="evo-message" className="text-xs sm:text-sm">Mensagem</Label>
            <Textarea
              id="evo-message"
              value={testMessage}
              onChange={(e) => {
                setTestMessage(e.target.value);
                setSelectedTemplateId(undefined);
              }}
              placeholder="Digite sua mensagem..."
              rows={6}
              disabled={sending || connectionStatus !== 'connected'}
              className="text-sm"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Use variáveis: {'{nome}'}, {'{data}'}, {'{hora}'}
            </p>
          </div>

          <Button 
            onClick={handleSendTest} 
            disabled={sending || !testPhone.trim() || !testMessage.trim() || connectionStatus !== 'connected'}
            className="w-full text-xs sm:text-sm"
            size="sm"
          >
            <Send className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {sending ? "Enviando..." : "Enviar Teste"}
          </Button>

          {connectionStatus !== 'connected' && (
            <p className="text-[10px] sm:text-sm text-muted-foreground text-center">
              Conecte o WhatsApp primeiro
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
