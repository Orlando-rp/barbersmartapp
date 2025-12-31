import { motion } from 'framer-motion';
import { Check, Star, Zap, Crown, ArrowRight, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BundlePlan } from '@/hooks/useAddonModules';

interface ExtendedBundlePlan extends BundlePlan {
  features?: string[];
}

interface PackageComparisonProps {
  plans: ExtendedBundlePlan[];
  billingPeriod: 'monthly' | 'annual';
  onSelectPlan: (plan: ExtendedBundlePlan) => void;
  onCustomize: () => void;
}

const planIcons: Record<string, React.ElementType> = {
  essencial: Zap,
  profissional: Star,
  completo: Crown,
};

const planGradients: Record<string, string> = {
  essencial: 'from-blue-500/20 to-blue-600/10',
  profissional: 'from-amber-500/20 to-amber-600/10',
  completo: 'from-purple-500/20 to-purple-600/10',
};

const planBorderColors: Record<string, string> = {
  essencial: 'border-blue-500/30 hover:border-blue-500/50',
  profissional: 'border-amber-500/50 shadow-lg shadow-amber-500/10',
  completo: 'border-purple-500/30 hover:border-purple-500/50',
};

export const PackageComparison = ({
  plans,
  billingPeriod,
  onSelectPlan,
  onCustomize
}: PackageComparisonProps) => {
  const getDisplayPrice = (plan: BundlePlan) => {
    const basePrice = plan.price;
    return billingPeriod === 'annual' ? basePrice * 0.8 : basePrice;
  };

  const getFeaturesList = (plan: ExtendedBundlePlan): string[] => {
    // Use features array if provided (static data from LandingPage)
    if (plan.features && plan.features.length > 0) {
      return plan.features.slice(0, 6);
    }

    // Otherwise, derive from feature_flags (dynamic data from database)
    const features: string[] = [];
    const flags = (plan.feature_flags || {}) as unknown as Record<string, boolean>;

    if (flags['appointments']) features.push('Agendamentos ilimitados');
    if (flags['whatsapp_notifications']) features.push('Notificações WhatsApp');
    if (flags['whatsapp_chatbot']) features.push('Chatbot com IA');
    if (flags['marketing_campaigns']) features.push('Campanhas de marketing');
    if (flags['marketing_coupons']) features.push('Cupons de desconto');
    if (flags['loyalty_program']) features.push('Programa de fidelidade');
    if (flags['commissions']) features.push('Gestão de comissões');
    if (flags['advanced_reports']) features.push('Relatórios avançados');
    if (flags['predictive_analytics']) features.push('Análises preditivas');
    if (flags['multi_unit']) features.push('Multi-unidade');
    if (flags['priority_support']) features.push('Suporte prioritário');

    return features.slice(0, 6);
  };

  const customizeBenefits = [
    'Selecione módulos individuais',
    'Pague apenas pelo que usa',
    'Adicione recursos a qualquer momento',
    'Sem recursos desnecessários'
  ];

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, index) => {
          const Icon = planIcons[plan.slug] || Zap;
          const displayPrice = getDisplayPrice(plan);
          const features = getFeaturesList(plan);
          const isPopular = plan.slug === 'profissional';

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-gradient-to-br p-6 transition-all",
                planGradients[plan.slug] || 'from-white/10 to-white/5',
                planBorderColors[plan.slug] || 'border-white/10',
                isPopular && "scale-105 z-10"
              )}
            >
              {/* Highlight Badge */}
              {plan.highlight_text && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className={cn(
                    "shadow-lg",
                    isPopular 
                      ? "bg-amber-500 text-black" 
                      : "bg-white/20 text-white"
                  )}>
                    <Star className="w-3 h-3 mr-1" />
                    {plan.highlight_text}
                  </Badge>
                </div>
              )}

              {/* Icon & Name */}
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  isPopular ? "bg-amber-500" : "bg-white/10"
                )}>
                  <Icon className={cn(
                    "w-6 h-6",
                    isPopular ? "text-black" : "text-white"
                  )} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-sm text-white/50">{plan.description?.split('.')[0]}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-white/40">R$</span>
                  <span className="text-4xl font-bold text-white">
                    {displayPrice.toFixed(2).split('.')[0]}
                  </span>
                  <span className="text-lg text-white/60">,{displayPrice.toFixed(2).split('.')[1]}</span>
                  <span className="text-sm text-white/40">/mês</span>
                </div>
                {plan.discount_percentage > 0 && (
                  <div className="text-xs text-emerald-400 mt-1">
                    Economia de {plan.discount_percentage}% vs. módulos avulsos
                  </div>
                )}
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-2 mb-6 p-3 bg-white/5 rounded-xl">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {plan.max_staff === -1 ? '∞' : plan.max_staff}
                  </div>
                  <div className="text-xs text-white/50">Profissionais</div>
                </div>
                <div className="text-center border-x border-white/10">
                  <div className="text-lg font-bold text-white">
                    {plan.max_clients === -1 ? '∞' : plan.max_clients}
                  </div>
                  <div className="text-xs text-white/50">Clientes</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {plan.max_appointments_month === -1 ? '∞' : plan.max_appointments_month}
                  </div>
                  <div className="text-xs text-white/50">Agend./mês</div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-6 flex-1">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className={cn(
                      "w-4 h-4 shrink-0",
                      isPopular ? "text-amber-500" : "text-emerald-500"
                    )} />
                    <span className="text-white/80">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Trial Info */}
              <div className="text-center mb-4 py-2 px-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <span className="text-emerald-400 text-sm font-medium">
                  14 dias grátis
                </span>
              </div>

              {/* CTA */}
              <Button
                onClick={() => onSelectPlan(plan)}
                className={cn(
                  "w-full h-12 font-semibold transition-all",
                  isPopular
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
                    : "bg-white/10 hover:bg-white/20 text-white"
                )}
              >
                Testar Grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          );
        })}

        {/* Customize Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: plans.length * 0.1 }}
          className="relative flex flex-col rounded-2xl border-2 border-dashed border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-teal-600/10 p-6 transition-all hover:border-emerald-500/60"
        >
          {/* Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg">
              <Puzzle className="w-3 h-3 mr-1" />
              Flexível
            </Badge>
          </div>

          {/* Icon & Name */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Puzzle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Monte seu Plano</h3>
              <p className="text-sm text-white/50">Escolha apenas o que precisa</p>
            </div>
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-white/40">A partir de</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-white/40">R$</span>
              <span className="text-4xl font-bold text-white">29</span>
              <span className="text-lg text-white/60">,90</span>
              <span className="text-sm text-white/40">/mês</span>
            </div>
            <div className="text-xs text-emerald-400 mt-1">
              + módulos selecionados
            </div>
          </div>

          {/* Info Box */}
          <div className="mb-6 p-3 bg-white/5 rounded-xl">
            <div className="text-center">
              <div className="text-sm text-white/70">
                Combine recursos conforme sua necessidade
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2 mb-6 flex-1">
            {customizeBenefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                <span className="text-white/80">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            onClick={onCustomize}
            className="w-full h-12 font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white transition-all"
          >
            Personalizar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PackageComparison;
