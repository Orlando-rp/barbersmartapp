import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PlanFeatures } from '@/components/saas/PlanFeaturesSelector';

export interface AddonModule {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  features_enabled: Partial<PlanFeatures>;
  category: string;
  icon: string;
  sort_order: number;
  active: boolean;
}

export interface SubscriptionAddon {
  id: string;
  subscription_id: string;
  addon_id: string;
  added_at: string;
  active: boolean;
  addon_module?: AddonModule;
}

export interface BundlePlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  max_staff: number;
  max_clients: number;
  max_appointments_month: number;
  is_base_plan: boolean;
  is_bundle: boolean;
  discount_percentage: number;
  highlight_text: string | null;
  feature_flags: PlanFeatures;
}

// Base plan price
export const BASE_PLAN_PRICE = 29.90;

// Categories with labels and icons
export const ADDON_CATEGORIES = {
  comunicacao: { label: 'Comunicação', icon: 'message-square' },
  marketing: { label: 'Marketing', icon: 'megaphone' },
  gestao: { label: 'Gestão', icon: 'settings' },
  empresarial: { label: 'Empresarial', icon: 'building-2' },
} as const;

export const useAddonModules = () => {
  const { selectedBarbershopId, barbershops } = useAuth();
  const [addons, setAddons] = useState<AddonModule[]>([]);
  const [bundlePlans, setBundlePlans] = useState<BundlePlan[]>([]);
  const [activeAddons, setActiveAddons] = useState<SubscriptionAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Fetch all available addon modules
  const fetchAddons = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('addon_modules')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      setAddons(data?.map(addon => ({
        ...addon,
        features_enabled: typeof addon.features_enabled === 'string' 
          ? JSON.parse(addon.features_enabled) 
          : addon.features_enabled
      })) || []);
    } catch (error) {
      console.error('Error fetching addon modules:', error);
      setAddons([]);
    }
  }, []);

  // Fetch bundle plans (pre-configured packages)
  const fetchBundlePlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_bundle', true)
        .eq('active', true)
        .order('price', { ascending: true });

      if (error) throw error;

      setBundlePlans(data?.map(plan => ({
        ...plan,
        feature_flags: typeof plan.feature_flags === 'string'
          ? JSON.parse(plan.feature_flags)
          : plan.feature_flags || {}
      })) || []);
    } catch (error) {
      console.error('Error fetching bundle plans:', error);
      setBundlePlans([]);
    }
  }, []);

  // Fetch user's active subscription addons
  const fetchActiveAddons = useCallback(async () => {
    if (!selectedBarbershopId) {
      setActiveAddons([]);
      return;
    }

    try {
      // First get the subscription
      const allBarbershopIds = [
        selectedBarbershopId,
        ...barbershops.map(b => b.id),
        ...barbershops.map(b => b.parent_id).filter(Boolean)
      ].filter((id, index, arr) => arr.indexOf(id) === index);

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .in('barbershop_id', allBarbershopIds)
        .eq('status', 'active')
        .maybeSingle();

      if (!subscription) {
        setActiveAddons([]);
        return;
      }

      // Then get the addons for this subscription
      const { data, error } = await supabase
        .from('subscription_addons')
        .select(`
          *,
          addon_module:addon_modules(*)
        `)
        .eq('subscription_id', subscription.id)
        .eq('active', true);

      if (error) throw error;

      setActiveAddons(data?.map(item => ({
        ...item,
        addon_module: item.addon_module ? {
          ...item.addon_module,
          features_enabled: typeof item.addon_module.features_enabled === 'string'
            ? JSON.parse(item.addon_module.features_enabled)
            : item.addon_module.features_enabled
        } : undefined
      })) || []);
    } catch (error) {
      console.error('Error fetching active addons:', error);
      setActiveAddons([]);
    }
  }, [selectedBarbershopId, barbershops]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAddons(),
        fetchBundlePlans(),
        fetchActiveAddons()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchAddons, fetchBundlePlans, fetchActiveAddons]);

  // Group addons by category
  const addonsByCategory = useMemo(() => {
    const grouped: Record<string, AddonModule[]> = {};
    addons.forEach(addon => {
      if (!grouped[addon.category]) {
        grouped[addon.category] = [];
      }
      grouped[addon.category].push(addon);
    });
    return grouped;
  }, [addons]);

  // Calculate total price for selected addons
  const calculateTotal = useCallback((addonSlugs: string[], includeBase = true): number => {
    const addonsTotal = addons
      .filter(a => addonSlugs.includes(a.slug))
      .reduce((sum, addon) => sum + addon.price, 0);
    
    return includeBase ? BASE_PLAN_PRICE + addonsTotal : addonsTotal;
  }, [addons]);

  // Calculate monthly and annual prices
  const calculatePrices = useCallback((addonSlugs: string[]) => {
    const monthly = calculateTotal(addonSlugs, true);
    const annual = monthly * 12 * 0.8; // 20% discount for annual
    const monthlyFromAnnual = annual / 12;
    const savings = (monthly * 12) - annual;

    return {
      monthly,
      annual,
      monthlyFromAnnual,
      savings,
      savingsPercentage: 20
    };
  }, [calculateTotal]);

  // Toggle addon selection
  const toggleAddon = useCallback((slug: string) => {
    setSelectedAddons(prev => 
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    );
  }, []);

  // Select bundle (pre-configured package)
  const selectBundle = useCallback((plan: BundlePlan) => {
    // Find which addons are included in this bundle by comparing features
    const includedAddons: string[] = [];
    
    addons.forEach(addon => {
      const addonFeatures = Object.keys(addon.features_enabled);
      const planHasAllFeatures = addonFeatures.every(
        feature => plan.feature_flags[feature as keyof PlanFeatures] === true
      );
      if (planHasAllFeatures && addonFeatures.length > 0) {
        includedAddons.push(addon.slug);
      }
    });

    setSelectedAddons(includedAddons);
  }, [addons]);

  // Check if an addon is active for current subscription
  const hasAddon = useCallback((slug: string): boolean => {
    return activeAddons.some(a => a.addon_module?.slug === slug);
  }, [activeAddons]);

  // Get combined features from selected addons
  const getSelectedFeatures = useCallback((): Partial<PlanFeatures> => {
    const features: Partial<PlanFeatures> = {};
    
    selectedAddons.forEach(slug => {
      const addon = addons.find(a => a.slug === slug);
      if (addon?.features_enabled) {
        Object.assign(features, addon.features_enabled);
      }
    });

    return features;
  }, [selectedAddons, addons]);

  // Find best matching bundle for current selection
  const findMatchingBundle = useCallback((): BundlePlan | null => {
    const selectedPrice = calculateTotal(selectedAddons, true);
    
    // Find bundle with similar features at better price
    for (const bundle of bundlePlans) {
      if (bundle.price <= selectedPrice) {
        const selectedFeatures = getSelectedFeatures();
        const bundleHasAll = Object.keys(selectedFeatures).every(
          f => bundle.feature_flags[f as keyof PlanFeatures]
        );
        if (bundleHasAll) {
          return bundle;
        }
      }
    }
    return null;
  }, [bundlePlans, selectedAddons, calculateTotal, getSelectedFeatures]);

  return {
    // Data
    addons,
    bundlePlans,
    activeAddons,
    addonsByCategory,
    loading,
    
    // Selection state
    selectedAddons,
    setSelectedAddons,
    
    // Actions
    toggleAddon,
    selectBundle,
    
    // Calculations
    calculateTotal,
    calculatePrices,
    getSelectedFeatures,
    findMatchingBundle,
    
    // Checks
    hasAddon,
    
    // Refresh
    refresh: async () => {
      setLoading(true);
      await Promise.all([fetchAddons(), fetchBundlePlans(), fetchActiveAddons()]);
      setLoading(false);
    }
  };
};
