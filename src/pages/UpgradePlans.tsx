import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  Check, 
  X, 
  Sparkles, 
  Crown, 
  Zap,
  Building2,
  MessageSquare,
  Bot,
  BarChart3,
  Megaphone,
  Gift,
  Palette,
  Users,
  Star
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { PlanFeatures, defaultPlanFeatures } from "@/components/saas/PlanFeaturesSelector";
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
  feature_flags: PlanFeatures;
}

const featureDefinitions = [
  { key: 'whatsapp_notifications', label: 'Notificações WhatsApp', icon: MessageSquare, description: 'Lembretes e confirmações automáticas' },
  { key: 'whatsapp_chatbot', label: 'Chatbot IA', icon: Bot, description: 'Agendamento automático via WhatsApp' },
  { key: 'marketing_campaigns', label: 'Campanhas de Marketing', icon: Megaphone, description: 'Criar e enviar campanhas promocionais' },
  { key: 'marketing_coupons', label: 'Cupons de Desconto', icon: Gift, description: 'Gerenciar cupons e promoções' },
  { key: 'advanced_reports', label: 'Relatórios Avançados', icon: BarChart3, description: 'Métricas detalhadas e exportação' },
  { key: 'predictive_analytics', label: 'Análises Preditivas', icon: BarChart3, description: 'Previsões de receita e tendências' },
  { key: 'multi_unit', label: 'Multi-unidade', icon: Building2, description: 'Gerenciar múltiplas barbearias' },
  { key: 'white_label', label: 'White Label', icon: Palette, description: 'Personalização de branding' },
  { key: 'priority_support', label: 'Suporte Prioritário', icon: Users, description: 'Atendimento preferencial' },
] as const;

