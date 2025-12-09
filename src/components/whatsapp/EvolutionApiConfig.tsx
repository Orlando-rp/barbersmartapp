import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Settings, 
  ExternalLink, 
  Wifi, 
  WifiOff, 
  QrCode,
  RefreshCw,
  Loader2,
  Save,
  Trash2,
  Info
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { WhatsAppLogs } from "./WhatsAppLogs";
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
      // Primeiro buscar configuração específica da barbearia
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
        setConfig({
          apiUrl: data.config.api_url || '',
          apiKey: data.config.api_key || '',
          instanceName: data.config.instance_name || generatedInstanceName
        });
        if (data.config.connection_status) {
          setConnectionStatus(data.config.connection_status);
        }
      } else {
        // Se não houver config da barbearia, buscar config global
        const { data: globalConfig } = await supabase
          .from('whatsapp_config')
          .select('*')
          .is('barbershop_id', null)
          .eq('provider', 'evolution')
          .maybeSingle();

        if (globalConfig?.config) {
          // Usar config global mas com instanceName local
          setConfig({
            apiUrl: globalConfig.config.api_url || '',
            apiKey: globalConfig.config.api_key || '',
            instanceName: generatedInstanceName
          });
        } else {
          // Sem nenhuma config, apenas usar instanceName gerado
          setConfig(prev => ({ ...prev, instanceName: generatedInstanceName }));
        }
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
        toast.info("Instância não encontrada. Clique em 'Conectar WhatsApp' para criar.");
        return;
      }

      if (error) throw error;

      if (data?.state === 'open' || data?.instance?.state === 'open') {
        setConnectionStatus('connected');
        toast.success("WhatsApp conectado!");
      } else {
        setConnectionStatus('disconnected');
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
          setConnectionStatus('connected');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          toast.success("WhatsApp conectado com sucesso!");
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

  const disconnectInstance = async () => {
    if (!config.apiUrl || !config.instanceName) return;

    try {
      setCheckingConnection(true);

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'logout',
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName
        }
      });

      if (error) throw error;

      setConnectionStatus('disconnected');
      toast.success("WhatsApp desconectado");
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
      {/* Info Alert */}
      <Alert className="border-primary/50 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Evolution API 2.0</AlertTitle>
        <AlertDescription className="text-primary/90">
          <p className="mb-2">
            A Evolution API é uma solução open-source que permite conectar seu WhatsApp sem precisar de uma conta Business API oficial.
          </p>
          <a
            href="https://doc.evolution-api.com/v2/pt/get-started/introduction"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium hover:underline"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Documentação Oficial
          </a>
        </AlertDescription>
      </Alert>

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

      {/* Info for barbershop users when not configured */}
      {!isSaasAdmin && !config.apiUrl && (
        <Alert className="border-amber-500/50 bg-amber-500/5">
          <Info className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600">Configuração Pendente</AlertTitle>
          <AlertDescription className="text-amber-600/90">
            O servidor Evolution API ainda não foi configurado pelo administrador do sistema. 
            Entre em contato com o suporte para habilitar o WhatsApp.
          </AlertDescription>
        </Alert>
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

      {/* Logs */}
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
