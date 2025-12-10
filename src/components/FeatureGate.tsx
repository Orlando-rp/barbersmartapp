import { ReactNode } from "react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { PlanFeatures } from "@/components/saas/PlanFeaturesSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureGateProps {
  /** The feature key to check */
  feature: keyof PlanFeatures;
  /** Content to render if feature is enabled */
  children: ReactNode;
  /** Optional fallback when feature is disabled (default shows upgrade prompt) */
  fallback?: ReactNode;
  /** If true, hides the component entirely instead of showing fallback */
  hideWhenDisabled?: boolean;
  /** Custom message for the upgrade prompt */
  upgradeMessage?: string;
}

/**
 * Component that conditionally renders children based on feature flag status.
 * Shows an upgrade prompt by default when feature is not available.
 */
export const FeatureGate = ({ 
  feature, 
  children, 
  fallback,
  hideWhenDisabled = false,
  upgradeMessage,
}: FeatureGateProps) => {
  const { hasFeature, loading, planName } = useFeatureFlags();
  const navigate = useNavigate();

  if (loading) {
    return null; // Or a skeleton loader
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (hideWhenDisabled) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  const featureLabels: Record<keyof PlanFeatures, string> = {
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

  return (
    <Card className="border-dashed border-warning/50 bg-warning/5">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center mb-2">
          <Lock className="h-6 w-6 text-warning" />
        </div>
        <CardTitle className="text-lg">
          {featureLabels[feature] || 'Funcionalidade Premium'}
        </CardTitle>
        <CardDescription>
          {upgradeMessage || `Esta funcionalidade não está disponível no seu plano atual (${planName || 'Free'}).`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button 
          variant="default" 
          className="gap-2"
          onClick={() => navigate('/upgrade')}
        >
          <Sparkles className="h-4 w-4" />
          Fazer Upgrade
        </Button>
      </CardContent>
    </Card>
  );
};

interface RequireFeatureProps {
  /** The feature key to check */
  feature: keyof PlanFeatures;
  /** Content to render if feature is enabled */
  children: ReactNode;
}

/**
 * Simple wrapper that only renders children if feature is enabled.
 * Does not show any fallback - use FeatureGate for upgrade prompts.
 */
export const RequireFeature = ({ feature, children }: RequireFeatureProps) => {
  const { hasFeature, loading } = useFeatureFlags();

  if (loading || !hasFeature(feature)) {
    return null;
  }

  return <>{children}</>;
};