const UpgradePlans = () => {
  const { selectedBarbershopId } = useAuth();
  const { planName: currentPlanName } = useFeatureFlags();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, [selectedBarbershopId]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      // Fetch all plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (plansError) throw plansError;

      // Parse feature_flags for each plan
      const parsedPlans = (plansData || []).map(plan => ({
        ...plan,
        feature_flags: plan.feature_flags 
          ? (typeof plan.feature_flags === 'string' ? JSON.parse(plan.feature_flags) : plan.feature_flags)
          : defaultPlanFeatures
      }));

      setPlans(parsedPlans);

      // Fetch current subscription
      if (selectedBarbershopId) {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan_id')
          .eq('barbershop_id', selectedBarbershopId)
          .eq('status', 'active')
          .maybeSingle();

        if (subscription) {
          setCurrentPlanId(subscription.plan_id);
        }
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.id === currentPlanId) return;
    
    // For now, show interest - in a real implementation, this would integrate with a payment gateway
    toast.success(
      `Interesse no plano ${plan.name} registrado! Nossa equipe entrará em contato.`,
      { duration: 5000 }
    );
  };

  const getPlanIcon = (index: number) => {
    const icons = [Zap, Star, Crown, Sparkles];
    return icons[index % icons.length];
  };

  const getPlanColor = (index: number) => {
    const colors = [
      'from-muted/50 to-muted/30',
      'from-primary/20 to-primary/10',
      'from-warning/20 to-warning/10',
      'from-success/20 to-success/10',
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3">
            Escolha o Plano Ideal
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Desbloqueie todo o potencial da sua barbearia com nossos planos personalizados
          </p>
          {currentPlanName && (
            <Badge variant="outline" className="mt-3 sm:mt-4">
              Plano atual: <span className="font-semibold ml-1">{currentPlanName}</span>
            </Badge>
          )}
        </div>

        {/* Plans Grid */}
        {plans.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">Nenhum plano disponível no momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {plans.map((plan, index) => {
              const PlanIcon = getPlanIcon(index);
              const isCurrentPlan = plan.id === currentPlanId;
              const isPopular = index === 1; // Mark second plan as popular
              
              return (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "relative flex flex-col transition-all duration-300 hover:shadow-lg",
                    isCurrentPlan && "ring-2 ring-primary",
                    isPopular && "border-primary"
                  )}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground shadow-md">
                        <Star className="h-3 w-3 mr-1" />
                        Mais Popular
                      </Badge>
                    </div>
                  )}

                  {/* Current Plan Badge */}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-3">
                      <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
                        <Check className="h-3 w-3 mr-1" />
                        Atual
                      </Badge>
                    </div>
                  )}

                  <CardHeader className={cn(
                    "text-center rounded-t-lg bg-gradient-to-br",
                    getPlanColor(index)
                  )}>
                    <div className="mx-auto w-12 h-12 rounded-full bg-background/80 flex items-center justify-center mb-2">
                      <PlanIcon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg sm:text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm line-clamp-2">
                      {plan.description || 'Plano de assinatura'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 pt-4 sm:pt-6">
                    {/* Price */}
                    <div className="text-center mb-4 sm:mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-xs sm:text-sm text-muted-foreground">R$</span>
                        <span className="text-3xl sm:text-4xl font-bold text-foreground">
                          {plan.price?.toFixed(0) || '0'}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/mês</span>
                      </div>
                    </div>

                    {/* Limits */}
                    <div className="space-y-2 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-border">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Agendamentos/mês</span>
                        <span className="font-medium">
                          {plan.max_appointments === -1 ? 'Ilimitado' : plan.max_appointments}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Profissionais</span>
                        <span className="font-medium">
                          {plan.max_staff === -1 ? 'Ilimitado' : plan.max_staff}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Unidades</span>
                        <span className="font-medium">
                          {plan.max_units === -1 ? 'Ilimitado' : plan.max_units}
                        </span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-2">
                      {featureDefinitions.map(feature => {
                        const hasFeature = plan.feature_flags?.[feature.key as keyof PlanFeatures];
                        return (
                          <div 
                            key={feature.key}
                            className={cn(
                              "flex items-center gap-2 text-xs sm:text-sm",
                              !hasFeature && "opacity-50"
                            )}
                          >
                            {hasFeature ? (
                              <Check className="h-4 w-4 text-success shrink-0" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className={hasFeature ? "text-foreground" : "text-muted-foreground line-through"}>
                              {feature.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4">
                    <Button 
                      className="w-full gap-2"
                      variant={isCurrentPlan ? "outline" : isPopular ? "default" : "secondary"}
                      disabled={isCurrentPlan}
                      onClick={() => handleSelectPlan(plan)}
                    >
                      {isCurrentPlan ? (
                        <>
                          <Check className="h-4 w-4" />
                          Plano Atual
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Selecionar Plano
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Comparison Table - Desktop */}
        {plans.length > 0 && (
          <Card className="hidden lg:block overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Comparação Detalhada</CardTitle>
              <CardDescription>Compare todos os recursos disponíveis em cada plano</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-4 font-medium text-sm">Recurso</th>
                      {plans.map(plan => (
                        <th 
                          key={plan.id} 
                          className={cn(
                            "text-center p-4 font-medium text-sm min-w-[120px]",
                            plan.id === currentPlanId && "bg-primary/5"
                          )}
                        >
                          {plan.name}
                          {plan.id === currentPlanId && (
                            <Badge variant="outline" className="ml-2 text-xs">Atual</Badge>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Limits */}
                    <tr className="border-b border-border">
                      <td className="p-4 text-sm text-muted-foreground">Agendamentos/mês</td>
                      {plans.map(plan => (
                        <td key={plan.id} className={cn(
                          "text-center p-4 text-sm font-medium",
                          plan.id === currentPlanId && "bg-primary/5"
                        )}>
                          {plan.max_appointments === -1 ? 'Ilimitado' : plan.max_appointments}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-4 text-sm text-muted-foreground">Profissionais</td>
                      {plans.map(plan => (
                        <td key={plan.id} className={cn(
                          "text-center p-4 text-sm font-medium",
                          plan.id === currentPlanId && "bg-primary/5"
                        )}>
                          {plan.max_staff === -1 ? 'Ilimitado' : plan.max_staff}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-4 text-sm text-muted-foreground">Unidades</td>
                      {plans.map(plan => (
                        <td key={plan.id} className={cn(
                          "text-center p-4 text-sm font-medium",
                          plan.id === currentPlanId && "bg-primary/5"
                        )}>
                          {plan.max_units === -1 ? 'Ilimitado' : plan.max_units}
                        </td>
                      ))}
                    </tr>

                    {/* Features */}
                    {featureDefinitions.map(feature => (
                      <tr key={feature.key} className="border-b border-border">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <feature.icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{feature.label}</div>
                              <div className="text-xs text-muted-foreground">{feature.description}</div>
                            </div>
                          </div>
                        </td>
                        {plans.map(plan => {
                          const hasFeature = plan.feature_flags?.[feature.key as keyof PlanFeatures];
                          return (
                            <td key={plan.id} className={cn(
                              "text-center p-4",
                              plan.id === currentPlanId && "bg-primary/5"
                            )}>
                              {hasFeature ? (
                                <Check className="h-5 w-5 text-success mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Price Row */}
                    <tr className="bg-muted/30">
                      <td className="p-4 text-sm font-medium">Preço Mensal</td>
                      {plans.map(plan => (
                        <td key={plan.id} className={cn(
                          "text-center p-4",
                          plan.id === currentPlanId && "bg-primary/5"
                        )}>
                          <span className="text-lg font-bold">R$ {plan.price?.toFixed(0) || '0'}</span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Section */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-6 sm:py-8 text-center">
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Precisa de um plano personalizado?</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Entre em contato conosco para criar um plano sob medida para sua barbearia
            </p>
            <Button variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Falar com Especialista
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default UpgradePlans;
