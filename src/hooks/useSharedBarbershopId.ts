import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para obter o ID da barbearia raiz (matriz) para dados compartilhados.
 * 
 * Em redes multi-unidade:
 * - Clientes, serviços e categorias são compartilhados entre todas as unidades
 * - Se a barbearia atual tem parent_id, usa o parent_id (matriz)
 * - Se não tem parent_id, procura a matriz entre as barbearias do usuário
 * - Se não encontrar matriz, usa o próprio barbershopId
 */
export const useSharedBarbershopId = () => {
  const { barbershopId, selectedBarbershopId, barbershops } = useAuth();
  const [sharedBarbershopId, setSharedBarbershopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track last fetched ID to prevent duplicate fetches
  const lastFetchedId = useRef<string | null>(null);

  // Use selected barbershop or fallback to default
  const currentBarbershopId = selectedBarbershopId || barbershopId;

  useEffect(() => {
    // Skip if no barbershop ID
    if (!currentBarbershopId) {
      setSharedBarbershopId(null);
      setLoading(false);
      return;
    }

    // Avoid re-fetching if we already have data for this ID
    if (lastFetchedId.current === currentBarbershopId) {
      setLoading(false);
      return;
    }

    const fetchRootBarbershopId = async () => {
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
          setLoading(false);
          return;
        }

        // If current barbershop has a parent, use the parent
        if (currentData.parent_id) {
          console.log('[useSharedBarbershopId] Usando parent_id:', currentData.parent_id);
          setSharedBarbershopId(currentData.parent_id);
          setLoading(false);
          return;
        }

        // If user has multiple barbershops, find the root (one without parent_id)
        // This handles cases where parent_id is not set but user has access to both parent and child
        if (barbershops.length > 1) {
          const barbershopIds = barbershops.map(b => b.id);
          
          const { data: allBarbershops } = await supabase
            .from('barbershops')
            .select('id, parent_id')
            .in('id', barbershopIds);

          if (allBarbershops && allBarbershops.length > 0) {
            // Find a barbershop that is referenced as parent by others
            const parentIds = new Set(allBarbershops.filter(b => b.parent_id).map(b => b.parent_id));
            const rootBarbershop = allBarbershops.find(b => parentIds.has(b.id));
            
            if (rootBarbershop) {
              console.log('[useSharedBarbershopId] Matriz encontrada:', rootBarbershop.id);
              setSharedBarbershopId(rootBarbershop.id);
              setLoading(false);
              return;
            }

            // If no parent found, find one that has NO parent_id (potential root)
            const potentialRoot = allBarbershops.find(b => !b.parent_id);
            if (potentialRoot && potentialRoot.id !== currentBarbershopId) {
              console.log('[useSharedBarbershopId] Usando barbearia sem parent_id como matriz:', potentialRoot.id);
              setSharedBarbershopId(potentialRoot.id);
              setLoading(false);
              return;
            }
          }
        }

        // Fallback: use current barbershop ID
        console.log('[useSharedBarbershopId] Usando barbearia atual como matriz:', currentData.id);
        setSharedBarbershopId(currentData.id);
      } catch (error) {
        console.error('Erro ao buscar barbershop:', error);
        setSharedBarbershopId(currentBarbershopId);
      } finally {
        setLoading(false);
      }
    };

    fetchRootBarbershopId();
  }, [currentBarbershopId, barbershops]);

  return {
    // ID compartilhado (matriz) - usar para clientes, serviços, categorias
    sharedBarbershopId,
    // ID atual da unidade selecionada - usar para agendamentos, transações
    currentBarbershopId,
    loading,
    // Indica se a barbearia atual é uma unidade (tem matriz)
    isUnit: sharedBarbershopId !== null && sharedBarbershopId !== currentBarbershopId,
  };
};
