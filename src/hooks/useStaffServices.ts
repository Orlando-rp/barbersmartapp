import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface StaffService {
  staff_id: string;
  service_id: string;
  is_active: boolean;
}

interface StaffUnitInfo {
  staff_id: string;
  is_active: boolean;
}

export const useStaffServices = (barbershopId: string | null) => {
  const [staffServices, setStaffServices] = useState<StaffService[]>([]);
  const [staffUnitsMap, setStaffUnitsMap] = useState<Map<string, StaffUnitInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isUnit, setIsUnit] = useState(false);

  useEffect(() => {
    if (barbershopId) {
      fetchStaffServices();
    }
  }, [barbershopId]);

  const fetchStaffServices = async () => {
    if (!barbershopId) return;

    try {
      setLoading(true);
      
      // Check if this barbershop is a unit (has parent_id)
      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('id, parent_id')
        .eq('id', barbershopId)
        .maybeSingle();

      const barbershopIsUnit = !!barbershopData?.parent_id;
      setIsUnit(barbershopIsUnit);

      let staffIds: string[] = [];
      const unitsMap = new Map<string, StaffUnitInfo>();

      if (barbershopIsUnit) {
        // For units, get staff from staff_units table
        const { data: staffUnitsData } = await supabase
          .from('staff_units')
          .select('staff_id, active')
          .eq('barbershop_id', barbershopId)
          .eq('active', true);

        if (staffUnitsData && staffUnitsData.length > 0) {
          staffIds = staffUnitsData.map(su => su.staff_id);
          staffUnitsData.forEach(su => {
            unitsMap.set(su.staff_id, { staff_id: su.staff_id, is_active: su.active });
          });
        }
      } else {
        // For main barbershop (matriz), get staff directly
        const { data: staffData } = await supabase
          .from('staff')
          .select('id')
          .eq('barbershop_id', barbershopId)
          .eq('active', true);

        if (staffData && staffData.length > 0) {
          staffIds = staffData.map(s => s.id);
          staffData.forEach(s => {
            unitsMap.set(s.id, { staff_id: s.id, is_active: true });
          });
        }
      }

      setStaffUnitsMap(unitsMap);

      if (staffIds.length === 0) {
        setStaffServices([]);
        return;
      }

      // Get staff_services for these staff members
      const { data, error } = await supabase
        .from('staff_services')
        .select('staff_id, service_id, is_active')
        .in('staff_id', staffIds)
        .eq('is_active', true);

      if (error) {
        console.error('Erro ao carregar staff_services:', error);
        setStaffServices([]);
        return;
      }

      setStaffServices(data || []);
    } catch (error) {
      console.error('Erro ao carregar serviços do staff:', error);
      setStaffServices([]);
    } finally {
      setLoading(false);
    }
  };

  // Get services that a specific staff member provides (considering unit membership)
  const getStaffServices = (staffId: string): string[] => {
    // Check if staff is active in this unit/barbershop
    const unitInfo = staffUnitsMap.get(staffId);
    if (!unitInfo || !unitInfo.is_active) return [];
    
    return staffServices
      .filter(ss => ss.staff_id === staffId && ss.is_active)
      .map(ss => ss.service_id);
  };

  // Get staff members that provide a specific service (considering unit membership)
  const getServiceStaff = (serviceId: string): string[] => {
    return staffServices
      .filter(ss => {
        const unitInfo = staffUnitsMap.get(ss.staff_id);
        return ss.service_id === serviceId && ss.is_active && unitInfo?.is_active;
      })
      .map(ss => ss.staff_id);
  };

  // Check if a staff provides a specific service (considering unit membership)
  const staffProvidesService = (staffId: string, serviceId: string): boolean => {
    const unitInfo = staffUnitsMap.get(staffId);
    if (!unitInfo || !unitInfo.is_active) return false;
    
    return staffServices.some(
      ss => ss.staff_id === staffId && ss.service_id === serviceId && ss.is_active
    );
  };

  // Check if staff has any service restrictions configured
  const staffHasServiceRestrictions = (staffId: string): boolean => {
    return staffServices.some(ss => ss.staff_id === staffId);
  };

  // Check if staff is active in this unit/barbershop
  const staffIsActiveInUnit = (staffId: string): boolean => {
    const unitInfo = staffUnitsMap.get(staffId);
    return !!unitInfo?.is_active;
  };

  return {
    staffServices,
    loading,
    isUnit,
    getStaffServices,
    getServiceStaff,
    staffProvidesService,
    staffHasServiceRestrictions,
    staffIsActiveInUnit,
    refresh: fetchStaffServices,
  };
};
