import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mail, 
  Save, 
  Loader2, 
  Info, 
  Send, 
  Bell, 
  BellOff,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface EmailAlertConfig {
  enabled: boolean;
  resend_api_key: string;
  alert_emails: string;
  whatsapp_enabled: boolean;
  whatsapp_numbers: string;
  cooldown_minutes: number;
  last_alert_sent: string | null;
}

export const GlobalEmailAlertConfig = () => {
  const [config, setConfig] = useState<EmailAlertConfig>({
    enabled: false,
    resend_api_key: '',
    alert_emails: '',
    whatsapp_enabled: false,
    whatsapp_numbers: '',
    cooldown_minutes: 15,
    last_alert_sent: null
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', 'email_alerts')
        .maybeSingle();

      if (error && !error.message?.includes('system_config')) {
        console.error('Erro ao carregar config de alertas:', error);
      }

      if (data?.value) {
        setConfig({
          enabled: data.value.enabled || false,
          resend_api_key: data.value.resend_api_key || '',
          alert_emails: data.value.alert_emails || '',
          whatsapp_enabled: data.value.whatsapp_enabled || false,
          whatsapp_numbers: data.value.whatsapp_numbers || '',
          cooldown_minutes: data.value.cooldown_minutes || 15,
          last_alert_sent: data.value.last_alert_sent || null
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    const hasEmailConfig = config.resend_api_key && config.alert_emails;
    const hasWhatsAppConfig = config.whatsapp_numbers;
    
    if (config.enabled && !hasEmailConfig && !config.whatsapp_enabled) {
      toast.error("Configure pelo menos um método de alerta (Email ou WhatsApp)");
      return;
    }
    
    if (config.whatsapp_enabled && !hasWhatsAppConfig) {
      toast.error("Preencha os números de WhatsApp para ativar os alertas via WhatsApp");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'email_alerts',
          value: {
            enabled: config.enabled,
            resend_api_key: config.resend_api_key,
            alert_emails: config.alert_emails,
            whatsapp_enabled: config.whatsapp_enabled,
            whatsapp_numbers: config.whatsapp_numbers,
            cooldown_minutes: config.cooldown_minutes,
            last_alert_sent: config.last_alert_sent
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast.success("Configuração de alertas salva com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error("Erro ao salvar configuração de alertas");
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!config.resend_api_key || !config.alert_emails) {
      toast.error("Configure a API Key e os emails de destino primeiro");
      return;
    }

    try {
      setTesting(true);
      
      const { data, error } = await supabase.functions.invoke('otp-status-monitor', {
        body: {
          action: 'test-email'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Email de teste enviado com sucesso!");
      } else {
        toast.error(data?.error || "Erro ao enviar email de teste");
      }
    } catch (error: any) {
      console.error('Erro ao enviar email de teste:', error);
      toast.error("Erro ao enviar email de teste");
    } finally {
      setTesting(false);
    }
  };

  const sendTestWhatsApp = async () => {
    if (!config.whatsapp_numbers) {
      toast.error("Configure os números de WhatsApp primeiro");
      return;
    }

    try {
      setTestingWhatsApp(true);
      
      const { data, error } = await supabase.functions.invoke('otp-status-monitor', {
        body: {
          action: 'test-whatsapp'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Mensagem de teste enviada via WhatsApp!");
      } else {
        toast.error(data?.error || "Erro ao enviar mensagem de teste");
      }
    } catch (error: any) {
      console.error('Erro ao enviar WhatsApp de teste:', error);
      toast.error("Erro ao enviar mensagem de teste");
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const formatLastAlert = () => {
    if (!config.last_alert_sent) return null;
    
    try {
      const date = new Date(config.last_alert_sent);
      return date.toLocaleString('pt-BR');
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-warning/50 bg-warning/10">
        <Info className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Alertas Automáticos por Email</AlertTitle>
        <AlertDescription className="text-warning/90">
          <p className="mb-2">
            Configure alertas automáticos para receber notificações por email quando a instância 
            global OTP WhatsApp desconectar. Isso ajuda a evitar interrupções no login por WhatsApp.
          </p>
          <p className="text-sm">
            Utilizamos o <strong>Resend</strong> para envio de emails. 
            <a
              href="https://resend.com"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 underline hover:text-warning"
            >
              Criar conta gratuita →
            </a>
          </p>
        </AlertDescription>
      </Alert>

      {/* Status Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <span className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" />
              Status do Monitoramento
            </span>
            <Badge className={config.enabled ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
              {config.enabled ? (
                <>
                  <Bell className="h-3 w-3 mr-1" />
                  Ativo
                </>
              ) : (
                <>
                  <BellOff className="h-3 w-3 mr-1" />
                  Inativo
                </>
              )}
            </Badge>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Monitoramento automático da instância OTP a cada 5 minutos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Último alerta enviado:</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatLastAlert() || "Nenhum alerta enviado ainda"}
              </p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Cooldown:</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {config.cooldown_minutes} minutos entre alertas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Mail className="h-5 w-5 text-warning" />
            Configuração de Alertas
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure os destinatários e API Key do Resend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">Ativar Alertas</p>
              <p className="text-sm text-muted-foreground">
                Receber emails quando a instância OTP desconectar
              </p>
            </div>
            <Switch 
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resend-api-key" className="text-foreground">API Key do Resend</Label>
            <Input
              id="resend-api-key"
              type="password"
              value={config.resend_api_key}
              onChange={(e) => setConfig({ ...config, resend_api_key: e.target.value })}
              placeholder="re_xxxxxxxxxxxx"
              className="bg-muted border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Obtenha sua API Key em{" "}
              <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
                resend.com/api-keys
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert-emails" className="text-foreground">Emails de Destino</Label>
            <Textarea
              id="alert-emails"
              value={config.alert_emails}
              onChange={(e) => setConfig({ ...config, alert_emails: e.target.value })}
              placeholder="admin@barbearia.com, suporte@barbearia.com"
              className="bg-muted border-border text-foreground min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Separe múltiplos emails por vírgula
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cooldown" className="text-foreground">Cooldown entre alertas (minutos)</Label>
            <Input
              id="cooldown"
              type="number"
              min={5}
              max={60}
              value={config.cooldown_minutes}
              onChange={(e) => setConfig({ ...config, cooldown_minutes: parseInt(e.target.value) || 15 })}
              className="bg-muted border-border text-foreground w-32"
            />
            <p className="text-xs text-muted-foreground">
              Intervalo mínimo entre alertas para evitar spam (5-60 min)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button 
              onClick={sendTestEmail} 
              disabled={testing || !config.resend_api_key || !config.alert_emails}
              variant="outline"
              className="border-border text-foreground hover:bg-muted w-full sm:w-auto"
            >
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Testar Email
            </Button>
            <Button 
              onClick={saveConfig} 
              disabled={saving}
              className="bg-warning hover:bg-warning/90 text-warning-foreground w-full sm:w-auto"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Backup Alert Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <svg className="h-5 w-5 text-success" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Alertas via WhatsApp (Backup)
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Receba alertas também via WhatsApp para casos urgentes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">Ativar Alertas WhatsApp</p>
              <p className="text-sm text-muted-foreground">
                Usar a instância OTP secundária para enviar alertas
              </p>
            </div>
            <Switch 
              checked={config.whatsapp_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, whatsapp_enabled: checked })}
            />
          </div>

          <Alert className="border-info/50 bg-info/10">
            <Info className="h-4 w-4 text-info" />
            <AlertDescription className="text-info/90">
              Os alertas WhatsApp usam uma instância diferente da OTP (para funcionar mesmo quando a OTP principal estiver desconectada).
              Configure uma segunda instância na Evolution API.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-numbers" className="text-foreground">Números de WhatsApp</Label>
            <Textarea
              id="whatsapp-numbers"
              value={config.whatsapp_numbers}
              onChange={(e) => setConfig({ ...config, whatsapp_numbers: e.target.value })}
              placeholder="5511999998888, 5511988887777"
              className="bg-muted border-border text-foreground min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Números com DDI+DDD, separados por vírgula (ex: 5511999998888)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button 
              onClick={sendTestWhatsApp} 
              disabled={testingWhatsApp || !config.whatsapp_numbers}
              variant="outline"
              className="border-border text-foreground hover:bg-muted w-full sm:w-auto"
            >
              {testingWhatsApp ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Testar WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
