import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CheckCircle, ArrowRight, PartyPopper, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const externalReference = searchParams.get('external_reference');
  
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'failed' | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    planName: string;
    barbershopName: string;
  } | null>(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      setLoading(true);

      // Parse external reference to get subscription details
      if (externalReference) {
        const parts = externalReference.split('_');
        if (parts.length >= 3) {
          const barbershopId = parts[1];
          const planId = parts[2];

          // Fetch plan and barbershop details
          const [planResult, barbershopResult] = await Promise.all([
            supabase.from('subscription_plans').select('name').eq('id', planId).single(),
            supabase.from('barbershops').select('name').eq('id', barbershopId).single()
          ]);

          if (planResult.data && barbershopResult.data) {
            setSubscriptionDetails({
              planName: planResult.data.name,
              barbershopName: barbershopResult.data.name
            });
          }
        }
      }

      // Determine payment status from URL params
      if (status === 'approved' || status === 'success') {
        setPaymentStatus('success');
        toast.success('Assinatura ativada com sucesso!');
      } else if (status === 'pending' || status === 'in_process') {
        setPaymentStatus('pending');
      } else {
        setPaymentStatus('failed');
      }

    } catch (error) {
      console.error('Error verifying payment:', error);
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Verificando pagamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-8">
          {paymentStatus === 'success' && (
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-10 w-10 text-success" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <PartyPopper className="h-8 w-8 text-primary animate-bounce" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Pagamento Confirmado!
                </h1>
                <p className="text-muted-foreground">
                  Sua assinatura foi ativada com sucesso.
                </p>
              </div>

              {subscriptionDetails && (
                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plano:</span>
                    <span className="font-medium">{subscriptionDetails.planName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Barbearia:</span>
                    <span className="font-medium">{subscriptionDetails.barbershopName}</span>
                  </div>
                </div>
              )}

              <Button onClick={() => navigate('/')} className="w-full gap-2">
                Ir para o Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {paymentStatus === 'pending' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                <Clock className="h-10 w-10 text-warning" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Pagamento Pendente
                </h1>
                <p className="text-muted-foreground">
                  Seu pagamento está sendo processado. Assim que for confirmado, 
                  sua assinatura será ativada automaticamente.
                </p>
              </div>

              {subscriptionDetails && (
                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plano:</span>
                    <span className="font-medium">{subscriptionDetails.planName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Barbearia:</span>
                    <span className="font-medium">{subscriptionDetails.barbershopName}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button onClick={() => navigate('/')} className="w-full gap-2">
                  Ir para o Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  Você receberá uma notificação quando o pagamento for confirmado.
                </p>
              </div>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Falha no Pagamento
                </h1>
                <p className="text-muted-foreground">
                  Não foi possível processar seu pagamento. Por favor, tente novamente 
                  ou escolha outro método de pagamento.
                </p>
              </div>

              <div className="space-y-3">
                <Button onClick={() => navigate('/upgrade')} className="w-full gap-2">
                  Tentar Novamente
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')} 
                  className="w-full"
                >
                  Voltar ao Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
