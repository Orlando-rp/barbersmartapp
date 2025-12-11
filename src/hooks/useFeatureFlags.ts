import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { PlanFeatures, defaultPlanFeatures } from "@/components/saas/PlanFeaturesSelector";

// All features enabled (for super admin)
const allFeaturesEnabled: PlanFeatures = {
  appointments: true,
  clients: true,
  services: true,
  staff_basic: true,
  finance_basic: true,
  waitlist: true,
  public_booking: true,
  business_hours: true,
  staff_advanced: true,
  staff_earnings: true,
  staff_multi_unit: true,
  finance_advanced: true,
  commissions: true,
  export_data: true,
  basic_reports: true,
  advanced_reports: true,
  predictive_analytics: true,
  whatsapp_notifications: true,
  whatsapp_chat: true,
  whatsapp_chatbot: true,
  marketing_campaigns: true,
  marketing_coupons: true,
  loyalty_program: true,
  reviews: true,
  client_history: true,
  multi_unit: true,
  multi_unit_reports: true,
  white_label: true,
  custom_domain: true,
  audit_logs: true,
  priority_support: true,
  api_access: true,
};

interface UseFeatureFlagsReturn {
  features: PlanFeatures;
  loading: boolean;
  hasFeature: (feature: keyof PlanFeatures) => boolean;
  planName: string | null;
  refreshFeatures: () => Promise<void>;
}

export const useFeatureFlags = (): UseFeatureFlagsReturn => {
  const { selectedBarbershopId, userRole } = useAuth();
  const [features, setFeatures] = useState<PlanFeatures>(defaultPlanFeatures);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeatures = useCallback(async () => {
    // Super admins have access to all features
    if (userRole === 'super_admin') {
      setFeatures(allFeaturesEnabled);
      setPlanName('Super Admin');
      setLoading(false);
      return;
    }

    if (!selectedBarbershopId) {
      setFeatures(defaultPlanFeatures);
      setPlanName(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch barbershop's subscription and plan features
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          status,
          subscription_plans(
            name,
            feature_flags
          )
        `)
        .eq('barbershop_id', selectedBarbershopId)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) {
        console.log('Error fetching subscription:', subError.message);
        setFeatures(defaultPlanFeatures);
        setPlanName(null);
        setLoading(false);
        return;
      }

      if (subscription?.subscription_plans) {
        const plan = subscription.subscription_plans as any;
        setPlanName(plan.name || 'Free');
        
        // Parse feature_flags from plan
        if (plan.feature_flags) {
          const flags = typeof plan.feature_flags === 'string' 
            ? JSON.parse(plan.feature_flags) 
            : plan.feature_flags;
          
          setFeatures({
            ...defaultPlanFeatures,
            ...flags,
          });
        } else {
          setFeatures(defaultPlanFeatures);
        }
      } else {
        // No active subscription, use default (free) features
        setFeatures(defaultPlanFeatures);
        setPlanName('Free');
      }
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      setFeatures(defaultPlanFeatures);
      setPlanName(null);
    } finally {
      setLoading(false);
    }
  }, [selectedBarbershopId, userRole]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const hasFeature = useCallback((feature: keyof PlanFeatures): boolean => {
    return features[feature] === true;
  }, [features]);

  const refreshFeatures = useCallback(async () => {
    setLoading(true);
    await fetchFeatures();
  }, [fetchFeatures]);

  return {
    features,
    loading,
    hasFeature,
    planName,
    refreshFeatures,
  };
};
