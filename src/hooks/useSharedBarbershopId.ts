import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para obter IDs de barbearias para dados compartilhados.
 * 
 * Em redes multi-unidade:
 * - Para INSERT/UPDATE: usa o barbershop_id do usuário (onde tem permissão RLS)
 * - Para SELECT: usa todos os barbershops relacionados (matriz + unidades)
 */
export const useSharedBarbershopId = () => {
  const { barbershopId, selectedBarbershopId, barbershops } = useAuth();
  const [sharedBarbershopId, setSharedBarbershopId] = useState<string | null>(null);
  const [allRelatedBarbershopIds, setAllRelatedBarbershopIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track last fetched ID to prevent duplicate fetches
  const lastFetchedId = useRef<string | null>(null);

  // Use selected barbershop or fallback to default
  const currentBarbershopId = selectedBarbershopId || barbershopId;

  useEffect(() => {
    // Skip if no barbershop ID
    if (!currentBarbershopId) {
      setSharedBarbershopId(null);
      setAllRelatedBarbershopIds([]);
      setLoading(false);
      return;
    }

    // Avoid re-fetching if we already have data for this ID
    if (lastFetchedId.current === currentBarbershopId) {
      setLoading(false);
      return;
    }

    const fetchRelatedBarbershops = async () => {
      lastFetchedId.current = currentBarbershopId;
      
      try {
        // Get current barbershop info
        const { data: currentData, error: currentError } = await supabase
          .from('barbershops')
          .select('id, parent_id')
          .eq('id', currentBarbershopId)
          .single();

        if (currentError) {
          console.error('Erro ao buscar barbershop atual:', currentError);
          setSharedBarbershopId(currentBarbershopId);
          setAllRelatedBarbershopIds([currentBarbershopId]);
          setLoading(false);
          return;
        }

        // Determine the root barbershop ID for finding all related
        const rootId = currentData.parent_id || currentData.id;
        
        // Get all related barbershops (parent + children)
        const { data: relatedData } = await supabase
          .from('barbershops')
          .select('id')
          .or(`id.eq.${rootId},parent_id.eq.${rootId}`);

        const allIds = relatedData?.map(b => b.id) || [currentBarbershopId];
        setAllRelatedBarbershopIds(allIds);

        // For INSERT/UPDATE operations, use the user's current barbershop
        // (where they have RLS permissions)
        // This is the barbershop from the user's profile or selected barbershop
        setSharedBarbershopId(currentBarbershopId);
        
        console.log('[useSharedBarbershopId] currentBarbershopId:', currentBarbershopId);
        console.log('[useSharedBarbershopId] allRelatedBarbershopIds:', allIds);
      } catch (error) {
        console.error('Erro ao buscar barbershops:', error);
        setSharedBarbershopId(currentBarbershopId);
        setAllRelatedBarbershopIds([currentBarbershopId]);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedBarbershops();
  }, [currentBarbershopId]);

  return {
    // ID para INSERT/UPDATE - usa o barbershop do usuário atual
    sharedBarbershopId,
    // IDs para SELECT - inclui todos os barbershops relacionados
    allRelatedBarbershopIds,
    // ID atual da unidade selecionada
    currentBarbershopId,
    loading,
    // Indica se a barbearia atual é uma unidade (tem matriz)
    isUnit: allRelatedBarbershopIds.length > 1,
  };
};
