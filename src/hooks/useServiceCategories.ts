import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useSharedBarbershopId } from '@/hooks/useSharedBarbershopId';

export interface ServiceCategory {
  id: string;
  barbershop_id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Default categories for new barbershops
const DEFAULT_CATEGORIES = [
  { name: 'Corte', description: 'Serviços de corte de cabelo', color: '#3b82f6' },
  { name: 'Barba', description: 'Serviços de barba e bigode', color: '#10b981' },
  { name: 'Sobrancelha', description: 'Design e manutenção de sobrancelhas', color: '#8b5cf6' },
  { name: 'Combo', description: 'Pacotes combinados de serviços', color: '#f59e0b' },
  { name: 'Tratamento', description: 'Tratamentos capilares e faciais', color: '#ec4899' },
  { name: 'Outros', description: 'Outros serviços', color: '#6b7280' },
];

export const useServiceCategories = () => {
  const { sharedBarbershopId, loading: loadingBarbershop } = useSharedBarbershopId();
  const { toast } = useToast();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!sharedBarbershopId || loadingBarbershop) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Buscar categorias da matriz E de todas as unidades filhas
      const { data: childUnits } = await supabase
        .from('barbershops')
        .select('id')
        .eq('parent_id', sharedBarbershopId);
      
      const allBarbershopIds = [sharedBarbershopId, ...(childUnits?.map(u => u.id) || [])];
      
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .in('barbershop_id', allBarbershopIds)
        .order('name', { ascending: true });

      if (error) {
        // Table might not exist yet, use defaults
        console.log('Categories table not found, using defaults');
        setCategories([]);
        return;
      }

      // If no categories exist, create defaults
      if (!data || data.length === 0) {
        await createDefaultCategories();
        return;
      }

      setCategories(data);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [sharedBarbershopId, loadingBarbershop]);

  const createDefaultCategories = async () => {
    if (!sharedBarbershopId) return;

    try {
      const categoriesToInsert = DEFAULT_CATEGORIES.map(cat => ({
        barbershop_id: sharedBarbershopId,
        name: cat.name,
        description: cat.description,
        color: cat.color,
        active: true,
      }));

      const { data, error } = await supabase
        .from('service_categories')
        .insert(categoriesToInsert)
        .select();

      if (error) throw error;

      setCategories(data || []);
    } catch (error: any) {
      console.error('Error creating default categories:', error);
    }
  };

  const createCategory = async (category: { name: string; description?: string; color?: string }) => {
    if (!sharedBarbershopId) return null;

    try {
      const { data, error } = await supabase
        .from('service_categories')
        .insert([{
          barbershop_id: sharedBarbershopId,
          name: category.name,
          description: category.description || null,
          color: category.color || '#6b7280',
          active: true,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Categoria criada',
        description: `A categoria "${category.name}" foi criada com sucesso.`,
      });

      await fetchCategories();
      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar categoria',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateCategory = async (id: string, updates: { name?: string; description?: string; color?: string; active?: boolean }) => {
    try {
      const { error } = await supabase
        .from('service_categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Categoria atualizada',
        description: 'A categoria foi atualizada com sucesso.',
      });

      await fetchCategories();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar categoria',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteCategory = async (id: string) => {
    if (!sharedBarbershopId) return false;
    
    try {
      // Buscar todas as barbearias relacionadas
      const { data: childUnits } = await supabase
        .from('barbershops')
        .select('id')
        .eq('parent_id', sharedBarbershopId);
      
      const allBarbershopIds = [sharedBarbershopId, ...(childUnits?.map(u => u.id) || [])];
      
      // Check if category is in use in any related barbershop
      const { data: services } = await supabase
        .from('services')
        .select('id')
        .in('barbershop_id', allBarbershopIds)
        .eq('category', categories.find(c => c.id === id)?.name)
        .limit(1);

      if (services && services.length > 0) {
        toast({
          title: 'Não é possível excluir',
          description: 'Esta categoria está sendo usada por serviços. Mova os serviços para outra categoria primeiro.',
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Categoria excluída',
        description: 'A categoria foi excluída com sucesso.',
      });

      await fetchCategories();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir categoria',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    refresh: fetchCategories,
    activeCategories: categories.filter(c => c.active),
  };
};
