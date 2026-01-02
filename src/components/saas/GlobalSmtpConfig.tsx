import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Save, Mail, Eye, EyeOff, Server, TestTube, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean; // true for SSL (465), false for TLS (587)
  user: string;
  pass: string;
  from_email: string;
  from_name: string;
}

const defaultConfig: SmtpConfig = {
  enabled: false,
  host: '',
  port: 587,
  secure: false,
  user: '',
  pass: '',
  from_email: '',
  from_name: 'BarberSmart',
};

export default function GlobalSmtpConfig() {
  const [config, setConfig] = useState<SmtpConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'smtp_config')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        setConfig({
          ...defaultConfig,
          ...data.value,
        });
      }
    } catch (error) {
      console.error('Error loading SMTP config:', error);
      toast.error('Erro ao carregar configuração SMTP');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config.host || !config.user || !config.pass || !config.from_email) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'smtp_config',
          value: {
            enabled: config.enabled,
            host: config.host,
            port: config.port,
            secure: config.secure,
            user: config.user,
            pass: config.pass,
            from_email: config.from_email,
            from_name: config.from_name,
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast.success('Configuração SMTP salva com sucesso!');
    } catch (error) {
      console.error('Error saving SMTP config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config.host || !config.user || !config.pass || !config.from_email) {
      toast.error('Preencha todos os campos antes de testar');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-smtp-connection', {
        body: {
          host: config.host,
          port: config.port,
          secure: config.secure,
          user: config.user,
          pass: config.pass,
          from_email: config.from_email,
          from_name: config.from_name,
        }
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult({ success: true, message: 'Conexão SMTP testada com sucesso!' });
        toast.success('Teste de conexão bem-sucedido!');
      } else {
        setTestResult({ success: false, message: data?.error || 'Falha na conexão SMTP' });
        toast.error(data?.error || 'Falha no teste de conexão');
      }
    } catch (error: any) {
      console.error('Error testing SMTP:', error);
      setTestResult({ success: false, message: error.message || 'Erro ao testar conexão' });
      toast.error('Erro ao testar conexão SMTP');
    } finally {
      setTesting(false);
    }
  };

  const handlePortChange = (value: string) => {
    const port = parseInt(value);
    setConfig(prev => ({
      ...prev,
      port,
      secure: port === 465, // Auto-set secure based on port
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Configuração SMTP</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="smtp-enabled" className="text-sm text-muted-foreground">
              Ativar SMTP
            </Label>
            <Switch
              id="smtp-enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
        </div>
        <CardDescription>
          Configure seu servidor SMTP próprio para envio de emails (recuperação de senha, notificações, etc.)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Server Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Server className="h-4 w-4" />
            Servidor SMTP
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">Host SMTP *</Label>
              <Input
                id="smtp-host"
                placeholder="mail.seudominio.com.br"
                value={config.host}
                onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-port">Porta</Label>
              <Select value={config.port.toString()} onValueChange={handlePortChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 (Sem criptografia)</SelectItem>
                  <SelectItem value="465">465 (SSL/TLS)</SelectItem>
                  <SelectItem value="587">587 (STARTTLS)</SelectItem>
                  <SelectItem value="2525">2525 (Alternativa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="smtp-secure"
              checked={config.secure}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, secure: checked }))}
            />
            <Label htmlFor="smtp-secure" className="text-sm">
              Conexão segura (SSL/TLS)
            </Label>
          </div>
        </div>

        {/* Authentication */}
        <div className="space-y-4 pt-4 border-t">
          <div className="text-sm font-medium text-foreground">
            🔐 Autenticação
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-user">Usuário/Email *</Label>
              <Input
                id="smtp-user"
                placeholder="noreply@seudominio.com.br"
                value={config.user}
                onChange={(e) => setConfig(prev => ({ ...prev, user: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-pass">Senha *</Label>
              <div className="relative">
                <Input
                  id="smtp-pass"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={config.pass}
                  onChange={(e) => setConfig(prev => ({ ...prev, pass: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sender Info */}
        <div className="space-y-4 pt-4 border-t">
          <div className="text-sm font-medium text-foreground">
            ✉️ Remetente
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-from-email">Email Remetente *</Label>
              <Input
                id="smtp-from-email"
                type="email"
                placeholder="noreply@seudominio.com.br"
                value={config.from_email}
                onChange={(e) => setConfig(prev => ({ ...prev, from_email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-from-name">Nome Remetente</Label>
              <Input
                id="smtp-from-name"
                placeholder="BarberSmart"
                value={config.from_name}
                onChange={(e) => setConfig(prev => ({ ...prev, from_name: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </div>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={testConnection}
            disabled={testing || !config.host || !config.user || !config.pass}
            className="flex-1 sm:flex-none"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            Testar Conexão
          </Button>

          <Button
            onClick={saveConfig}
            disabled={saving}
            className="flex-1 sm:flex-none"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configuração
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2">
          <p><strong>Dica:</strong> Use a porta 587 com STARTTLS para maior compatibilidade.</p>
          <p>O email será enviado como: <code className="bg-muted px-1 rounded">{config.from_name || 'Sistema'} &lt;{config.from_email || 'email@exemplo.com'}&gt;</code></p>
        </div>
      </CardContent>
    </Card>
  );
}
