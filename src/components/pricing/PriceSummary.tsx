import { motion } from 'framer-motion';
import { Check, Sparkles, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddonModule, BASE_PLAN_PRICE, BundlePlan } from '@/hooks/useAddonModules';

interface PriceSummaryProps {
  selectedAddons: AddonModule[];
  prices: {
    monthly: number;
    annual: number;
    monthlyFromAnnual: number;
    savings: number;
    savingsPercentage: number;
  };
  billingPeriod: 'monthly' | 'annual';
  matchingBundle?: BundlePlan | null;
  onContinue: () => void;
  className?: string;
}

export const PriceSummary = ({
  selectedAddons,
  prices,
  billingPeriod,
  matchingBundle,
  onContinue,
  className
}: PriceSummaryProps) => {
  const displayPrice = billingPeriod === 'annual' ? prices.monthlyFromAnnual : prices.monthly;
  const hasAddons = selectedAddons.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Resumo do Plano</h3>
        {billingPeriod === 'annual' && (
          <div className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
            <TrendingDown className="w-3 h-3" />
            <span>-{prices.savingsPercentage}%</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-3 mb-6">
        {/* Base Plan */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-amber-500" />
            <span className="text-white/80">Pacote Base</span>
          </div>
          <span className="text-white/60">R$ {BASE_PLAN_PRICE.toFixed(2).replace('.', ',')}</span>
        </div>

        {/* Selected Addons */}
        {selectedAddons.map(addon => (
          <div key={addon.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-amber-500" />
              <span className="text-white/80">{addon.name}</span>
            </div>
            <span className="text-white/60">R$ {addon.price.toFixed(2).replace('.', ',')}</span>
          </div>
        ))}

        {!hasAddons && (
          <p className="text-sm text-white/40 italic">
            Selecione módulos adicionais para personalizar seu plano
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-white/10 my-4" />

      {/* Total */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between">
          <span className="text-white/60 text-sm">Total {billingPeriod === 'annual' ? 'mensal' : ''}</span>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-white/40">R$</span>
              <span className="text-3xl font-bold text-white">
                {displayPrice.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-sm text-white/40">/mês</span>
            </div>
            {billingPeriod === 'annual' && (
              <div className="text-xs text-emerald-400">
                Economia de R$ {prices.savings.toFixed(2).replace('.', ',')} /ano
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bundle Suggestion */}
      {matchingBundle && matchingBundle.price < prices.monthly && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-400">
                Pacote {matchingBundle.name} é mais vantajoso!
              </p>
              <p className="text-xs text-white/60 mt-1">
                Por R$ {matchingBundle.price.toFixed(2).replace('.', ',')} você tem tudo isso e mais.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* CTA Button */}
      <Button
        onClick={onContinue}
        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold h-12"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Continuar com este plano
      </Button>

      {/* Footer note */}
      <p className="text-center text-xs text-white/40 mt-4">
        Cancele quando quiser. Sem multa ou fidelidade.
      </p>
    </motion.div>
  );
};

export default PriceSummary;
