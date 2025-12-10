import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para obter o ID da barbearia raiz (matriz) para dados compartilhados.
 * 
 * Em redes multi-unidade:
 * - Clientes, serviços e categorias são compartilhados entre todas as unidades
 * - Se a barbearia atual tem parent_id, usa o parent_id (matriz)
 * - Se não tem parent_id, usa o próprio barbershopId (é a matriz)
 */
export const useSharedBarbershopId = () => {
  const { barbershopId, selectedBarbershopId } = useAuth();
  const [sharedBarbershopId, setSharedBarbershopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track last fetched ID to prevent duplicate fetches
  const lastFetchedId = useRef<string | null>(null);

  // Use selected barbershop or fallback to default
  const currentBarbershopId = selectedBarbershopId || barbershopId;

  useEffect(() => {
    // Skip if no barbershop ID or already fetched for this ID
    if (!currentBarbershopId) {
      setSharedBarbershopId(null);
      setLoading(false);
      return;
    }

    // Avoid re-fetching if we already have data for this ID
    if (lastFetchedId.current === currentBarbershopId && sharedBarbershopId !== null) {
      return;
    }

    const fetchParentId = async () => {
      try {
        lastFetchedId.current = currentBarbershopId;
        
        const { data, error } = await supabase
          .from('barbershops')
          .select('id, parent_id')
          .eq('id', currentBarbershopId)
          .single();

        if (error) {
          console.error('Erro ao buscar parent_id:', error);
          // Fallback to current barbershop
          setSharedBarbershopId(currentBarbershopId);
        } else {
          // Se tem parent_id, usa o parent (matriz)
          // Se não tem, usa o próprio ID (é a matriz)
          const newSharedId = data.parent_id || data.id;
          // Only update if different to prevent unnecessary re-renders
          setSharedBarbershopId(prev => prev === newSharedId ? prev : newSharedId);
        }
      } catch (error) {
        console.error('Erro ao buscar barbershop:', error);
        setSharedBarbershopId(currentBarbershopId);
      } finally {
        setLoading(false);
      }
    };

    fetchParentId();
  }, [currentBarbershopId]);

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
