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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2,
  DollarSign,
  Banknote,
  Globe
} from "lucide-react";

interface PaymentSettings {
  id?: string;
  barbershop_id: string;
  mercadopago_access_token: string;
  mercadopago_public_key: string;
  stripe_secret_key: string;
  stripe_publishable_key: string;
  asaas_api_key: string;
  asaas_wallet_id: string;
  preferred_gateway: string;
  use_global_credentials: boolean;
  allow_online_payment: boolean;
  allow_pay_at_location: boolean;
  require_deposit: boolean;
  deposit_percentage: number;
}

const defaultSettings: PaymentSettings = {
  barbershop_id: '',
  mercadopago_access_token: '',
  mercadopago_public_key: '',
  stripe_secret_key: '',
  stripe_publishable_key: '',
  asaas_api_key: '',
  asaas_wallet_id: '',
  preferred_gateway: 'mercadopago',
  use_global_credentials: true,
  allow_online_payment: false,
  allow_pay_at_location: true,
  require_deposit: false,
  deposit_percentage: 0,
};

export default function PaymentSettingsSection() {
  const { barbershopId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingMp, setTestingMp] = useState(false);
  const [testingStripe, setTestingStripe] = useState(false);
  const [testingAsaas, setTestingAsaas] = useState(false);
  const [showMpToken, setShowMpToken] = useState(false);
  const [showStripeKey, setShowStripeKey] = useState(false);
  const [showAsaasKey, setShowAsaasKey] = useState(false);
  const [mpStatus, setMpStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [stripeStatus, setStripeStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [asaasStatus, setAsaasStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  
  const [settings, setSettings] = useState<PaymentSettings>({
    ...defaultSettings,
    barbershop_id: barbershopId || '',
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
        setSettings({
          ...defaultSettings,
          ...data
        });
        if (data.mercadopago_access_token) setMpStatus('connected');
        if (data.stripe_secret_key) setStripeStatus('connected');
        if (data.asaas_api_key) setAsaasStatus('connected');
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

  const testMercadoPagoConnection = async () => {
    if (!settings.mercadopago_access_token) {
      toast.error('Informe o Access Token para testar');
      return;
    }

    setTestingMp(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-mercadopago-connection', {
        body: { accessToken: settings.mercadopago_access_token }
      });

      if (error) throw error;

      if (data?.success) {
        setMpStatus('connected');
        const userName = data.user?.nickname || data.user?.email || data.user?.first_name;
        toast.success(`Conexão estabelecida! Conta: ${userName}`);
      } else {
        setMpStatus('error');
        toast.error(data?.error || 'Token inválido ou expirado');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setMpStatus('error');
      toast.error('Erro ao conectar com Mercado Pago');
    } finally {
      setTestingMp(false);
    }
  };

  const testStripeConnection = async () => {
    if (!settings.stripe_secret_key) {
      toast.error('Informe a Secret Key para testar');
      return;
    }

    setTestingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-stripe-connection', {
        body: { secretKey: settings.stripe_secret_key }
      });

      if (error) throw error;

      if (data?.success) {
        setStripeStatus('connected');
        const accountName = data.account?.business_name || data.account?.email || data.account?.id;
        toast.success(`Conexão estabelecida! Conta: ${accountName}`);
      } else {
        setStripeStatus('error');
        toast.error(data?.error || 'Chave inválida');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setStripeStatus('error');
      toast.error('Erro ao conectar com Stripe');
    } finally {
      setTestingStripe(false);
    }
  };

  const testAsaasConnection = async () => {
    if (!settings.asaas_api_key) {
      toast.error('Informe a API Key para testar');
      return;
    }

    setTestingAsaas(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-asaas-connection', {
        body: { apiKey: settings.asaas_api_key }
      });

      if (error) throw error;

      if (data?.success) {
        setAsaasStatus('connected');
        const accountName = data.account?.name || data.account?.email || data.account?.cpfCnpj;
        toast.success(`Conexão estabelecida! Conta: ${accountName}`);
      } else {
        setAsaasStatus('error');
        toast.error(data?.error || 'API Key inválida');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setAsaasStatus('error');
      toast.error('Erro ao conectar com Asaas');
    } finally {
      setTestingAsaas(false);
    }
  };

  const getGatewayStatus = (gateway: string) => {
    if (settings.use_global_credentials) return 'global';
    switch (gateway) {
      case 'mercadopago': return settings.mercadopago_access_token ? 'configured' : 'not_configured';
      case 'stripe': return settings.stripe_secret_key ? 'configured' : 'not_configured';
      case 'asaas': return settings.asaas_api_key ? 'configured' : 'not_configured';
      default: return 'not_configured';
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
      {/* Gateway Selection */}
      <Card className="barbershop-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Gateway de Pagamento</CardTitle>
              <CardDescription>Escolha qual gateway usar para receber pagamentos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Gateway Preferido</Label>
            <Select
              value={settings.preferred_gateway}
              onValueChange={(value) => setSettings({ ...settings, preferred_gateway: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mercadopago">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#009ee3]" />
                    Mercado Pago
                    {getGatewayStatus('mercadopago') === 'configured' && (
                      <Badge variant="outline" className="ml-2 text-xs bg-green-500/10 text-green-600">Configurado</Badge>
                    )}
                    {getGatewayStatus('mercadopago') === 'global' && (
                      <Badge variant="outline" className="ml-2 text-xs bg-blue-500/10 text-blue-600">Global</Badge>
                    )}
                  </span>
                </SelectItem>
                <SelectItem value="stripe">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[#635BFF]" />
                    Stripe
                    {getGatewayStatus('stripe') === 'configured' && (
                      <Badge variant="outline" className="ml-2 text-xs bg-green-500/10 text-green-600">Configurado</Badge>
                    )}
                    {getGatewayStatus('stripe') === 'global' && (
                      <Badge variant="outline" className="ml-2 text-xs bg-blue-500/10 text-blue-600">Global</Badge>
                    )}
                  </span>
                </SelectItem>
                <SelectItem value="asaas">
                  <span className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-[#0EA5E9]" />
                    Asaas
                    {getGatewayStatus('asaas') === 'configured' && (
                      <Badge variant="outline" className="ml-2 text-xs bg-green-500/10 text-green-600">Configurado</Badge>
                    )}
                    {getGatewayStatus('asaas') === 'global' && (
                      <Badge variant="outline" className="ml-2 text-xs bg-blue-500/10 text-blue-600">Global</Badge>
                    )}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-3 border-t">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Usar Credenciais Globais
              </Label>
              <p className="text-sm text-muted-foreground">
                Usar as credenciais configuradas pela plataforma
              </p>
            </div>
            <Switch
              checked={settings.use_global_credentials}
              onCheckedChange={(checked) => setSettings({ ...settings, use_global_credentials: checked })}
            />
          </div>

          {settings.use_global_credentials && (
            <Alert className="bg-blue-500/10 border-blue-500/30">
              <Globe className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                Os pagamentos serão processados usando as credenciais configuradas pelo administrador da plataforma.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Gateway Credentials - Only show if not using global */}
      {!settings.use_global_credentials && (
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle className="text-base">Credenciais do Gateway</CardTitle>
            <CardDescription>Configure as chaves de integração do gateway selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={settings.preferred_gateway} onValueChange={(value) => setSettings({ ...settings, preferred_gateway: value })}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="mercadopago" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">MercadoPago</span>
                  {mpStatus === 'connected' && (
                    <Badge variant="outline" className="ml-1 bg-green-500/10 text-green-600 text-xs px-1">✓</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="stripe" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Stripe</span>
                  {stripeStatus === 'connected' && (
                    <Badge variant="outline" className="ml-1 bg-green-500/10 text-green-600 text-xs px-1">✓</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="asaas" className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  <span className="hidden sm:inline">Asaas</span>
                  {asaasStatus === 'connected' && (
                    <Badge variant="outline" className="ml-1 bg-green-500/10 text-green-600 text-xs px-1">✓</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* MercadoPago */}
              <TabsContent value="mercadopago" className="mt-4 space-y-4">
                <Alert className="bg-muted/50 border-muted-foreground/20">
                  <AlertDescription className="text-sm">
                    Obtenha suas credenciais no{" "}
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
                  <Label>Access Token (Produção)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showMpToken ? "text" : "password"}
                        value={settings.mercadopago_access_token}
                        onChange={(e) => setSettings({ ...settings, mercadopago_access_token: e.target.value })}
                        placeholder="APP_USR-..."
                        className="pr-10 font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowMpToken(!showMpToken)}
                      >
                        {showMpToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={testMercadoPagoConnection}
                      disabled={testingMp || !settings.mercadopago_access_token}
                    >
                      {testingMp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Public Key</Label>
                  <Input
                    value={settings.mercadopago_public_key}
                    onChange={(e) => setSettings({ ...settings, mercadopago_public_key: e.target.value })}
                    placeholder="APP_USR-..."
                    className="font-mono text-sm"
                  />
                </div>
              </TabsContent>

              {/* Stripe */}
              <TabsContent value="stripe" className="mt-4 space-y-4">
                <Alert className="bg-muted/50 border-muted-foreground/20">
                  <AlertDescription className="text-sm">
                    Obtenha suas credenciais no{" "}
                    <a 
                      href="https://dashboard.stripe.com/apikeys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary font-medium inline-flex items-center gap-1 hover:underline"
                    >
                      Stripe Dashboard
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Secret Key (sk_live_...)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showStripeKey ? "text" : "password"}
                        value={settings.stripe_secret_key}
                        onChange={(e) => setSettings({ ...settings, stripe_secret_key: e.target.value })}
                        placeholder="sk_live_..."
                        className="pr-10 font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowStripeKey(!showStripeKey)}
                      >
                        {showStripeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={testStripeConnection}
                      disabled={testingStripe || !settings.stripe_secret_key}
                    >
                      {testingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Publishable Key (pk_live_...)</Label>
                  <Input
                    value={settings.stripe_publishable_key}
                    onChange={(e) => setSettings({ ...settings, stripe_publishable_key: e.target.value })}
                    placeholder="pk_live_..."
                    className="font-mono text-sm"
                  />
                </div>
              </TabsContent>

              {/* Asaas */}
              <TabsContent value="asaas" className="mt-4 space-y-4">
                <Alert className="bg-muted/50 border-muted-foreground/20">
                  <AlertDescription className="text-sm">
                    Obtenha sua API Key no{" "}
                    <a 
                      href="https://www.asaas.com/customerIntegrations" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary font-medium inline-flex items-center gap-1 hover:underline"
                    >
                      Painel de Integrações
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>API Key (Produção)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showAsaasKey ? "text" : "password"}
                        value={settings.asaas_api_key}
                        onChange={(e) => setSettings({ ...settings, asaas_api_key: e.target.value })}
                        placeholder="$aact_..."
                        className="pr-10 font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowAsaasKey(!showAsaasKey)}
                      >
                        {showAsaasKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={testAsaasConnection}
                      disabled={testingAsaas || !settings.asaas_api_key}
                    >
                      {testingAsaas ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Wallet ID (opcional)</Label>
                  <Input
                    value={settings.asaas_wallet_id}
                    onChange={(e) => setSettings({ ...settings, asaas_wallet_id: e.target.value })}
                    placeholder="ID da carteira para split"
                    className="font-mono text-sm"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

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
                Permitir pagamento via gateway (PIX, Cartão, Boleto)
              </p>
            </div>
            <Switch
              id="allow_online"
              checked={settings.allow_online_payment}
              onCheckedChange={(checked) => setSettings({ ...settings, allow_online_payment: checked })}
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
