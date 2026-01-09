import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  CreditCard, 
  Save, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Wallet,
  Percent,
  Loader2
} from "lucide-react";

interface PaymentSettings {
  id?: string;
  barbershop_id: string;
  mercadopago_access_token: string;
  mercadopago_public_key: string;
  allow_online_payment: boolean;
  allow_pay_at_location: boolean;
  require_deposit: boolean;
  deposit_percentage: number;
}

export default function PaymentSettingsSection() {
  const { barbershopId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  
  const [settings, setSettings] = useState<PaymentSettings>({
    barbershop_id: barbershopId || '',
    mercadopago_access_token: '',
    mercadopago_public_key: '',
    allow_online_payment: false,
    allow_pay_at_location: true,
    require_deposit: false,
    deposit_percentage: 0,
  });

  useEffect(() => {
    if (barbershopId) {
      fetchSettings();
    }
  }, [barbershopId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
        if (data.mercadopago_access_token) {
          setConnectionStatus('connected');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de pagamento:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!barbershopId) return;

    try {
      setSaving(true);

      const payload = {
        ...settings,
        barbershop_id: barbershopId,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('payment_settings')
          .update(payload)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('payment_settings')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) setSettings(data);
      }

      toast.success('Configurações de pagamento salvas!');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!settings.mercadopago_access_token) {
      toast.error('Informe o Access Token para testar');
      return;
    }

    setTesting(true);
    try {
      // Call Edge Function to test connection (avoids CORS)
      const { data, error } = await supabase.functions.invoke('test-mercadopago-connection', {
        body: { accessToken: settings.mercadopago_access_token }
      });

      if (error) throw error;

      if (data?.success) {
        setConnectionStatus('connected');
        const userName = data.user?.nickname || data.user?.email || data.user?.first_name;
        toast.success(`Conexão estabelecida! Conta: ${userName}`);
      } else {
        setConnectionStatus('error');
        toast.error(data?.error || 'Token inválido ou expirado');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setConnectionStatus('error');
      toast.error('Erro ao conectar com Mercado Pago');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mercado Pago Credentials */}
      <Card className="barbershop-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#009ee3]/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-[#009ee3]" />
              </div>
              <div>
                <CardTitle className="text-base">Credenciais Mercado Pago</CardTitle>
                <CardDescription>Configure suas chaves de integração</CardDescription>
              </div>
            </div>
            {connectionStatus === 'connected' && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            )}
            {connectionStatus === 'error' && (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                Erro
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-muted/50 border-muted-foreground/20">
            <AlertDescription className="text-sm">
              Para obter suas credenciais, acesse o{" "}
              <a 
                href="https://www.mercadopago.com.br/developers/panel/app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary font-medium inline-flex items-center gap-1 hover:underline"
              >
                Painel de Desenvolvedores
                <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="access_token">Access Token (Produção)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="access_token"
                  type={showToken ? "text" : "password"}
                  value={settings.mercadopago_access_token}
                  onChange={(e) => setSettings({ ...settings, mercadopago_access_token: e.target.value })}
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button 
                variant="outline" 
                onClick={testConnection}
                disabled={testing || !settings.mercadopago_access_token}
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="public_key">Public Key</Label>
            <Input
              id="public_key"
              value={settings.mercadopago_public_key}
              onChange={(e) => setSettings({ ...settings, mercadopago_public_key: e.target.value })}
              placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Options */}
      <Card className="barbershop-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Opções de Pagamento</CardTitle>
              <CardDescription>Configure como seus clientes podem pagar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow_online">Pagamento Online</Label>
              <p className="text-sm text-muted-foreground">
                Permitir pagamento via Mercado Pago (PIX, Cartão)
              </p>
            </div>
            <Switch
              id="allow_online"
              checked={settings.allow_online_payment}
              onCheckedChange={(checked) => setSettings({ ...settings, allow_online_payment: checked })}
              disabled={!settings.mercadopago_access_token}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow_location">Pagamento no Local</Label>
              <p className="text-sm text-muted-foreground">
                Permitir pagamento presencial (dinheiro, cartão, PIX)
              </p>
            </div>
            <Switch
              id="allow_location"
              checked={settings.allow_pay_at_location}
              onCheckedChange={(checked) => setSettings({ ...settings, allow_pay_at_location: checked })}
            />
          </div>

          {!settings.allow_online_payment && !settings.allow_pay_at_location && (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Ative pelo menos uma opção de pagamento
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Deposit Settings */}
      <Card className="barbershop-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Percent className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-base">Sinal / Depósito</CardTitle>
              <CardDescription>Exigir pagamento antecipado parcial</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require_deposit">Exigir Sinal</Label>
              <p className="text-sm text-muted-foreground">
                O cliente deve pagar uma porcentagem antecipada
              </p>
            </div>
            <Switch
              id="require_deposit"
              checked={settings.require_deposit}
              onCheckedChange={(checked) => setSettings({ ...settings, require_deposit: checked })}
              disabled={!settings.allow_online_payment}
            />
          </div>

          {settings.require_deposit && (
            <div className="space-y-2">
              <Label htmlFor="deposit_percentage">Percentual do Sinal (%)</Label>
              <Input
                id="deposit_percentage"
                type="number"
                min={0}
                max={100}
                value={settings.deposit_percentage}
                onChange={(e) => setSettings({ ...settings, deposit_percentage: Number(e.target.value) })}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Ex: 30% de sinal para um serviço de R$ 100 = R$ 30 antecipados
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          variant="premium" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
