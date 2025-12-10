import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
}

interface Subscription {
  id: string;
  barbershop_id: string;
  plan_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  plan?: SubscriptionPlan;
}

export interface SubscriptionInfo {
  planName: string;
  status: string;
  validUntil: Date | null;
  isTrialing: boolean;
  trialEndsAt: Date | null;
}

export const useSubscription = () => {
  const { selectedBarbershopId } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedBarbershopId) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [selectedBarbershopId]);

  const fetchSubscription = async () => {
    if (!selectedBarbershopId) return;

    try {
      setLoading(true);

      // Buscar assinatura da barbearia com o plano associado
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          barbershop_id,
          plan_id,
          status,
          trial_ends_at,
          current_period_start,
          current_period_end,
          subscription_plans (
            id,
            name,
            slug,
            description,
            price
          )
        `)
        .eq('barbershop_id', selectedBarbershopId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        // Tabela pode não existir ainda
        if (!error.message?.includes('does not exist')) {
          console.warn('Erro ao buscar assinatura:', error);
        }
        setSubscription(null);
        return;
      }

      if (data) {
        const plan = data.subscription_plans as unknown as SubscriptionPlan;
        const now = new Date();
        const trialEnds = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
        const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
        
        setSubscription({
          planName: plan?.name || 'Gratuito',
          status: data.status,
          validUntil: periodEnd,
          isTrialing: trialEnds ? trialEnds > now : false,
          trialEndsAt: trialEnds,
        });
      } else {
        // Sem assinatura - plano gratuito/default
        setSubscription({
          planName: 'Gratuito',
          status: 'none',
          validUntil: null,
          isTrialing: false,
          trialEndsAt: null,
        });
      }
    } catch (error) {
      console.warn('Erro ao carregar assinatura:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    subscription,
    loading,
    refresh: fetchSubscription,
  };
};
