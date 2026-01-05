import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Loader2,
  Save,
  Info,
  CheckCircle,
  XCircle,
  QrCode,
  Smartphone
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { QRCodeModal } from "@/components/whatsapp/QRCodeModal";

interface OtpConfig {
  instanceName: string;
  status: 'disconnected' | 'connecting' | 'connected';
  phoneNumber?: string;
}

export const GlobalOtpWhatsAppConfig = () => {
  const [config, setConfig] = useState<OtpConfig>({
    instanceName: 'otp-auth-global',
    status: 'disconnected'
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [evolutionConfig, setEvolutionConfig] = useState<{ apiUrl: string; apiKey: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      // Carregar config da Evolution API global
      const { data: evolutionData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();

      if (evolutionData?.value?.api_url && evolutionData?.value?.api_key) {
        setEvolutionConfig({
          apiUrl: evolutionData.value.api_url,
          apiKey: evolutionData.value.api_key
        });
      }

      // Carregar config da instância OTP
      const { data: otpData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'otp_whatsapp')
        .maybeSingle();

      if (otpData?.value) {
        setConfig({
          instanceName: otpData.value.instance_name || 'otp-auth-global',
          status: otpData.value.status || 'disconnected',
          phoneNumber: otpData.value.phone_number
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: Partial<OtpConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'otp_whatsapp',
          value: {
            instance_name: updatedConfig.instanceName,
            status: updatedConfig.status,
            phone_number: updatedConfig.phoneNumber
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;
      setConfig(updatedConfig);
    } catch (error) {
      console.error('Erro ao salvar config:', error);
      throw error;
    }
  };

  const createInstance = async () => {
    if (!evolutionConfig) {
      toast.error("Configure o servidor Evolution API primeiro");
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'createInstance',
          apiUrl: evolutionConfig.apiUrl,
          apiKey: evolutionConfig.apiKey,
          instanceName: config.instanceName
        }
      });

      if (error) throw error;

      if (data?.success || data?.instance) {
        await saveConfig({ status: 'disconnected' });
        toast.success("Instância criada! Agora conecte escaneando o QR Code.");
      } else {
        throw new Error(data?.error || 'Erro ao criar instância');
      }
    } catch (error: any) {
      console.error('Erro ao criar instância:', error);
      toast.error(error.message || "Erro ao criar instância");
    } finally {
      setSaving(false);
    }
  };

  const connectInstance = async () => {
    if (!evolutionConfig) {
      toast.error("Configure o servidor Evolution API primeiro");
      return;
    }

    try {
      setConnecting(true);

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'connect',
          apiUrl: evolutionConfig.apiUrl,
          apiKey: evolutionConfig.apiKey,
          instanceName: config.instanceName
        }
      });

      if (error) throw error;

      if (data?.base64 || data?.code) {
        setQrCode(data.base64 || data.code);
        setShowQrModal(true);
        await saveConfig({ status: 'connecting' });
      } else if (data?.instance?.state === 'open') {
        await saveConfig({ status: 'connected' });
        toast.success("Instância já está conectada!");
      } else {
        throw new Error('Não foi possível obter QR Code');
      }
    } catch (error: any) {
      console.error('Erro ao conectar:', error);
      toast.error(error.message || "Erro ao conectar instância");
    } finally {
      setConnecting(false);
    }
  };

  const checkStatus = async () => {
    if (!evolutionConfig) {
      toast.error("Configure o servidor Evolution API primeiro");
      return;
    }

    try {
      setChecking(true);

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'connectionState',
          apiUrl: evolutionConfig.apiUrl,
          apiKey: evolutionConfig.apiKey,
          instanceName: config.instanceName
        }
      });

      if (error) throw error;

      const isConnected = data?.state === 'open' || data?.instance?.state === 'open';
      
      if (isConnected) {
        // Buscar info da instância para pegar o número
        const { data: infoData } = await supabase.functions.invoke('send-whatsapp-evolution', {
          body: {
            action: 'instanceInfo',
            apiUrl: evolutionConfig.apiUrl,
            apiKey: evolutionConfig.apiKey,
            instanceName: config.instanceName
          }
        });

        const phoneNumber = infoData?.instance?.ownerJid?.replace('@s.whatsapp.net', '') || 
                           infoData?.ownerJid?.replace('@s.whatsapp.net', '');

        await saveConfig({ status: 'connected', phoneNumber });
        setShowQrModal(false);
        toast.success("WhatsApp conectado com sucesso!");
      } else {
        await saveConfig({ status: 'disconnected', phoneNumber: undefined });
        toast.info("Instância não está conectada");
      }
    } catch (error: any) {
      console.error('Erro ao verificar status:', error);
      toast.error("Erro ao verificar status");
    } finally {
      setChecking(false);
    }
  };

  const disconnectInstance = async () => {
    if (!evolutionConfig) return;

    try {
      setSaving(true);

      await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'logout',
          apiUrl: evolutionConfig.apiUrl,
          apiKey: evolutionConfig.apiKey,
          instanceName: config.instanceName
        }
      });

      await saveConfig({ status: 'disconnected', phoneNumber: undefined });
      toast.success("WhatsApp desconectado");
    } catch (error: any) {
      console.error('Erro ao desconectar:', error);
      toast.error("Erro ao desconectar");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = () => {
    switch (config.status) {
      case 'connected':
        return <Badge className="bg-success text-success-foreground"><Wifi className="h-3 w-3 mr-1" />Conectado</Badge>;
      case 'connecting':
        return <Badge variant="outline" className="text-warning border-warning"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Conectando</Badge>;
      default:
        return <Badge variant="destructive"><WifiOff className="h-3 w-3 mr-1" />Desconectado</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
      </div>
    );
  }

  if (!evolutionConfig) {
    return (
      <Alert className="border-destructive/50 bg-destructive/10">
        <XCircle className="h-4 w-4 text-destructive" />
        <AlertTitle className="text-destructive">Servidor não configurado</AlertTitle>
        <AlertDescription className="text-destructive/90">
          Configure o servidor Evolution API na aba acima antes de configurar a instância de OTP.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-info/50 bg-info/10">
        <Info className="h-4 w-4 text-info" />
        <AlertTitle className="text-info">Instância Global para Autenticação</AlertTitle>
        <AlertDescription className="text-info/90">
          Esta instância WhatsApp será usada exclusivamente para enviar códigos OTP de autenticação 
          (login e cadastro via WhatsApp), independente das instâncias das barbearias.
        </AlertDescription>
      </Alert>

      {/* OTP Instance Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-warning" />
              Instância OTP
            </span>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            WhatsApp dedicado para envio de códigos de verificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instance-name" className="text-foreground">Nome da Instância</Label>
            <Input
              id="instance-name"
              value={config.instanceName}
              onChange={(e) => setConfig({ ...config, instanceName: e.target.value })}
              placeholder="otp-auth-global"
              disabled={config.status === 'connected'}
              className="bg-muted border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Identificador único para a instância no servidor Evolution
            </p>
          </div>

          {config.phoneNumber && config.status === 'connected' && (
            <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg border border-success/30">
              <Smartphone className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium text-foreground">Número conectado</p>
                <p className="text-sm text-muted-foreground">+{config.phoneNumber}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            {config.status === 'disconnected' && (
              <>
                <Button 
                  onClick={createInstance} 
                  disabled={saving}
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Criar Instância
                </Button>
                <Button 
                  onClick={connectInstance} 
                  disabled={connecting}
                  className="bg-warning hover:bg-warning/90 text-warning-foreground"
                >
                  {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                  Conectar WhatsApp
                </Button>
              </>
            )}

            {config.status === 'connecting' && (
              <>
                <Button 
                  onClick={connectInstance} 
                  disabled={connecting}
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted"
                >
                  {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                  Mostrar QR Code
                </Button>
                <Button 
                  onClick={checkStatus} 
                  disabled={checking}
                  className="bg-warning hover:bg-warning/90 text-warning-foreground"
                >
                  {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Verificar Conexão
                </Button>
              </>
            )}

            {config.status === 'connected' && (
              <>
                <Button 
                  onClick={checkStatus} 
                  disabled={checking}
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted"
                >
                  {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Verificar Status
                </Button>
                <Button 
                  onClick={disconnectInstance} 
                  disabled={saving}
                  variant="destructive"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WifiOff className="mr-2 h-4 w-4" />}
                  Desconectar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      <QRCodeModal
        open={showQrModal}
        onOpenChange={setShowQrModal}
        qrCode={qrCode}
        instanceName={config.instanceName}
        onRefresh={connectInstance}
        connectionStatus={config.status}
        loading={connecting}
      />
    </div>
  );
};
