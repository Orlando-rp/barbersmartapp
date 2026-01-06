import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { StandardDaySchedule, DayName, DAY_NAMES, normalizeToStandardFormat } from '@/types/schedule';

interface BusinessHoursDB {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
}

interface ScheduleConflict {
  day: DayName;
  type: 'outside_hours' | 'closed_day' | 'break_overlap';
  message: string;
  severity: 'warning' | 'error';
}

const DAY_OF_WEEK_MAP: Record<number, DayName> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

const DAY_NAME_TO_NUMBER: Record<DayName, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Convert time string to minutes for comparison
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if staff time is within business hours
 */
function isTimeWithinRange(staffTime: string, businessStart: string, businessEnd: string): boolean {
  const staffMinutes = timeToMinutes(staffTime);
  const startMinutes = timeToMinutes(businessStart);
  const endMinutes = timeToMinutes(businessEnd);
  return staffMinutes >= startMinutes && staffMinutes <= endMinutes;
}

/**
 * Hook to validate staff schedule against barbershop business hours
 */
export function useScheduleConflictValidation(
  barbershopId: string | null,
  staffSchedule: Record<string, any> | null
) {
  const [businessHours, setBusinessHours] = useState<BusinessHoursDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch business hours
  useEffect(() => {
    if (!barbershopId) {
      setLoading(false);
      return;
    }

    const fetchBusinessHours = async () => {
      try {
        const { data, error } = await supabase
          .from('business_hours')
          .select('*')
          .eq('barbershop_id', barbershopId);

        if (error) {
          console.warn('Error fetching business hours:', error);
        } else {
          setBusinessHours(data || []);
        }
      } catch (err) {
        console.warn('Error fetching business hours:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessHours();
  }, [barbershopId]);

  // Convert business hours to a map by day name
  const businessHoursMap = useMemo(() => {
    const map: Record<DayName, StandardDaySchedule | null> = {
      monday: null,
      tuesday: null,
      wednesday: null,
      thursday: null,
      friday: null,
      saturday: null,
      sunday: null,
    };

    businessHours.forEach((bh) => {
      const dayName = DAY_OF_WEEK_MAP[bh.day_of_week];
      if (dayName) {
        map[dayName] = {
          enabled: bh.is_open,
          start: bh.open_time,
          end: bh.close_time,
          break_start: bh.break_start,
          break_end: bh.break_end,
        };
      }
    });

    return map;
  }, [businessHours]);

  // Validate schedule and find conflicts
  const conflicts = useMemo((): ScheduleConflict[] => {
    if (!staffSchedule || loading) return [];

    const result: ScheduleConflict[] = [];

    for (const day of DAY_NAMES) {
      const staffDay = staffSchedule[day];
      if (!staffDay) continue;

      const normalizedStaff = normalizeToStandardFormat(staffDay);
      const businessDay = businessHoursMap[day];

      // Skip if staff is not working this day
      if (!normalizedStaff.enabled) continue;

      // Check if barbershop is closed this day
      if (!businessDay || !businessDay.enabled) {
        result.push({
          day,
          type: 'closed_day',
          message: `Barbearia está fechada neste dia`,
          severity: 'error',
        });
        continue;
      }

      // Check if staff start time is before business opens - this is now an ERROR (blocking)
      if (timeToMinutes(normalizedStaff.start) < timeToMinutes(businessDay.start)) {
        result.push({
          day,
          type: 'outside_hours',
          message: `Entrada (${normalizedStaff.start}) é antes da abertura da barbearia (${businessDay.start})`,
          severity: 'error',
        });
      }

      // Check if staff end time is after business closes - this is now an ERROR (blocking)
      if (timeToMinutes(normalizedStaff.end) > timeToMinutes(businessDay.end)) {
        result.push({
          day,
          type: 'outside_hours',
          message: `Saída (${normalizedStaff.end}) é depois do fechamento da barbearia (${businessDay.end})`,
          severity: 'error',
        });
      }
    }

    return result;
  }, [staffSchedule, businessHoursMap, loading]);

  // Get conflicts for a specific day
  const getConflictsForDay = (day: DayName): ScheduleConflict[] => {
    return conflicts.filter((c) => c.day === day);
  };

  // Check if a day has any conflicts
  const dayHasConflict = (day: DayName): boolean => {
    return conflicts.some((c) => c.day === day);
  };

  // Get business hours for a specific day
  const getBusinessHoursForDay = (day: DayName): StandardDaySchedule | null => {
    return businessHoursMap[day];
  };

  // Check if there are any critical errors that should block saving
  const canSave = !conflicts.some((c) => c.severity === 'error');

  return {
    conflicts,
    getConflictsForDay,
    dayHasConflict,
    getBusinessHoursForDay,
    businessHoursMap,
    loading,
    hasConflicts: conflicts.length > 0,
    errorCount: conflicts.filter((c) => c.severity === 'error').length,
    warningCount: conflicts.filter((c) => c.severity === 'warning').length,
    canSave,
  };
}
