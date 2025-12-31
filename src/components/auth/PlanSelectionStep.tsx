import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Check, 
  Zap, 
  Star, 
  Crown, 
  Sparkles,
  ArrowLeft,
  Gift,
  Building2,
  Users,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanFeatures, defaultPlanFeatures } from '@/components/saas/PlanFeaturesSelector';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  max_appointments_month: number;
  max_staff: number;
  max_clients: number;
  max_units: number;
  feature_flags: PlanFeatures;
  is_bundle?: boolean;
  highlight_text?: string;
  discount_percentage?: number;
}

interface PlanSelectionStepProps {
  selectedPlanId: string | null;
  onSelectPlan: (planId: string, planSlug: string) => void;
  onBack: () => void;
  onComplete: () => void;
  loading?: boolean;
  preSelectedPlanSlug?: string | null;
}

const featureLabels: Record<string, string> = {
  whatsapp_notifications: 'Notificações WhatsApp',
  whatsapp_chatbot: 'Chatbot IA',
  marketing_campaigns: 'Campanhas de Marketing',
  marketing_coupons: 'Cupons de Desconto',
  advanced_reports: 'Relatórios Avançados',
  predictive_analytics: 'Análises Preditivas',
  multi_unit: 'Multi-unidade',
  white_label: 'White Label',
  priority_support: 'Suporte Prioritário',
};

const getPlanIcon = (planName: string) => {
  if (planName === 'Essencial' || planName.toLowerCase().includes('essencial')) return Zap;
  if (planName === 'Profissional' || planName.toLowerCase().includes('profissional')) return Star;
  if (planName === 'Completo' || planName.toLowerCase().includes('completo')) return Crown;
  return Sparkles;
};

const getPlanGradient = (planName: string) => {
  if (planName === 'Essencial' || planName.toLowerCase().includes('essencial')) 
    return 'from-blue-500/20 to-blue-600/10';
  if (planName === 'Profissional' || planName.toLowerCase().includes('profissional')) 
    return 'from-amber-500/20 to-amber-600/10';
  if (planName === 'Completo' || planName.toLowerCase().includes('completo')) 
    return 'from-purple-500/20 to-purple-600/10';
  return 'from-muted/50 to-muted/30';
};

const getPlanBorder = (planName: string, isSelected: boolean) => {
  if (isSelected) return 'ring-2 ring-primary border-primary';
  if (planName === 'Profissional' || planName.toLowerCase().includes('profissional')) 
    return 'border-amber-500/50';
  return 'border-border';
};

export const PlanSelectionStep = ({
  selectedPlanId,
  onSelectPlan,
  onBack,
  onComplete,
  loading = false,
  preSelectedPlanSlug
}: PlanSelectionStepProps) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  // Pre-select plan from URL parameter
  useEffect(() => {
    if (preSelectedPlanSlug && plans.length > 0 && !selectedPlanId) {
      const matchingPlan = plans.find(
        p => p.slug.toLowerCase() === preSelectedPlanSlug.toLowerCase()
      );
      if (matchingPlan) {
        onSelectPlan(matchingPlan.id, matchingPlan.slug);
      }
    }
  }, [preSelectedPlanSlug, plans, selectedPlanId, onSelectPlan]);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_bundle', true)
        .eq('active', true)
        .order('price', { ascending: true });

      if (error) throw error;

      const parsedPlans = (data || []).map(plan => ({
        ...plan,
        feature_flags: plan.feature_flags 
          ? (typeof plan.feature_flags === 'string' ? JSON.parse(plan.feature_flags) : plan.feature_flags)
          : defaultPlanFeatures
      }));

      setPlans(parsedPlans);
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const getFeaturesList = (plan: Plan): string[] => {
    const features: string[] = [];
    if (plan.feature_flags) {
      Object.entries(plan.feature_flags).forEach(([key, value]) => {
        if (value && featureLabels[key]) {
          features.push(featureLabels[key]);
        }
      });
    }
    return features.slice(0, 6); // Limit to 6 features
  };

  if (loadingPlans) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
          <Gift className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Escolha seu plano</h3>
        <p className="text-sm text-muted-foreground">
          Teste grátis por 14 dias. Cancele quando quiser.
        </p>
        <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <Gift className="h-3 w-3 mr-1" />
          14 dias de teste grátis
        </Badge>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-3">
        {plans.map((plan, index) => {
          const PlanIcon = getPlanIcon(plan.name);
          const isSelected = selectedPlanId === plan.id;
          const isPopular = plan.name === 'Profissional' || plan.name.toLowerCase().includes('profissional');
          const features = getFeaturesList(plan);

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  "relative cursor-pointer transition-all duration-200 hover:shadow-md",
                  getPlanBorder(plan.name, isSelected),
                  isSelected && "bg-primary/5"
                )}
                onClick={() => onSelectPlan(plan.id, plan.slug)}
              >
                {/* Popular Badge */}
                {isPopular && !isSelected && (
                  <div className="absolute -top-2 left-4">
                    <Badge className="bg-amber-500 text-black text-xs">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Mais Popular
                    </Badge>
                  </div>
                )}

                {/* Selected Badge */}
                {isSelected && (
                  <div className="absolute -top-2 right-4">
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Selecionado
                    </Badge>
                  </div>
                )}

                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                      "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                      getPlanGradient(plan.name)
                    )}>
                      <PlanIcon className="h-6 w-6 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-base">{plan.name}</h4>
                        <div className="text-right">
                          <span className="text-lg font-bold">R$ {plan.price.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">/mês</span>
                        </div>
                      </div>
                      
                      {plan.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                          {plan.description}
                        </p>
                      )}

                      {/* Limits */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {plan.max_staff === -1 ? 'Ilimitado' : `${plan.max_staff} prof.`}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {plan.max_appointments_month === -1 ? 'Ilimitado' : `${plan.max_appointments_month}/mês`}
                        </Badge>
                        {(plan.max_units || 1) > 1 && (
                          <Badge variant="outline" className="text-xs">
                            <Building2 className="h-3 w-3 mr-1" />
                            {plan.max_units === -1 ? 'Ilimitado' : `${plan.max_units} unid.`}
                          </Badge>
                        )}
                      </div>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1">
                        {features.slice(0, 4).map((feature, idx) => (
                          <span key={idx} className="text-xs text-muted-foreground flex items-center">
                            <Check className="h-3 w-3 text-green-500 mr-1" />
                            {feature}
                            {idx < Math.min(features.length, 4) - 1 && <span className="mx-1">•</span>}
                          </span>
                        ))}
                        {features.length > 4 && (
                          <span className="text-xs text-primary">+{features.length - 4} mais</span>
                        )}
                      </div>
                    </div>

                    {/* Selection indicator */}
                    <div className={cn(
                      "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      isSelected 
                        ? "bg-primary border-primary" 
                        : "border-muted-foreground/30"
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Info */}
      <div className="text-center text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
        <p>
          💳 Você <strong>não será cobrado</strong> durante os 14 dias de teste.
          <br />
          Após o período, escolha manter o plano ou fazer downgrade.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> 
          Voltar
        </Button>
        <Button 
          type="button" 
          className="flex-1" 
          onClick={onComplete}
          disabled={loading || !selectedPlanId}
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Criando conta...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Começar Trial Grátis
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
