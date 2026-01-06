import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  AlertTriangle,
  Server,
  Key,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface EmailAlertConfig {
  enabled: boolean;
  provider: 'resend' | 'smtp';
  // Resend
  resend_api_key: string;
  // SMTP
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  // Comum
  alert_emails: string;
  cooldown_minutes: number;
  last_alert_sent: string | null;
}

const SMTP_PRESETS = [
  { name: 'Personalizado', host: '', port: 587, secure: true },
  { name: 'Gmail', host: 'smtp.gmail.com', port: 587, secure: true },
  { name: 'Outlook/Hotmail', host: 'smtp-mail.outlook.com', port: 587, secure: true },
  { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 587, secure: true },
  { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: true },
  { name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, secure: true },
  { name: 'Amazon SES', host: 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: true },
];

export const GlobalEmailAlertConfig = () => {
  const [config, setConfig] = useState<EmailAlertConfig>({
    enabled: false,
    provider: 'resend',
    resend_api_key: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: true,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: 'BarberSmart',
    alert_emails: '',
    cooldown_minutes: 15,
    last_alert_sent: null
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

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
          provider: data.value.provider || 'resend',
          resend_api_key: data.value.resend_api_key || '',
          smtp_host: data.value.smtp_host || '',
          smtp_port: data.value.smtp_port || 587,
          smtp_secure: data.value.smtp_secure !== false,
          smtp_user: data.value.smtp_user || '',
          smtp_password: data.value.smtp_password || '',
          smtp_from_email: data.value.smtp_from_email || '',
          smtp_from_name: data.value.smtp_from_name || 'BarberSmart',
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

  const validateConfig = (): string | null => {
    if (!config.enabled) return null;
    
    if (!config.alert_emails) {
      return "Preencha os emails de destino";
    }

    if (config.provider === 'resend') {
      if (!config.resend_api_key) {
        return "Preencha a API Key do Resend";
      }
    } else {
      if (!config.smtp_host) {
        return "Preencha o host SMTP";
      }
      if (!config.smtp_user) {
        return "Preencha o usuário SMTP";
      }
      if (!config.smtp_password) {
        return "Preencha a senha SMTP";
      }
      if (!config.smtp_from_email) {
        return "Preencha o email de origem";
      }
    }

    return null;
  };

  const saveConfig = async () => {
    const validationError = validateConfig();
    if (validationError) {
      toast.error(validationError);
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
            provider: config.provider,
            resend_api_key: config.resend_api_key,
            smtp_host: config.smtp_host,
            smtp_port: config.smtp_port,
            smtp_secure: config.smtp_secure,
            smtp_user: config.smtp_user,
            smtp_password: config.smtp_password,
            smtp_from_email: config.smtp_from_email,
            smtp_from_name: config.smtp_from_name,
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
    const validationError = validateConfig();
    if (validationError) {
      toast.error(validationError);
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

  const applySmtpPreset = (presetName: string) => {
    const preset = SMTP_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setConfig(prev => ({
        ...prev,
        smtp_host: preset.host,
        smtp_port: preset.port,
        smtp_secure: preset.secure
      }));
    }
  };

  const isConfigValid = () => {
    if (config.provider === 'resend') {
      return config.resend_api_key && config.alert_emails;
    }
    return config.smtp_host && config.smtp_user && config.smtp_password && config.smtp_from_email && config.alert_emails;
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
            Escolha entre <strong>Resend</strong> (API moderna) ou <strong>SMTP</strong> (servidor tradicional).
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
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 bg-muted rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground">Último alerta:</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {formatLastAlert() || "Nenhum alerta enviado ainda"}
              </p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground">Cooldown:</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {config.cooldown_minutes} min entre alertas
              </p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground">Provedor:</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {config.provider === 'resend' ? 'Resend (API)' : 'SMTP'}
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
            Configure o provedor de email e os destinatários
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

          {/* Provider Selection Tabs */}
          <Tabs 
            value={config.provider} 
            onValueChange={(value) => setConfig({ ...config, provider: value as 'resend' | 'smtp' })}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="resend" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Resend (API)
              </TabsTrigger>
              <TabsTrigger value="smtp" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                SMTP
              </TabsTrigger>
            </TabsList>

            {/* Resend Config */}
            <TabsContent value="resend" className="space-y-4 mt-4">
              <Alert className="border-info/30 bg-info/10">
                <Info className="h-4 w-4 text-info" />
                <AlertDescription className="text-sm text-muted-foreground">
                  O <strong>Resend</strong> é uma API moderna para envio de emails. 
                  <a
                    href="https://resend.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline hover:text-foreground"
                  >
                    Criar conta gratuita →
                  </a>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="resend-api-key" className="text-foreground">API Key do Resend</Label>
                <div className="relative">
                  <Input
                    id="resend-api-key"
                    type={showApiKey ? "text" : "password"}
                    value={config.resend_api_key}
                    onChange={(e) => setConfig({ ...config, resend_api_key: e.target.value })}
                    placeholder="re_xxxxxxxxxxxx"
                    className="bg-muted border-border text-foreground pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Obtenha sua API Key em{" "}
                  <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
                    resend.com/api-keys
                  </a>
                </p>
              </div>
            </TabsContent>

            {/* SMTP Config */}
            <TabsContent value="smtp" className="space-y-4 mt-4">
              <Alert className="border-info/30 bg-info/10">
                <Info className="h-4 w-4 text-info" />
                <AlertDescription className="text-sm text-muted-foreground">
                  Configure qualquer servidor <strong>SMTP</strong> para envio de emails. 
                  Escolha um preset ou configure manualmente.
                </AlertDescription>
              </Alert>

              {/* SMTP Preset */}
              <div className="space-y-2">
                <Label className="text-foreground">Preset do Servidor</Label>
                <Select onValueChange={applySmtpPreset}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Selecione um preset (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {SMTP_PRESETS.map((preset) => (
                      <SelectItem key={preset.name} value={preset.name}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host" className="text-foreground">Host SMTP</Label>
                  <Input
                    id="smtp-host"
                    type="text"
                    value={config.smtp_host}
                    onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                    placeholder="smtp.exemplo.com"
                    className="bg-muted border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-port" className="text-foreground">Porta</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={config.smtp_port}
                    onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) || 587 })}
                    placeholder="587"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Conexão Segura (TLS/SSL)</p>
                  <p className="text-xs text-muted-foreground">Recomendado para portas 465 e 587</p>
                </div>
                <Switch 
                  checked={config.smtp_secure}
                  onCheckedChange={(checked) => setConfig({ ...config, smtp_secure: checked })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-user" className="text-foreground">Usuário SMTP</Label>
                  <Input
                    id="smtp-user"
                    type="text"
                    value={config.smtp_user}
                    onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
                    placeholder="usuario@exemplo.com"
                    className="bg-muted border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-password" className="text-foreground">Senha SMTP</Label>
                  <div className="relative">
                    <Input
                      id="smtp-password"
                      type={showPassword ? "text" : "password"}
                      value={config.smtp_password}
                      onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                      placeholder="••••••••"
                      className="bg-muted border-border text-foreground pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para Gmail, use uma <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="underline">senha de app</a>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-from-email" className="text-foreground">Email de Origem</Label>
                  <Input
                    id="smtp-from-email"
                    type="email"
                    value={config.smtp_from_email}
                    onChange={(e) => setConfig({ ...config, smtp_from_email: e.target.value })}
                    placeholder="alertas@minhabarbearia.com"
                    className="bg-muted border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-from-name" className="text-foreground">Nome do Remetente</Label>
                  <Input
                    id="smtp-from-name"
                    type="text"
                    value={config.smtp_from_name}
                    onChange={(e) => setConfig({ ...config, smtp_from_name: e.target.value })}
                    placeholder="BarberSmart Alertas"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Common fields */}
          <div className="space-y-4 pt-4 border-t border-border">
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
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button 
              onClick={sendTestEmail} 
              disabled={testing || !isConfigValid()}
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