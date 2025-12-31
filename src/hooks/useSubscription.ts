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

export interface SubscriptionInfo {
  planName: string;
  status: string;
  validUntil: Date | null;
  isTrialing: boolean;
  trialEndsAt: Date | null;
}

export const useSubscription = () => {
  const { user, barbershops } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && barbershops.length > 0) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user, barbershops]);

  const fetchSubscription = async () => {
    if (!user || barbershops.length === 0) return;

    try {
      setLoading(true);

      // Coletar TODOS os IDs relacionados (próprios + parents)
      const ownIds = barbershops.map(b => b.id);
      const parentIds = barbershops
        .map(b => b.parent_id)
        .filter((id): id is string => id !== null && id !== undefined);
      
      // Combinar e remover duplicatas
      const allRelatedIds = [...new Set([...ownIds, ...parentIds])];

      console.log('[useSubscription] Buscando assinatura para IDs:', allRelatedIds);

      if (allRelatedIds.length === 0) {
        setSubscription({
          planName: 'Gratuito',
          status: 'none',
          validUntil: null,
          isTrialing: false,
          trialEndsAt: null,
        });
        return;
      }

      // Buscar assinatura em qualquer barbershop da hierarquia (active ou trialing)
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
        .in('barbershop_id', allRelatedIds)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('[useSubscription] Resultado da busca:', { data, error });

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
