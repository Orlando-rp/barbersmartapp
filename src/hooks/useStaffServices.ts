import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface StaffService {
  staff_id: string;
  service_id: string;
  is_active: boolean;
}

export const useStaffServices = (barbershopId: string | null) => {
  const [staffServices, setStaffServices] = useState<StaffService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      fetchStaffServices();
    }
  }, [barbershopId]);

  const fetchStaffServices = async () => {
    if (!barbershopId) return;

    try {
      setLoading(true);
      
      // Get all staff for this barbershop
      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .eq('active', true);

      if (!staffData || staffData.length === 0) {
        setStaffServices([]);
        return;
      }

      const staffIds = staffData.map(s => s.id);

      // Get staff_services for these staff members
      const { data, error } = await supabase
        .from('staff_services')
        .select('staff_id, service_id, is_active')
        .in('staff_id', staffIds)
        .eq('is_active', true);

      if (error) {
        console.error('Erro ao carregar staff_services:', error);
        // Table might not exist yet
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

  // Get services that a specific staff member provides
  const getStaffServices = (staffId: string): string[] => {
    return staffServices
      .filter(ss => ss.staff_id === staffId && ss.is_active)
      .map(ss => ss.service_id);
  };

  // Get staff members that provide a specific service
  const getServiceStaff = (serviceId: string): string[] => {
    return staffServices
      .filter(ss => ss.service_id === serviceId && ss.is_active)
      .map(ss => ss.staff_id);
  };

  // Check if a staff provides a specific service
  const staffProvidesService = (staffId: string, serviceId: string): boolean => {
    return staffServices.some(
      ss => ss.staff_id === staffId && ss.service_id === serviceId && ss.is_active
    );
  };

  // Check if staff has any service restrictions configured
  const staffHasServiceRestrictions = (staffId: string): boolean => {
    return staffServices.some(ss => ss.staff_id === staffId);
  };

  return {
    staffServices,
    loading,
    getStaffServices,
    getServiceStaff,
    staffProvidesService,
    staffHasServiceRestrictions,
    refresh: fetchStaffServices,
  };
};
