import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Check, 
  CreditCard, 
  Shield, 
  Zap,
  Star,
  Crown,
  Sparkles,
  AlertCircle,
  Building2,
  Calendar,
  Users,
  Gift,
  Info
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  max_appointments: number;
  max_staff: number;
  max_units: number;
  feature_flags: Record<string, boolean>;
}

interface Barbershop {
  id: string;
  name: string;
}

interface PaymentConfig {
  mercadopago_enabled: boolean;
  stripe_enabled: boolean;
}

const SubscriptionCheckout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, selectedBarbershopId, barbershops } = useAuth();
  
  const planId = searchParams.get('plan');
  
  const [plan, setPlan] = useState<Plan | null>(null);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentAvailable, setPaymentAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!planId) {
      toast.error('Plano não especificado');
      navigate('/upgrade');
      return;
    }
    
    fetchData();
  }, [planId, selectedBarbershopId]);

  const fetchBarbershop = async (): Promise<Barbershop | null> => {
    // First try selected barbershop
    if (selectedBarbershopId) {
      const { data } = await supabase
        .from('barbershops')
        .select('id, name')
        .eq('id', selectedBarbershopId)
        .single();
      
      if (data) return data;
    }

    // Fallback: try to get from context barbershops
    if (barbershops && barbershops.length > 0) {
      return { id: barbershops[0].id, name: barbershops[0].name };
    }

    // Fallback: fetch primary barbershop from user_barbershops
    if (user) {
      const { data } = await supabase
        .from('user_barbershops')
        .select('barbershop:barbershops(id, name)')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (data?.barbershop) {
        const bs = data.barbershop as unknown as Barbershop;
        return bs;
      }

      // Last resort: get any barbershop for this user
      const { data: anyBarbershop } = await supabase
        .from('user_barbershops')
        .select('barbershop:barbershops(id, name)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (anyBarbershop?.barbershop) {
        const bs = anyBarbershop.barbershop as unknown as Barbershop;
        return bs;
      }
    }

    return null;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setPaymentError(null);

      // Fetch plan details
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !planData) {
        console.error('Plan not found:', planError);
        toast.error('Plano não encontrado');
        navigate('/upgrade');
        return;
      }

      setPlan({
        ...planData,
        feature_flags: typeof planData.feature_flags === 'string' 
          ? JSON.parse(planData.feature_flags) 
          : planData.feature_flags || {}
      });

      // Fetch barbershop with fallback
      const foundBarbershop = await fetchBarbershop();
      setBarbershop(foundBarbershop);

      // Check payment configuration
      const { data: paymentConfig } = await supabase
        .from('global_payment_config')
        .select('mercadopago_enabled, stripe_enabled')
        .maybeSingle();

      const hasPaymentMethod = paymentConfig?.mercadopago_enabled || paymentConfig?.stripe_enabled;
      setPaymentAvailable(hasPaymentMethod || false);

      if (!hasPaymentMethod) {
        console.log('Payment not configured:', paymentConfig);
      }

    } catch (error) {
      console.error('Error fetching checkout data:', error);
      toast.error('Erro ao carregar dados do checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!plan || !barbershop || !user) {
      toast.error('Dados incompletos para o checkout');
      return;
    }

    try {
      setProcessing(true);
      setPaymentError(null);

      // Create payment preference via edge function
      const { data, error } = await supabase.functions.invoke('create-subscription-preference', {
        body: {
          planId: plan.id,
          planName: plan.name,
          planPrice: plan.price,
          barbershopId: barbershop.id,
          barbershopName: barbershop.name,
          userEmail: user.email,
          userId: user.id
        }
      });

      if (error) {
        console.error('Error creating payment preference:', error);
        setPaymentError('Erro ao criar preferência de pagamento. Tente novamente.');
        return;
      }

      // Check for specific error responses
      if (data?.error) {
        console.error('Payment API error:', data);
        if (data.code === 'PAYMENT_NOT_CONFIGURED') {
          setPaymentError('Sistema de pagamento não configurado. Use o trial gratuito ou contate o suporte.');
          setPaymentAvailable(false);
        } else {
          setPaymentError(data.message || data.error);
        }
        return;
      }

      if (!data?.init_point) {
        setPaymentError('Erro ao obter link de pagamento. Verifique as configurações.');
        return;
      }

      // Redirect to MercadoPago checkout
      window.location.href = data.init_point;
      
    } catch (error) {
      console.error('Checkout error:', error);
      setPaymentError('Erro inesperado. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartTrial = async () => {
    if (!plan || !barbershop || !user) {
      toast.error('Dados incompletos');
      return;
    }

    try {
      setStartingTrial(true);

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      // Create trial subscription
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          barbershop_id: barbershop.id,
          plan_id: plan.id,
          status: 'trialing',
          trial_ends_at: trialEndsAt.toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndsAt.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'barbershop_id'
        });

      if (error) {
        console.error('Error creating trial:', error);
        toast.error('Erro ao iniciar trial. Tente novamente.');
        return;
      }

      toast.success('Trial de 14 dias iniciado com sucesso!');
      navigate('/subscription/success?trial=true');

    } catch (error) {
      console.error('Trial error:', error);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setStartingTrial(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    if (planName === 'Essencial') return Zap;
    if (planName === 'Profissional') return Star;
    if (planName === 'Completo') return Crown;
    return Sparkles;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Plano Não Encontrado</p>
            <p className="text-muted-foreground mb-4">
              O plano selecionado não existe ou foi desativado.
            </p>
            <Button onClick={() => navigate('/upgrade')}>
              Voltar aos Planos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma Barbearia Encontrada</p>
            <p className="text-muted-foreground mb-4">
              Você precisa ter uma barbearia cadastrada para assinar um plano.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/barbershops')}>
                Cadastrar Barbearia
              </Button>
              <Button variant="ghost" onClick={() => navigate('/upgrade')}>
                Voltar aos Planos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const PlanIcon = getPlanIcon(plan.name);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/upgrade')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos Planos
          </Button>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Finalizar Assinatura
              </h1>
              <p className="text-muted-foreground">
                Revise os detalhes do seu plano e confirme o pagamento
              </p>
            </div>

            {/* Payment Not Available Alert */}
            {paymentAvailable === false && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Pagamento em Configuração</AlertTitle>
                <AlertDescription>
                  O sistema de pagamento está sendo configurado. Por enquanto, você pode começar 
                  com um trial gratuito de 14 dias e aproveitar todos os recursos do plano.
                </AlertDescription>
              </Alert>
            )}

            {/* Plan Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center",
                    "bg-gradient-to-br from-primary/20 to-primary/10"
                  )}>
                    <PlanIcon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      Plano {plan.name}
                      <Badge variant="outline" className="text-xs">
                        Mensal
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {plan.description || 'Plano de assinatura mensal'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                
                {/* Plan limits */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">Agendamentos</p>
                      <p className="font-medium">
                        {plan.max_appointments === -1 ? 'Ilimitado' : plan.max_appointments}/mês
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">Profissionais</p>
                      <p className="font-medium">
                        {plan.max_staff === -1 ? 'Ilimitado' : plan.max_staff}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">Unidades</p>
                      <p className="font-medium">
                        {plan.max_units === -1 ? 'Ilimitado' : plan.max_units || 1}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Barbershop info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Barbearia:</span>
                  <span className="font-medium">{barbershop.name}</span>
                </div>
              </CardContent>
            </Card>

            {/* Security badges */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-success" />
                <span>Pagamento 100% seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>MercadoPago</span>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plano {plan.name}</span>
                    <span>R$ {plan.price.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-semibold text-lg">
                  <span>Total mensal</span>
                  <span className="text-primary">R$ {plan.price.toFixed(2)}</span>
                </div>

                {paymentError && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Main action buttons */}
                <div className="space-y-3">
                  {paymentAvailable !== false && (
                    <Button 
                      onClick={handleCheckout}
                      disabled={processing || startingTrial}
                      className="w-full gap-2"
                      size="lg"
                    >
                      {processing ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Pagar com MercadoPago
                        </>
                      )}
                    </Button>
                  )}

                  <Button 
                    variant={paymentAvailable === false ? "default" : "outline"}
                    onClick={handleStartTrial}
                    disabled={processing || startingTrial}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {startingTrial ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Iniciando Trial...
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4" />
                        Começar Trial de 14 Dias (Grátis)
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Ao continuar, você concorda com nossos{' '}
                  <a href="/terms" className="underline hover:text-foreground">
                    Termos de Serviço
                  </a>{' '}
                  e{' '}
                  <a href="/privacy" className="underline hover:text-foreground">
                    Política de Privacidade
                  </a>
                </p>

                {/* Benefits list */}
                <Separator />
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Incluso no plano:</p>
                  <div className="space-y-1.5">
                    {[
                      'Acesso imediato após confirmação',
                      'Suporte por WhatsApp',
                      'Atualizações automáticas',
                      'Cancele quando quiser'
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-success" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCheckout;