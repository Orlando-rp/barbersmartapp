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
  Banknote,
  FlaskConical,
  Rocket,
  AlertTriangle
} from "lucide-react";

interface GlobalPaymentSettings {
  id?: string;
  environment: 'test' | 'production';
  // Stripe Production
  stripe_secret_key: string;
  stripe_publishable_key: string;
  stripe_webhook_secret: string;
  stripe_enabled: boolean;
  // Stripe Test
  stripe_test_secret_key: string;
  stripe_test_publishable_key: string;
  stripe_test_webhook_secret: string;
  // MercadoPago Production
  mercadopago_access_token: string;
  mercadopago_public_key: string;
  mercadopago_webhook_secret: string;
  mercadopago_enabled: boolean;
  // MercadoPago Test
  mercadopago_test_access_token: string;
  mercadopago_test_public_key: string;
  // Asaas Production
  asaas_api_key: string;
  asaas_wallet_id: string;
  asaas_webhook_secret: string;
  asaas_enabled: boolean;
  // Asaas Test
  asaas_test_api_key: string;
  // General
  default_gateway: string;
  allow_tenant_credentials: boolean;
  platform_fee_percentage: number;
}

const defaultSettings: GlobalPaymentSettings = {
  environment: 'test',
  stripe_secret_key: '',
  stripe_publishable_key: '',
  stripe_webhook_secret: '',
  stripe_enabled: false,
  stripe_test_secret_key: '',
  stripe_test_publishable_key: '',
  stripe_test_webhook_secret: '',
  mercadopago_access_token: '',
  mercadopago_public_key: '',
  mercadopago_webhook_secret: '',
  mercadopago_enabled: false,
  mercadopago_test_access_token: '',
  mercadopago_test_public_key: '',
  asaas_api_key: '',
  asaas_wallet_id: '',
  asaas_webhook_secret: '',
  asaas_enabled: false,
  asaas_test_api_key: '',
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
  const [showStripeTestKey, setShowStripeTestKey] = useState(false);
  const [showMpKey, setShowMpKey] = useState(false);
  const [showMpTestKey, setShowMpTestKey] = useState(false);
  const [showAsaasKey, setShowAsaasKey] = useState(false);
  const [showAsaasTestKey, setShowAsaasTestKey] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [stripeTestStatus, setStripeTestStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [mpStatus, setMpStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [mpTestStatus, setMpTestStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [asaasStatus, setAsaasStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [asaasTestStatus, setAsaasTestStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

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
        if (data.stripe_test_secret_key) setStripeTestStatus('connected');
        if (data.mercadopago_access_token) setMpStatus('connected');
        if (data.mercadopago_test_access_token) setMpTestStatus('connected');
        if (data.asaas_api_key) setAsaasStatus('connected');
        if (data.asaas_test_api_key) setAsaasTestStatus('connected');
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

  const testStripeConnection = async (isTest: boolean = false) => {
    const keyToTest = isTest ? settings.stripe_test_secret_key : settings.stripe_secret_key;
    if (!keyToTest) {
      toast.error(`Informe a Secret Key do Stripe (${isTest ? 'Teste' : 'Produção'})`);
      return;
    }

    setTestingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-stripe-connection', {
        body: { secretKey: keyToTest }
      });

      if (error) throw error;

      if (data?.success) {
        if (isTest) {
          setStripeTestStatus('connected');
        } else {
          setStripeStatus('connected');
        }
        const accountName = data.account?.business_name || data.account?.email || data.account?.id;
        toast.success(`Stripe ${isTest ? '(Teste)' : ''} conectado! Conta: ${accountName}`);
      } else {
        if (isTest) {
          setStripeTestStatus('error');
        } else {
          setStripeStatus('error');
        }
        toast.error(data?.error || 'Chave inválida');
      }
    } catch (error) {
      console.error('Erro ao testar Stripe:', error);
      if (isTest) {
        setStripeTestStatus('error');
      } else {
        setStripeStatus('error');
      }
      toast.error('Erro ao conectar com Stripe');
    } finally {
      setTestingStripe(false);
    }
  };

  const testMercadoPagoConnection = async (isTest: boolean = false) => {
    const tokenToTest = isTest ? settings.mercadopago_test_access_token : settings.mercadopago_access_token;
    if (!tokenToTest) {
      toast.error(`Informe o Access Token do Mercado Pago (${isTest ? 'Teste' : 'Produção'})`);
      return;
    }

    setTestingMercadoPago(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-mercadopago-connection', {
        body: { accessToken: tokenToTest }
      });

      if (error) throw error;

      if (data?.success) {
        if (isTest) {
          setMpTestStatus('connected');
        } else {
          setMpStatus('connected');
        }
        const userName = data.user?.nickname || data.user?.email || data.user?.first_name;
        toast.success(`MercadoPago ${isTest ? '(Teste)' : ''} conectado! Conta: ${userName}`);
      } else {
        if (isTest) {
          setMpTestStatus('error');
        } else {
          setMpStatus('error');
        }
        toast.error(data?.error || 'Token inválido');
      }
    } catch (error) {
      console.error('Erro ao testar MercadoPago:', error);
      if (isTest) {
        setMpTestStatus('error');
      } else {
        setMpStatus('error');
      }
      toast.error('Erro ao conectar com Mercado Pago');
    } finally {
      setTestingMercadoPago(false);
    }
  };

  const testAsaasConnection = async (isTest: boolean = false) => {
    const keyToTest = isTest ? settings.asaas_test_api_key : settings.asaas_api_key;
    if (!keyToTest) {
      toast.error(`Informe a API Key do Asaas (${isTest ? 'Teste' : 'Produção'})`);
      return;
    }

    setTestingAsaas(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-asaas-connection', {
        body: { apiKey: keyToTest, isTest }
      });

      if (error) throw error;

      if (data?.success) {
        if (isTest) {
          setAsaasTestStatus('connected');
        } else {
          setAsaasStatus('connected');
        }
        const accountName = data.account?.name || data.account?.email || data.account?.cpfCnpj;
        toast.success(`Asaas ${isTest ? '(Sandbox)' : ''} conectado! Conta: ${accountName}`);
      } else {
        if (isTest) {
          setAsaasTestStatus('error');
        } else {
          setAsaasStatus('error');
        }
        toast.error(data?.error || 'API Key inválida');
      }
    } catch (error) {
      console.error('Erro ao testar Asaas:', error);
      if (isTest) {
        setAsaasTestStatus('error');
      } else {
        setAsaasStatus('error');
      }
      toast.error('Erro ao conectar com Asaas');
    } finally {
      setTestingAsaas(false);
    }
  };

  const isTestMode = settings.environment === 'test';

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
      {/* Environment Selector */}
      <Card className={isTestMode ? "border-amber-500/50 bg-amber-500/5" : "border-green-500/50 bg-green-500/5"}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isTestMode ? (
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <FlaskConical className="h-5 w-5 text-amber-600" />
                </div>
              ) : (
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Rocket className="h-5 w-5 text-green-600" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">Ambiente de Pagamentos</h3>
                <p className="text-sm text-muted-foreground">
                  {isTestMode 
                    ? "Modo teste - pagamentos simulados, sem cobranças reais"
                    : "Modo produção - pagamentos reais serão processados"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isTestMode ? "default" : "outline"}
                size="sm"
                onClick={() => setSettings({ ...settings, environment: 'test' })}
                className={isTestMode ? "bg-amber-600 hover:bg-amber-700" : ""}
              >
                <FlaskConical className="h-4 w-4 mr-1" />
                Teste
              </Button>
              <Button
                variant={!isTestMode ? "default" : "outline"}
                size="sm"
                onClick={() => setSettings({ ...settings, environment: 'production' })}
                className={!isTestMode ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <Rocket className="h-4 w-4 mr-1" />
                Produção
              </Button>
            </div>
          </div>
          {isTestMode && (
            <Alert className="mt-4 border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <strong>Modo Teste Ativo:</strong> As transações usarão credenciais de teste. Nenhum pagamento real será processado.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="stripe" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stripe" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Stripe</span>
            {(isTestMode ? stripeTestStatus : stripeStatus) === 'connected' && (
              <Badge variant="outline" className="ml-1 bg-green-500/10 text-green-600 text-xs px-1">
                ✓
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mercadopago" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">MercadoPago</span>
            {(isTestMode ? mpTestStatus : mpStatus) === 'connected' && (
              <Badge variant="outline" className="ml-1 bg-green-500/10 text-green-600 text-xs px-1">
                ✓
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="asaas" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            <span className="hidden sm:inline">Asaas</span>
            {(isTestMode ? asaasTestStatus : asaasStatus) === 'connected' && (
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
        <TabsContent value="stripe" className="mt-6 space-y-4">
          {/* Test Credentials */}
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    <FlaskConical className="h-3 w-3 mr-1" />
                    TESTE
                  </Badge>
                  <span className="text-sm text-muted-foreground">Chaves sk_test_...</span>
                </div>
                {stripeTestStatus === 'connected' && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Secret Key (sk_test_...)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showStripeTestKey ? "text" : "password"}
                        value={settings.stripe_test_secret_key}
                        onChange={(e) => setSettings({ ...settings, stripe_test_secret_key: e.target.value })}
                        placeholder="sk_test_..."
                        className="pr-10 font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowStripeTestKey(!showStripeTestKey)}
                      >
                        {showStripeTestKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => testStripeConnection(true)}
                      disabled={testingStripe || !settings.stripe_test_secret_key}
                    >
                      {testingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Publishable Key (pk_test_...)</Label>
                  <Input
                    value={settings.stripe_test_publishable_key}
                    onChange={(e) => setSettings({ ...settings, stripe_test_publishable_key: e.target.value })}
                    placeholder="pk_test_..."
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Webhook Secret (whsec_...)</Label>
                <Input
                  type="password"
                  value={settings.stripe_test_webhook_secret}
                  onChange={(e) => setSettings({ ...settings, stripe_test_webhook_secret: e.target.value })}
                  placeholder="whsec_..."
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Production Credentials */}
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <Rocket className="h-3 w-3 mr-1" />
                    PRODUÇÃO
                  </Badge>
                  <span className="text-sm text-muted-foreground">Chaves sk_live_...</span>
                </div>
                <div className="flex items-center gap-2">
                  {stripeStatus === 'connected' && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
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
              <div className="grid gap-4 md:grid-cols-2">
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
                      size="sm" 
                      onClick={() => testStripeConnection(false)}
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
        <TabsContent value="mercadopago" className="mt-6 space-y-4">
          {/* Test Credentials */}
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    <FlaskConical className="h-3 w-3 mr-1" />
                    TESTE
                  </Badge>
                  <span className="text-sm text-muted-foreground">Credenciais de teste</span>
                </div>
                {mpTestStatus === 'connected' && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Access Token (Teste)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showMpTestKey ? "text" : "password"}
                        value={settings.mercadopago_test_access_token}
                        onChange={(e) => setSettings({ ...settings, mercadopago_test_access_token: e.target.value })}
                        placeholder="TEST-..."
                        className="pr-10 font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowMpTestKey(!showMpTestKey)}
                      >
                        {showMpTestKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm" 
                      onClick={() => testMercadoPagoConnection(true)}
                      disabled={testingMercadoPago || !settings.mercadopago_test_access_token}
                    >
                      {testingMercadoPago ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Public Key (Teste)</Label>
                  <Input
                    value={settings.mercadopago_test_public_key}
                    onChange={(e) => setSettings({ ...settings, mercadopago_test_public_key: e.target.value })}
                    placeholder="TEST-..."
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production Credentials */}
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <Rocket className="h-3 w-3 mr-1" />
                    PRODUÇÃO
                  </Badge>
                  <span className="text-sm text-muted-foreground">Credenciais de produção</span>
                </div>
                <div className="flex items-center gap-2">
                  {mpStatus === 'connected' && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
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
              <div className="grid gap-4 md:grid-cols-2">
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
                      size="sm" 
                      onClick={() => testMercadoPagoConnection(false)}
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
        <TabsContent value="asaas" className="mt-6 space-y-4">
          {/* Test (Sandbox) Credentials */}
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    <FlaskConical className="h-3 w-3 mr-1" />
                    SANDBOX
                  </Badge>
                  <span className="text-sm text-muted-foreground">sandbox.asaas.com</span>
                </div>
                {asaasTestStatus === 'connected' && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-muted/50 border-muted-foreground/20">
                <AlertDescription className="text-sm">
                  Crie uma conta sandbox em{" "}
                  <a 
                    href="https://sandbox.asaas.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary font-medium inline-flex items-center gap-1 hover:underline"
                  >
                    sandbox.asaas.com
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>API Key (Sandbox)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showAsaasTestKey ? "text" : "password"}
                      value={settings.asaas_test_api_key}
                      onChange={(e) => setSettings({ ...settings, asaas_test_api_key: e.target.value })}
                      placeholder="$aact_..."
                      className="pr-10 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowAsaasTestKey(!showAsaasTestKey)}
                    >
                      {showAsaasTestKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={() => testAsaasConnection(true)}
                    disabled={testingAsaas || !settings.asaas_test_api_key}
                  >
                    {testingAsaas ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production Credentials */}
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <Rocket className="h-3 w-3 mr-1" />
                    PRODUÇÃO
                  </Badge>
                  <span className="text-sm text-muted-foreground">api.asaas.com</span>
                </div>
                <div className="flex items-center gap-2">
                  {asaasStatus === 'connected' && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
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
                    size="sm" 
                    onClick={() => testAsaasConnection(false)}
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
