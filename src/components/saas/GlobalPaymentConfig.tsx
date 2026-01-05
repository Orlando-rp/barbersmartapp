import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
  Loader2,
  DollarSign,
  Percent,
  Settings2,
  Banknote
} from "lucide-react";

interface GlobalPaymentSettings {
  id?: string;
  stripe_secret_key: string;
  stripe_publishable_key: string;
  stripe_webhook_secret: string;
  stripe_enabled: boolean;
  mercadopago_access_token: string;
  mercadopago_public_key: string;
  mercadopago_webhook_secret: string;
  mercadopago_enabled: boolean;
  asaas_api_key: string;
  asaas_wallet_id: string;
  asaas_webhook_secret: string;
  asaas_enabled: boolean;
  default_gateway: string;
  allow_tenant_credentials: boolean;
  platform_fee_percentage: number;
}

const defaultSettings: GlobalPaymentSettings = {
  stripe_secret_key: '',
  stripe_publishable_key: '',
  stripe_webhook_secret: '',
  stripe_enabled: false,
  mercadopago_access_token: '',
  mercadopago_public_key: '',
  mercadopago_webhook_secret: '',
  mercadopago_enabled: false,
  asaas_api_key: '',
  asaas_wallet_id: '',
  asaas_webhook_secret: '',
  asaas_enabled: false,
  default_gateway: 'mercadopago',
  allow_tenant_credentials: true,
  platform_fee_percentage: 0,
};

