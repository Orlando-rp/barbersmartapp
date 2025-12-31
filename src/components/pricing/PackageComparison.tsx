import { motion } from 'framer-motion';
import { Check, Star, Zap, Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BundlePlan } from '@/hooks/useAddonModules';

interface PackageComparisonProps {
  plans: BundlePlan[];
  billingPeriod: 'monthly' | 'annual';
  onSelectPlan: (plan: BundlePlan) => void;
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

  const getFeaturesList = (plan: BundlePlan): string[] => {
    const features: string[] = [];
    const flags = plan.feature_flags;

    if (flags.appointments) features.push('Agendamentos ilimitados');
    if (flags.whatsapp_notifications) features.push('Notificações WhatsApp');
    if (flags.whatsapp_chatbot) features.push('Chatbot com IA');
    if (flags.marketing_campaigns) features.push('Campanhas de marketing');
    if (flags.marketing_coupons) features.push('Cupons de desconto');
    if (flags.loyalty_program) features.push('Programa de fidelidade');
    if (flags.commissions) features.push('Gestão de comissões');
    if (flags.advanced_reports) features.push('Relatórios avançados');
    if (flags.predictive_analytics) features.push('Análises preditivas');
    if (flags.multi_unit) features.push('Multi-unidade');
    if (flags.priority_support) features.push('Suporte prioritário');

    return features.slice(0, 6); // Limit to 6 features for display
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-6">
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
                Começar agora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Customize Option */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center"
      >
        <p className="text-white/50 mb-3">
          Quer escolher apenas os recursos que você precisa?
        </p>
        <Button
          variant="outline"
          onClick={onCustomize}
          className="border-white/20 text-white hover:bg-white/10"
        >
          Monte seu plano personalizado
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
};

export default PackageComparison;
