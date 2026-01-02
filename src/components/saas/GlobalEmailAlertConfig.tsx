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
  cooldown_minutes: number;
  last_alert_sent: string | null;
}

export const GlobalEmailAlertConfig = () => {
  const [config, setConfig] = useState<EmailAlertConfig>({
    enabled: false,
    resend_api_key: '',
    alert_emails: '',
    cooldown_minutes: 15,
    last_alert_sent: null
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

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
    if (config.enabled && (!config.resend_api_key || !config.alert_emails)) {
      toast.error("Preencha a API Key e os emails de destino para ativar os alertas");
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
              Enviar Email de Teste
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
    </div>
  );
};
