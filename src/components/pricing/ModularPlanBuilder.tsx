import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAddonModules, ADDON_CATEGORIES } from '@/hooks/useAddonModules';
import { AddonCard } from './AddonCard';
import { PriceSummary } from './PriceSummary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ModularPlanBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (selectedAddons: string[], billingPeriod: 'monthly' | 'annual') => void;
}

export const ModularPlanBuilder = ({
  isOpen,
  onClose,
  onContinue
}: ModularPlanBuilderProps) => {
  const {
    addons,
    addonsByCategory,
    loading,
    selectedAddons,
    toggleAddon,
    calculatePrices,
    findMatchingBundle
  } = useAddonModules();

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    Object.keys(ADDON_CATEGORIES)
  );

  const prices = useMemo(
    () => calculatePrices(selectedAddons),
    [calculatePrices, selectedAddons]
  );

  const matchingBundle = useMemo(
    () => findMatchingBundle(),
    [findMatchingBundle]
  );

  const selectedAddonObjects = useMemo(
    () => addons.filter(a => selectedAddons.includes(a.slug)),
    [addons, selectedAddons]
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          onClick={e => e.stopPropagation()}
          className="absolute inset-4 md:inset-8 bg-[#0a0a0a] rounded-2xl border border-white/10 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Package className="w-5 h-5 text-black" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Monte seu Plano</h2>
                <p className="text-sm text-white/50">Escolha os módulos que você precisa</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Addons Selection */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Billing Toggle */}
                  <div className="flex items-center justify-center gap-4 p-1.5 bg-white/5 rounded-xl w-fit mx-auto border border-white/10">
                    <button
                      onClick={() => setBillingPeriod('monthly')}
                      className={cn(
                        "px-6 py-2 rounded-lg text-sm font-medium transition-all",
                        billingPeriod === 'monthly'
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black"
                          : "text-white/60 hover:text-white"
                      )}
                    >
                      Mensal
                    </button>
                    <button
                      onClick={() => setBillingPeriod('annual')}
                      className={cn(
                        "px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                        billingPeriod === 'annual'
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black"
                          : "text-white/60 hover:text-white"
                      )}
                    >
                      Anual
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        billingPeriod === 'annual'
                          ? "bg-black/20 text-black"
                          : "bg-emerald-500/20 text-emerald-400"
                      )}>
                        -20%
                      </span>
                    </button>
                  </div>

                  {/* Base Plan Info */}
                  <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-white flex items-center gap-2">
                          <Package className="w-4 h-4 text-amber-500" />
                          Pacote Base (incluído)
                        </h4>
                        <p className="text-sm text-white/60 mt-1">
                          Agendamentos, clientes, serviços, equipe básica, financeiro e muito mais
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-amber-400">R$ 29,90</span>
                        <span className="text-sm text-white/40">/mês</span>
                      </div>
                    </div>
                  </div>

                  {/* Categories */}
                  {Object.entries(ADDON_CATEGORIES).map(([key, { label }]) => {
                    const categoryAddons = addonsByCategory[key] || [];
                    if (categoryAddons.length === 0) return null;

                    const isExpanded = expandedCategories.includes(key);

                    return (
                      <div key={key} className="space-y-3">
                        <button
                          onClick={() => toggleCategory(key)}
                          className="flex items-center justify-between w-full text-left group"
                        >
                          <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">
                            {label}
                          </h3>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-white/50" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-white/50" />
                          )}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                              {categoryAddons.map(addon => (
                                <AddonCard
                                  key={addon.id}
                                  addon={addon}
                                  selected={selectedAddons.includes(addon.slug)}
                                  onToggle={() => toggleAddon(addon.slug)}
                                />
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Price Summary - Sidebar on desktop, bottom on mobile */}
            <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 p-4 md:p-6 bg-white/[0.02]">
              <PriceSummary
                selectedAddons={selectedAddonObjects}
                prices={prices}
                billingPeriod={billingPeriod}
                matchingBundle={matchingBundle}
                onContinue={() => onContinue(selectedAddons, billingPeriod)}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModularPlanBuilder;
