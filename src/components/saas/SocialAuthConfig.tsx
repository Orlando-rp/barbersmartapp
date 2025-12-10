import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Settings,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Info
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface SocialProviderConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
}

interface SocialAuthSettings {
  google: SocialProviderConfig;
  facebook: SocialProviderConfig;
}

export const SocialAuthConfig = () => {
  const [config, setConfig] = useState<SocialAuthSettings>({
    google: { enabled: false, clientId: '', clientSecret: '' },
    facebook: { enabled: false, clientId: '', clientSecret: '' }
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'social_auth_providers')
        .maybeSingle();

      if (data?.value) {
        setConfig({
          google: {
            enabled: data.value.google?.enabled || false,
            clientId: data.value.google?.client_id ? maskSecret(data.value.google.client_id) : '',
            clientSecret: data.value.google?.client_secret ? maskSecret(data.value.google.client_secret) : ''
          },
          facebook: {
            enabled: data.value.facebook?.enabled || false,
            clientId: data.value.facebook?.client_id ? maskSecret(data.value.facebook.client_id) : '',
            clientSecret: data.value.facebook?.client_secret ? maskSecret(data.value.facebook.client_secret) : ''
          }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const maskSecret = (secret: string) => {
    if (secret.length <= 8) return '****';
    return secret.substring(0, 4) + '...' + secret.substring(secret.length - 4);
  };

  const isSecretMasked = (value: string) => value.includes('...');

  const saveConfig = async () => {
    try {
      setSaving(true);

      const { data: currentData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'social_auth_providers')
        .maybeSingle();

      const currentConfig = currentData?.value || {};

      const newConfig = {
        google: {
          enabled: config.google.enabled,
          client_id: isSecretMasked(config.google.clientId) 
            ? currentConfig.google?.client_id 
            : config.google.clientId,
          client_secret: isSecretMasked(config.google.clientSecret)
            ? currentConfig.google?.client_secret
            : config.google.clientSecret
        },
        facebook: {
          enabled: config.facebook.enabled,
          client_id: isSecretMasked(config.facebook.clientId)
            ? currentConfig.facebook?.client_id
            : config.facebook.clientId,
          client_secret: isSecretMasked(config.facebook.clientSecret)
            ? currentConfig.facebook?.client_secret
            : config.facebook.clientSecret
        }
      };

      // Tentar primeiro um update
      const { data: existing } = await supabase
        .from('system_config')
        .select('id')
        .eq('key', 'social_auth_providers')
        .maybeSingle();

      let error;
      
      if (existing?.id) {
        // Update
        const result = await supabase
          .from('system_config')
          .update({
            value: newConfig,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'social_auth_providers');
        error = result.error;
      } else {
        // Insert
        const result = await supabase
          .from('system_config')
          .insert({
            key: 'social_auth_providers',
            value: newConfig,
            updated_at: new Date().toISOString()
          });
        error = result.error;
      }

      if (error) {
        console.error('Erro detalhado ao salvar social auth:', error);
        throw error;
      }

      toast.success("Configuração de login social salva!");
      loadConfig();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error("Erro ao salvar configuração", {
        description: error?.message || 'Verifique se a tabela system_config existe e tem as permissões corretas'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateProvider = (provider: 'google' | 'facebook', field: keyof SocialProviderConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
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
      <Alert className="border-info/50 bg-info/10">
        <Info className="h-4 w-4 text-info" />
        <AlertTitle className="text-info">Login Social - Configuração Global</AlertTitle>
        <AlertDescription className="text-info/90">
          <p className="mb-2">
            Configure os provedores de login social para permitir que clientes das barbearias 
            façam login usando Google ou Facebook.
          </p>
          <p className="text-sm">
            Essas configurações serão aplicadas globalmente em todas as barbearias.
          </p>
        </AlertDescription>
      </Alert>

      {/* Google Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Login com Google
            </span>
            <Badge className={config.google.enabled ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
              {config.google.enabled ? (
                <><CheckCircle className="h-3 w-3 mr-1" />Ativo</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" />Inativo</>
              )}
            </Badge>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Permite login usando conta Google
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 sm:p-4 bg-muted rounded-lg gap-3">
            <div className="space-y-0.5 min-w-0">
              <Label className="text-foreground text-sm">Habilitar Login com Google</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Ativar opção de login via Google
              </p>
            </div>
            <Switch
              checked={config.google.enabled}
              onCheckedChange={(checked) => updateProvider('google', 'enabled', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Client ID</Label>
            <Input
              type="text"
              value={config.google.clientId}
              onChange={(e) => updateProvider('google', 'clientId', e.target.value)}
              placeholder="xxxxx.apps.googleusercontent.com"
              className="bg-muted border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Client Secret</Label>
            <Input
              type="password"
              value={config.google.clientSecret}
              onChange={(e) => updateProvider('google', 'clientSecret', e.target.value)}
              placeholder="GOCSPX-..."
              className="bg-muted border-border text-foreground"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Obtenha suas credenciais em{" "}
            <a 
              href="https://console.cloud.google.com/apis/credentials" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-info hover:underline inline-flex items-center gap-1"
            >
              Google Cloud Console
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Facebook Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Login com Facebook
            </span>
            <Badge className={config.facebook.enabled ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
              {config.facebook.enabled ? (
                <><CheckCircle className="h-3 w-3 mr-1" />Ativo</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" />Inativo</>
              )}
            </Badge>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Permite login usando conta Facebook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 sm:p-4 bg-muted rounded-lg gap-3">
            <div className="space-y-0.5 min-w-0">
              <Label className="text-foreground text-sm">Habilitar Login com Facebook</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Ativar opção de login via Facebook
              </p>
            </div>
            <Switch
              checked={config.facebook.enabled}
              onCheckedChange={(checked) => updateProvider('facebook', 'enabled', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">App ID</Label>
            <Input
              type="text"
              value={config.facebook.clientId}
              onChange={(e) => updateProvider('facebook', 'clientId', e.target.value)}
              placeholder="123456789012345"
              className="bg-muted border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">App Secret</Label>
            <Input
              type="password"
              value={config.facebook.clientSecret}
              onChange={(e) => updateProvider('facebook', 'clientSecret', e.target.value)}
              placeholder="..."
              className="bg-muted border-border text-foreground"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Obtenha suas credenciais em{" "}
            <a 
              href="https://developers.facebook.com/apps" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-info hover:underline inline-flex items-center gap-1"
            >
              Facebook Developers
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Alert className="border-warning/50 bg-warning/10">
        <Settings className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Configuração no Supabase</AlertTitle>
        <AlertDescription className="text-warning/90">
          <p className="mb-2">
            Após configurar aqui, você também precisa configurar os provedores no 
            painel do Supabase:
          </p>
          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>Acesse Authentication → Providers no dashboard Supabase</li>
            <li>Ative Google e/ou Facebook</li>
            <li>Insira as mesmas credenciais Client ID e Secret</li>
            <li>Configure as URLs de callback fornecidas pelo Supabase</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Save Button */}
      <Button 
        onClick={saveConfig} 
        disabled={saving}
        className="bg-info hover:bg-info/90 text-info-foreground w-full text-sm"
      >
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {saving ? "Salvando..." : "Salvar Login Social"}
      </Button>
    </div>
  );
};