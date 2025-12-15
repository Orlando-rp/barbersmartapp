import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface StaffUnit {
  id: string;
  staff_id: string;
  barbershop_id: string;
  commission_rate: number;
  schedule: Record<string, any> | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface StaffUnitWithDetails extends StaffUnit {
  barbershop_name?: string;
  staff_name?: string;
}

export const useStaffUnits = (staffId?: string, barbershopId?: string) => {
  const [staffUnits, setStaffUnits] = useState<StaffUnitWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaffUnits = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('staff_units')
        .select(`
          *,
          barbershops:barbershop_id (name),
          staff:staff_id (
            user_id,
            profiles:user_id (full_name)
          )
        `)
        .eq('active', true);

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      if (barbershopId) {
        query = query.eq('barbershop_id', barbershopId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao carregar staff_units:', error);
        setStaffUnits([]);
        return;
      }

      const formattedData: StaffUnitWithDetails[] = (data || []).map((item: any) => ({
        ...item,
        barbershop_name: item.barbershops?.name,
        staff_name: item.staff?.profiles?.full_name,
      }));

      setStaffUnits(formattedData);
    } catch (error) {
      console.error('Erro ao carregar staff_units:', error);
      setStaffUnits([]);
    } finally {
      setLoading(false);
    }
  }, [staffId, barbershopId]);

  useEffect(() => {
    fetchStaffUnits();
  }, [fetchStaffUnits]);

  // Get units where a specific staff member works
  const getStaffUnits = useCallback((targetStaffId: string): StaffUnitWithDetails[] => {
    return staffUnits.filter(su => su.staff_id === targetStaffId && su.active);
  }, [staffUnits]);

  // Get staff members that work in a specific unit
  const getUnitStaff = useCallback((targetBarbershopId: string): StaffUnitWithDetails[] => {
    return staffUnits.filter(su => su.barbershop_id === targetBarbershopId && su.active);
  }, [staffUnits]);

  // Check if staff works in a specific unit
  const staffWorksInUnit = useCallback((targetStaffId: string, targetBarbershopId: string): boolean => {
    return staffUnits.some(
      su => su.staff_id === targetStaffId && su.barbershop_id === targetBarbershopId && su.active
    );
  }, [staffUnits]);

  // Get unit-specific configuration for a staff member
  const getStaffUnitConfig = useCallback((targetStaffId: string, targetBarbershopId: string): StaffUnit | undefined => {
    return staffUnits.find(
      su => su.staff_id === targetStaffId && su.barbershop_id === targetBarbershopId
    );
  }, [staffUnits]);

  // Add staff to a unit
  const addStaffToUnit = async (
    targetStaffId: string, 
    targetBarbershopId: string, 
    config: { commission_rate?: number; schedule?: Record<string, any> }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('staff_units')
        .insert({
          staff_id: targetStaffId,
          barbershop_id: targetBarbershopId,
          commission_rate: config.commission_rate || 0,
          schedule: config.schedule || null,
          active: true,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      await fetchStaffUnits();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Update staff unit configuration
  const updateStaffUnit = async (
    targetStaffId: string,
    targetBarbershopId: string,
    updates: Partial<Pick<StaffUnit, 'commission_rate' | 'schedule' | 'active'>>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('staff_units')
        .update(updates)
        .eq('staff_id', targetStaffId)
        .eq('barbershop_id', targetBarbershopId);

      if (error) {
        return { success: false, error: error.message };
      }

      await fetchStaffUnits();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Remove staff from a unit (soft delete)
  const removeStaffFromUnit = async (
    targetStaffId: string,
    targetBarbershopId: string
  ): Promise<{ success: boolean; error?: string }> => {
    return updateStaffUnit(targetStaffId, targetBarbershopId, { active: false });
  };

  return {
    staffUnits,
    loading,
    getStaffUnits,
    getUnitStaff,
    staffWorksInUnit,
    getStaffUnitConfig,
    addStaffToUnit,
    updateStaffUnit,
    removeStaffFromUnit,
    refresh: fetchStaffUnits,
  };
};
