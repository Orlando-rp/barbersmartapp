import { useMemo } from 'react';

interface BarbershopWithParent {
  id: string;
  name: string;
  is_primary?: boolean;
  parent_id?: string | null;
}

interface SelectableUnitsResult {
  selectableUnits: BarbershopWithParent[];
  matrizName: string | null;
  hasMultipleUnits: boolean;
}

/**
 * Hook para filtrar barbearias/unidades selecionáveis.
 * Matrizes que possuem unidades NÃO são selecionáveis (apenas as unidades).
 * Barbearias independentes (sem unidades filhas) SÃO selecionáveis.
 */
export function useSelectableUnits(barbershops: BarbershopWithParent[] | undefined): SelectableUnitsResult {
  return useMemo(() => {
    if (!barbershops || barbershops.length === 0) {
      return { selectableUnits: [], matrizName: null, hasMultipleUnits: false };
    }

    // Separar matrizes (sem parent_id) e unidades (com parent_id)
    const matrizes: BarbershopWithParent[] = [];
    const unidades: BarbershopWithParent[] = [];

    barbershops.forEach(b => {
      if (!b.parent_id) {
        matrizes.push(b);
      } else {
        unidades.push(b);
      }
    });

    // Identificar matrizes que TÊM unidades (não devem ser selecionáveis)
    const matrizesComUnidades = new Set<string>();
    unidades.forEach(u => {
      if (u.parent_id) {
        matrizesComUnidades.add(u.parent_id);
      }
    });

    // Resultado: unidades + matrizes SEM unidades (barbearias independentes)
    const selectableUnits: BarbershopWithParent[] = [];

    // Adicionar matrizes que NÃO têm unidades (são barbearias independentes)
    matrizes.forEach(matriz => {
      if (!matrizesComUnidades.has(matriz.id)) {
        selectableUnits.push(matriz);
      }
    });

    // Adicionar todas as unidades
    selectableUnits.push(...unidades);

    // Nome da matriz principal (para exibição)
    const matrizPrincipal = matrizes.find(m => matrizesComUnidades.has(m.id));

    return {
      selectableUnits,
      matrizName: matrizPrincipal?.name || null,
      hasMultipleUnits: selectableUnits.length > 1
    };
  }, [barbershops]);
}

/**
 * Função utilitária para filtrar unidades selecionáveis (uso sem React hooks)
 */
export function filterSelectableUnits(barbershops: BarbershopWithParent[]): BarbershopWithParent[] {
  if (!barbershops || barbershops.length === 0) return [];

  const matrizes: BarbershopWithParent[] = [];
  const unidades: BarbershopWithParent[] = [];

  barbershops.forEach(b => {
    if (!b.parent_id) {
      matrizes.push(b);
    } else {
      unidades.push(b);
    }
  });

  const matrizesComUnidades = new Set<string>();
  unidades.forEach(u => {
    if (u.parent_id) {
      matrizesComUnidades.add(u.parent_id);
    }
  });

  const result: BarbershopWithParent[] = [];
  
  matrizes.forEach(matriz => {
    if (!matrizesComUnidades.has(matriz.id)) {
      result.push(matriz);
    }
  });

  result.push(...unidades);
  return result;
}
