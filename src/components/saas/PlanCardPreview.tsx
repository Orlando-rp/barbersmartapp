import { useState } from 'react';
import { Check, Star } from 'lucide-react';
import { PlanFeatures } from './PlanFeaturesSelector';

interface PlanCardPreviewProps {
  name: string;
  description: string;
  price: number;
  billingPeriod: string;
  maxStaff: number;
  highlightText?: string;
  discountPercentage?: number;
  featureFlags?: PlanFeatures;
  customFeatures?: string;
}

const getFeaturesList = (featureFlags?: PlanFeatures, maxStaff?: number, customFeatures?: string): string[] => {
  const features: string[] = [];
  
  // Add limits as features
  if (maxStaff === -1) {
    features.push('Profissionais ilimitados');
  } else if (maxStaff && maxStaff > 0) {
    features.push(`Até ${maxStaff} profissionais`);
  }
  
  // Add feature flags
  if (featureFlags) {
    if (featureFlags.whatsapp_notifications) features.push('Notificações WhatsApp');
    if (featureFlags.whatsapp_chatbot) features.push('Chatbot IA WhatsApp');
    if (featureFlags.finance_advanced) features.push('Gestão financeira completa');
    if (featureFlags.marketing_campaigns) features.push('Campanhas de marketing');
    if (featureFlags.advanced_reports) features.push('Relatórios avançados');
    if (featureFlags.predictive_analytics) features.push('Análises preditivas');
    if (featureFlags.multi_unit) features.push('Múltiplas unidades');
    if (featureFlags.loyalty_program) features.push('Programa de fidelidade');
    if (featureFlags.priority_support) features.push('Suporte prioritário');
    if (featureFlags.commissions) features.push('Comissões automáticas');
  }
  
  // Add custom features
  if (customFeatures) {
    const customList = customFeatures.split('\n').filter(f => f.trim());
    features.push(...customList.filter(f => !features.includes(f)));
  }
  
  return features.slice(0, 6);
};

export const PlanCardPreview = ({
  name,
  description,
  price,
  billingPeriod,
  maxStaff,
  highlightText,
  discountPercentage,
  featureFlags,
  customFeatures
}: PlanCardPreviewProps) => {
  const [previewPeriod, setPreviewPeriod] = useState<'monthly' | 'annual'>('monthly');
  const features = getFeaturesList(featureFlags, maxStaff, customFeatures);
  const hasHighlight = !!highlightText;

  // Calculate price based on preview period
  const displayPrice = previewPeriod === 'annual' && discountPercentage 
    ? price * (1 - discountPercentage / 100) 
    : price;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Star className="h-4 w-4 text-warning" />
          Preview na Landing Page
        </h3>
        
        {/* Period Toggle */}
        <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setPreviewPeriod('monthly')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              previewPeriod === 'monthly' 
                ? 'bg-warning text-warning-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setPreviewPeriod('annual')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
              previewPeriod === 'annual' 
                ? 'bg-warning text-warning-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Anual
            {discountPercentage && discountPercentage > 0 && (
              <span className={`text-[10px] px-1 py-0.5 rounded ${
                previewPeriod === 'annual' 
                  ? 'bg-black/20' 
                  : 'bg-success/20 text-success'
              }`}>
                -{discountPercentage}%
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Landing Page Preview (Dark Theme) */}
      <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/10">
        <p className="text-[10px] text-white/40 mb-2 uppercase tracking-wide">
          Preview {previewPeriod === 'annual' ? '(Anual)' : '(Mensal)'}
        </p>
        
        <div 
          className={`relative rounded-2xl p-5 backdrop-blur-xl transition-all ${
            hasHighlight 
              ? 'bg-gradient-to-b from-amber-500/20 to-transparent border-2 border-amber-500/50 shadow-[0_0_40px_rgba(212,168,83,0.15)]' 
              : 'bg-white/5 border border-white/10'
          }`}
        >
          {/* Highlight Badge */}
          {hasHighlight && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-semibold whitespace-nowrap">
              {highlightText}
            </div>
          )}
          
          <div className="text-center mb-4 pt-2">
            <h4 className="text-base font-semibold text-white mb-1">
              {name || 'Nome do Plano'}
            </h4>
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-2xl font-bold text-white">
                R$ {displayPrice.toFixed(0)}
              </span>
              <span className="text-white/60 text-xs">
                /{previewPeriod === 'annual' ? 'mês' : 'mês'}
              </span>
              {previewPeriod === 'annual' && discountPercentage && discountPercentage > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  -{discountPercentage}%
                </span>
              )}
            </div>
            <p className="text-white/50 text-xs">
              {description || 'Descrição do plano'}
            </p>
          </div>
          
          <ul className="space-y-2 mb-4">
            {features.length > 0 ? (
              features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-white/70">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-xs">{feature}</span>
                </li>
              ))
            ) : (
              <li className="text-white/40 text-xs text-center py-2">
                Nenhum recurso selecionado
              </li>
            )}
          </ul>
          
          <button 
            type="button"
            className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
              hasHighlight 
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black' 
                : 'bg-white/10 text-white border border-white/20'
            }`}
          >
            Começar Agora
          </button>
        </div>
      </div>
    </div>
  );
};
