import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para obter IDs de barbearias seguindo a hierarquia correta:
 * 
 * HIERARQUIA:
 * - BARBEARIA (Matriz): Entidade principal, onde ficam Clientes, Serviços, Categorias
 * - UNIDADES: Locais físicos (parent_id aponta para Matriz), onde ficam Agendamentos
 * 
 * Retornos:
 * - matrizBarbershopId: ID da matriz - usar para INSERT de Clientes, Serviços, Categorias
 * - currentBarbershopId: ID da unidade selecionada - usar para INSERT de Agendamentos
 * - allRelatedBarbershopIds: Todos os IDs (matriz + unidades) - usar para SELECT
 */
export const useSharedBarbershopId = () => {
  const { barbershopId, selectedBarbershopId, barbershops } = useAuth();
  const [matrizBarbershopId, setMatrizBarbershopId] = useState<string | null>(null);
  const [allRelatedBarbershopIds, setAllRelatedBarbershopIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track last fetched ID to prevent duplicate fetches
  const lastFetchedId = useRef<string | null>(null);

  // Use selected barbershop or fallback to default
  const currentBarbershopId = selectedBarbershopId || barbershopId;

  useEffect(() => {
    // Skip if no barbershop ID
    if (!currentBarbershopId) {
      setMatrizBarbershopId(null);
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
          setMatrizBarbershopId(currentBarbershopId);
          setAllRelatedBarbershopIds([currentBarbershopId]);
          setLoading(false);
          return;
        }

        // Determine the matriz (root) barbershop ID
        // Se tem parent_id, o parent é a matriz; senão, o próprio é a matriz
        const rootId = currentData.parent_id || currentData.id;
        
        // Get all related barbershops (matriz + todas as unidades)
        const { data: relatedData } = await supabase
          .from('barbershops')
          .select('id')
          .or(`id.eq.${rootId},parent_id.eq.${rootId}`);

        const allIds = relatedData?.map(b => b.id) || [currentBarbershopId];
        setAllRelatedBarbershopIds(allIds);

        // matrizBarbershopId é SEMPRE o rootId (matriz)
        // Usado para INSERT de Clientes, Serviços, Categorias
        setMatrizBarbershopId(rootId);
        
        console.log('[useSharedBarbershopId] matrizBarbershopId:', rootId);
        console.log('[useSharedBarbershopId] currentBarbershopId:', currentBarbershopId);
        console.log('[useSharedBarbershopId] allRelatedBarbershopIds:', allIds);
      } catch (error) {
        console.error('Erro ao buscar barbershops:', error);
        setMatrizBarbershopId(currentBarbershopId);
        setAllRelatedBarbershopIds([currentBarbershopId]);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedBarbershops();
  }, [currentBarbershopId]);

  return {
    // ID da MATRIZ - usar para INSERT de Clientes, Serviços, Categorias
    matrizBarbershopId,
    // ID da unidade selecionada - usar para INSERT de Agendamentos
    currentBarbershopId,
    // IDs para SELECT - inclui matriz + todas unidades
    allRelatedBarbershopIds,
    // Legacy alias para compatibilidade (aponta para matriz)
    sharedBarbershopId: matrizBarbershopId,
    loading,
    // Indica se tem múltiplas unidades
    isMultiUnit: allRelatedBarbershopIds.length > 1,
    // Indica se a unidade atual é uma unidade (não é a matriz)
    isUnit: currentBarbershopId !== matrizBarbershopId,
  };
};