export const GlobalPaymentConfig = () => {
  const [settings, setSettings] = useState<GlobalPaymentSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingStripe, setTestingStripe] = useState(false);
  const [testingMercadoPago, setTestingMercadoPago] = useState(false);
  const [testingAsaas, setTestingAsaas] = useState(false);
  const [showStripeKey, setShowStripeKey] = useState(false);
  const [showMpKey, setShowMpKey] = useState(false);
  const [showAsaasKey, setShowAsaasKey] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [mpStatus, setMpStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [asaasStatus, setAsaasStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('global_payment_config')
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          ...defaultSettings,
          ...data
        });
        if (data.stripe_secret_key) setStripeStatus('connected');
        if (data.mercadopago_access_token) setMpStatus('connected');
        if (data.asaas_api_key) setAsaasStatus('connected');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (settings.id) {
        const { error } = await supabase
          .from('global_payment_config')
          .update(settings)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('global_payment_config')
          .insert(settings)
          .select()
          .single();
        if (error) throw error;
        if (data) setSettings(data);
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const testStripeConnection = async () => {
    if (!settings.stripe_secret_key) {
      toast.error('Informe a Secret Key do Stripe');
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
        toast.success(`Stripe conectado! Conta: ${accountName}`);
      } else {
        setStripeStatus('error');
        toast.error(data?.error || 'Chave inválida');
      }
    } catch (error) {
      console.error('Erro ao testar Stripe:', error);
      setStripeStatus('error');
      toast.error('Erro ao conectar com Stripe');
    } finally {
      setTestingStripe(false);
    }
  };

  const testMercadoPagoConnection = async () => {
    if (!settings.mercadopago_access_token) {
      toast.error('Informe o Access Token do Mercado Pago');
      return;
    }

    setTestingMercadoPago(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-mercadopago-connection', {
        body: { accessToken: settings.mercadopago_access_token }
      });

      if (error) throw error;

      if (data?.success) {
        setMpStatus('connected');
        const userName = data.user?.nickname || data.user?.email || data.user?.first_name;
        toast.success(`MercadoPago conectado! Conta: ${userName}`);
      } else {
        setMpStatus('error');
        toast.error(data?.error || 'Token inválido');
      }
    } catch (error) {
      console.error('Erro ao testar MercadoPago:', error);
      setMpStatus('error');
      toast.error('Erro ao conectar com Mercado Pago');
    } finally {
      setTestingMercadoPago(false);
    }
  };

  const testAsaasConnection = async () => {
    if (!settings.asaas_api_key) {
      toast.error('Informe a API Key do Asaas');
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
        toast.success(`Asaas conectado! Conta: ${accountName}`);
      } else {
        setAsaasStatus('error');
        toast.error(data?.error || 'API Key inválida');
      }
    } catch (error) {
      console.error('Erro ao testar Asaas:', error);
      setAsaasStatus('error');
      toast.error('Erro ao conectar com Asaas');
    } finally {
      setTestingAsaas(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="stripe" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stripe" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Stripe</span>
            {stripeStatus === 'connected' && (
              <Badge variant="outline" className="ml-1 bg-green-500/10 text-green-600 text-xs px-1">
                ✓
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mercadopago" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">MercadoPago</span>
            {mpStatus === 'connected' && (
              <Badge variant="outline" className="ml-1 bg-green-500/10 text-green-600 text-xs px-1">
                ✓
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="asaas" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            <span className="hidden sm:inline">Asaas</span>
            {asaasStatus === 'connected' && (
              <Badge variant="outline" className="ml-1 bg-green-500/10 text-green-600 text-xs px-1">
                ✓
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>

        {/* Stripe Tab */}
        <TabsContent value="stripe" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#635BFF]/10 rounded-lg">
                    <CreditCard className="h-5 w-5 text-[#635BFF]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Stripe</CardTitle>
                    <CardDescription>Pagamentos internacionais via cartão</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {stripeStatus === 'connected' && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  )}
                  {stripeStatus === 'error' && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Erro
                    </Badge>
                  )}
                  <Switch
                    checked={settings.stripe_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, stripe_enabled: checked })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="space-y-2">
                <Label>Webhook Secret (whsec_...)</Label>
                <Input
                  type="password"
                  value={settings.stripe_webhook_secret}
                  onChange={(e) => setSettings({ ...settings, stripe_webhook_secret: e.target.value })}
                  placeholder="whsec_..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Configure o webhook no Stripe para: [URL_DO_PROJETO]/functions/v1/stripe-webhook
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MercadoPago Tab */}
        <TabsContent value="mercadopago" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#009ee3]/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-[#009ee3]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Mercado Pago</CardTitle>
                    <CardDescription>Pagamentos via PIX e cartão no Brasil</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mpStatus === 'connected' && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  )}
                  {mpStatus === 'error' && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Erro
                    </Badge>
                  )}
                  <Switch
                    checked={settings.mercadopago_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, mercadopago_enabled: checked })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      type={showMpKey ? "text" : "password"}
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
                      onClick={() => setShowMpKey(!showMpKey)}
                    >
                      {showMpKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={testMercadoPagoConnection}
                    disabled={testingMercadoPago || !settings.mercadopago_access_token}
                  >
                    {testingMercadoPago ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
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

              <div className="space-y-2">
                <Label>Webhook Secret (opcional)</Label>
                <Input
                  type="password"
                  value={settings.mercadopago_webhook_secret}
                  onChange={(e) => setSettings({ ...settings, mercadopago_webhook_secret: e.target.value })}
                  placeholder="Chave de assinatura do webhook"
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asaas Tab */}
        <TabsContent value="asaas" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#0EA5E9]/10 rounded-lg">
                    <Banknote className="h-5 w-5 text-[#0EA5E9]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Asaas</CardTitle>
                    <CardDescription>Pagamentos via PIX, Boleto e Cartão</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {asaasStatus === 'connected' && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  )}
                  {asaasStatus === 'error' && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Erro
                    </Badge>
                  )}
                  <Switch
                    checked={settings.asaas_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, asaas_enabled: checked })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  placeholder="ID da carteira para split de pagamentos"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use para direcionar recebimentos para uma carteira específica
                </p>
              </div>

              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <Input
                  type="password"
                  value={settings.asaas_webhook_secret}
                  onChange={(e) => setSettings({ ...settings, asaas_webhook_secret: e.target.value })}
                  placeholder="Token de autenticação do webhook"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Configure o webhook no Asaas para: [URL_DO_PROJETO]/functions/v1/asaas-webhook
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Configurações Gerais</CardTitle>
                  <CardDescription>Preferências de pagamento da plataforma</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Gateway Padrão</Label>
                <Select
                  value={settings.default_gateway}
                  onValueChange={(value) => setSettings({ ...settings, default_gateway: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mercadopago">
                      <span className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-[#009ee3]" />
                        Mercado Pago
                      </span>
                    </SelectItem>
                    <SelectItem value="stripe">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#635BFF]" />
                        Stripe
                      </span>
                    </SelectItem>
                    <SelectItem value="asaas">
                      <span className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-[#0EA5E9]" />
                        Asaas
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Gateway usado quando o tenant não configura credenciais próprias
                </p>
              </div>

              <div className="flex items-center justify-between py-3 border-t">
                <div className="space-y-0.5">
                  <Label>Permitir Credenciais dos Tenants</Label>
                  <p className="text-sm text-muted-foreground">
                    Barbearias podem usar suas próprias contas de pagamento
                  </p>
                </div>
                <Switch
                  checked={settings.allow_tenant_credentials}
                  onCheckedChange={(checked) => setSettings({ ...settings, allow_tenant_credentials: checked })}
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Taxa da Plataforma (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={settings.platform_fee_percentage}
                  onChange={(e) => setSettings({ ...settings, platform_fee_percentage: Number(e.target.value) })}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Percentual retido pela plataforma em cada transação (0 = sem taxa)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="min-w-[160px]"
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
};

export default GlobalPaymentConfig;
