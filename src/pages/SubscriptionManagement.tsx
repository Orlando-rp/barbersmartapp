import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  ArrowUpCircle, 
  XCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Receipt
} from 'lucide-react';

interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  payment_date: string;
  payment_method: string;
}

interface SubscriptionDetails {
  id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  plan: {
    id: string;
    name: string;
    price: number;
    billing_period: string;
    features: Record<string, boolean>;
  };
}

const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const { user, barbershops, selectedBarbershopId } = useAuth();
  const { subscription, loading: subscriptionLoading, refresh } = useSubscription();
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Usar a barbearia selecionada ou a primeira da lista
  const currentBarbershopId = selectedBarbershopId || barbershops[0]?.id;

  useEffect(() => {
    if (currentBarbershopId) {
      fetchSubscriptionDetails();
      fetchPaymentHistory();
    }
  }, [currentBarbershopId]);

  const fetchSubscriptionDetails = async () => {
    if (!currentBarbershopId) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          status,
          trial_ends_at,
          current_period_start,
          current_period_end,
          cancelled_at,
          subscription_plans (
            id,
            name,
            price,
            billing_period,
            features
          )
        `)
        .eq('barbershop_id', currentBarbershopId)
        .eq('status', 'active')
        .maybeSingle();

      if (error && !error.message.includes('does not exist')) {
        console.error('Erro ao buscar detalhes da assinatura:', error);
      }

      if (data) {
        setSubscriptionDetails({
          id: data.id,
          status: data.status,
          trial_ends_at: data.trial_ends_at,
          current_period_start: data.current_period_start,
          current_period_end: data.current_period_end,
          cancelled_at: data.cancelled_at,
          plan: data.subscription_plans as any,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!currentBarbershopId) return;

    try {
      // Buscar histórico de pagamentos da tabela de transações ou criar uma tabela específica
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('barbershop_id', currentBarbershopId)
        .order('payment_date', { ascending: false })
        .limit(10);

      if (!error && data) {
        setPaymentHistory(data);
      }
    } catch (error) {
      // Tabela pode não existir ainda
      console.log('Histórico de pagamentos não disponível');
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscriptionDetails?.id) return;

    setCancelling(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', subscriptionDetails.id);

      if (error) throw error;

      toast.success('Assinatura cancelada com sucesso');
      await refresh();
      await fetchSubscriptionDetails();
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      toast.error('Erro ao cancelar assinatura');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Ativa</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> Período de Teste</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Cancelada</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Pagamento Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Assinatura</h1>
          <p className="text-muted-foreground">Visualize e gerencie sua assinatura atual</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>

      {/* Plano Atual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {subscriptionDetails?.plan?.name || subscription?.planName || 'Plano Gratuito'}
                </CardTitle>
                <CardDescription>Seu plano atual</CardDescription>
              </div>
            </div>
            {subscriptionDetails && getStatusBadge(subscriptionDetails.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {subscriptionDetails ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-sm">Valor</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatCurrency(subscriptionDetails.plan?.price || 0)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{subscriptionDetails.plan?.billing_period === 'monthly' ? 'mês' : 'ano'}
                    </span>
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Próxima cobrança</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatDate(subscriptionDetails.current_period_end)}
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Membro desde</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatDate(subscriptionDetails.current_period_start)}
                  </p>
                </div>
              </div>

              {subscription?.isTrialing && subscription.trialEndsAt && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <p className="text-sm">
                      <strong>Período de teste:</strong> Seu teste gratuito termina em{' '}
                      {formatDate(subscription.trialEndsAt.toISOString())}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => navigate('/upgrade')}
                  className="flex items-center gap-2"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Fazer Upgrade
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="text-destructive hover:text-destructive"
                      disabled={subscriptionDetails.status === 'cancelled'}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar Assinatura
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja cancelar sua assinatura? Você perderá acesso aos recursos premium 
                        ao final do período de cobrança atual ({formatDate(subscriptionDetails.current_period_end)}).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Manter Assinatura</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelSubscription}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={cancelling}
                      >
                        {cancelling ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Confirmar Cancelamento
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Crown className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Nenhuma assinatura ativa</h3>
                <p className="text-muted-foreground">
                  Escolha um plano para desbloquear recursos premium
                </p>
              </div>
              <Button onClick={() => navigate('/upgrade')} className="mt-4">
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Ver Planos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Pagamentos */}
      {paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Histórico de Pagamentos</CardTitle>
                <CardDescription>Últimos pagamentos realizados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell className="capitalize">{payment.payment_method}</TableCell>
                    <TableCell>
                      {payment.status === 'approved' ? (
                        <Badge className="bg-green-500/10 text-green-500">Aprovado</Badge>
                      ) : (
                        <Badge variant="secondary">{payment.status}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionManagement;
