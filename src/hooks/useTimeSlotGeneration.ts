import { useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  StandardDaySchedule, 
  DAY_OF_WEEK_MAP, 
  DayName,
  getScheduleForDay,
  businessHoursToStandard,
  getEffectiveSchedule
} from '@/types/schedule';

interface BusinessHoursDB {
  day_of_week: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
}

interface SpecialHoursDB {
  special_date: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
}

interface UseTimeSlotGenerationProps {
  businessHours: BusinessHoursDB[];
  specialHours: SpecialHoursDB[];
  blockedDates: string[];
  staffSchedule: any | null;
  unitId?: string;
}

interface BookedAppointment {
  time: string;
  duration: number;
}

interface ValidationResult {
  isValid: boolean;
  reason?: string;
  schedule?: StandardDaySchedule;
}

/**
 * Centralized hook for time slot generation and validation
 * This is the SINGLE SOURCE OF TRUTH for time slot logic
 */
export function useTimeSlotGeneration({
  businessHours,
  specialHours,
  blockedDates,
  staffSchedule,
  unitId,
}: UseTimeSlotGenerationProps) {
  
  /**
   * Check if a time is within a range (inclusive start, exclusive end)
   */
  const isTimeInRange = useCallback((time: string, start: string, end: string): boolean => {
    return time >= start && time < end;
  }, []);

  /**
   * Convert time string to minutes
   */
  const timeToMinutes = useCallback((time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);

  /**
   * Check if a slot overlaps with booked appointments
   */
  const checkTimeOverlap = useCallback((
    startTime: string,
    durationMinutes: number,
    bookedAppointments: BookedAppointment[]
  ): boolean => {
    const slotStart = timeToMinutes(startTime);
    const slotEnd = slotStart + durationMinutes;

    for (const booked of bookedAppointments) {
      const bookedStart = timeToMinutes(booked.time);
      const bookedEnd = bookedStart + booked.duration;

      // Check for any overlap
      if (slotStart < bookedEnd && slotEnd > bookedStart) {
        return true;
      }
    }

    return false;
  }, [timeToMinutes]);

  /**
   * Validate if a date/time is available for scheduling
   */
  const validateDateTime = useCallback((
    date: Date,
    time?: string,
    staffId?: string
  ): ValidationResult => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const dayOfWeek = DAY_OF_WEEK_MAP[date.getDay()];

    // PRIORITY 1: Check blocked dates (highest priority)
    if (blockedDates.includes(formattedDate)) {
      return {
        isValid: false,
        reason: 'Esta data está bloqueada para agendamentos',
      };
    }

    // PRIORITY 2: Check special hours (overrides regular hours)
    const specialHour = specialHours.find(sh => sh.special_date === formattedDate);
    if (specialHour) {
      if (!specialHour.is_open) {
        return {
          isValid: false,
          reason: 'Barbearia fechada nesta data (horário especial)',
        };
      }

      const schedule: StandardDaySchedule = {
        enabled: true,
        start: specialHour.open_time!,
        end: specialHour.close_time!,
        break_start: specialHour.break_start,
        break_end: specialHour.break_end,
      };

      if (time) {
        if (!isTimeInRange(time, schedule.start, schedule.end)) {
          return {
            isValid: false,
            reason: `Horário fora do expediente (${schedule.start} - ${schedule.end})`,
          };
        }

        if (schedule.break_start && schedule.break_end) {
          if (isTimeInRange(time, schedule.break_start, schedule.break_end)) {
            return {
              isValid: false,
              reason: `Horário está no intervalo (${schedule.break_start} - ${schedule.break_end})`,
            };
          }
        }
      }

      return { isValid: true, schedule };
    }

    // PRIORITY 3: Check staff individual schedule (if available)
    const staffDaySchedule = getScheduleForDay(staffSchedule, dayOfWeek, unitId);
    
    // PRIORITY 4: Fall back to business hours
    const businessHourForDay = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    const businessHourSchedule = businessHourForDay 
      ? businessHoursToStandard(businessHourForDay) 
      : null;

    // Get effective schedule (staff > business > default)
    const effectiveSchedule = getEffectiveSchedule(
      staffSchedule,
      businessHourSchedule,
      dayOfWeek,
      unitId
    );

    // Check if working on this day
    if (!effectiveSchedule.enabled) {
      return {
        isValid: false,
        reason: staffDaySchedule 
          ? 'Este profissional não trabalha neste dia'
          : 'Barbearia fechada neste dia da semana',
      };
    }

    // Validate specific time if provided
    if (time) {
      if (!isTimeInRange(time, effectiveSchedule.start, effectiveSchedule.end)) {
        return {
          isValid: false,
          reason: `Horário fora do expediente (${effectiveSchedule.start} - ${effectiveSchedule.end})`,
        };
      }

      if (effectiveSchedule.break_start && effectiveSchedule.break_end) {
        if (isTimeInRange(time, effectiveSchedule.break_start, effectiveSchedule.break_end)) {
          return {
            isValid: false,
            reason: `Horário está no intervalo (${effectiveSchedule.break_start} - ${effectiveSchedule.break_end})`,
          };
        }
      }
    }

    return { isValid: true, schedule: effectiveSchedule };
  }, [businessHours, specialHours, blockedDates, staffSchedule, unitId, isTimeInRange]);

  /**
   * Generate available time slots for a date
   */
  const generateTimeSlots = useCallback((
    date: Date,
    serviceDurationMinutes: number = 30
  ): string[] => {
    const validation = validateDateTime(date);
    
    if (!validation.isValid || !validation.schedule) {
      return [];
    }

    const { schedule } = validation;
    const slots: string[] = [];

    const startMinutes = timeToMinutes(schedule.start);
    const endMinutes = timeToMinutes(schedule.end);
    const breakStartMinutes = schedule.break_start ? timeToMinutes(schedule.break_start) : null;
    const breakEndMinutes = schedule.break_end ? timeToMinutes(schedule.break_end) : null;

    let currentMinutes = startMinutes;

    while (currentMinutes + serviceDurationMinutes <= endMinutes) {
      const slotEnd = currentMinutes + serviceDurationMinutes;

      // Check if slot overlaps with break
      let isInBreak = false;
      if (breakStartMinutes !== null && breakEndMinutes !== null) {
        // Slot starts during break
        if (currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) {
          isInBreak = true;
        }
        // Slot ends during/after break start (service would overlap break)
        else if (currentMinutes < breakStartMinutes && slotEnd > breakStartMinutes) {
          isInBreak = true;
        }
      }

      if (!isInBreak) {
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        slots.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
      }

      // Increment by 30 minutes
      currentMinutes += 30;
    }

    return slots;
  }, [validateDateTime, timeToMinutes]);

  /**
   * Filter slots removing those already booked
   */
  const filterAvailableSlots = useCallback((
    slots: string[],
    serviceDurationMinutes: number,
    bookedAppointments: BookedAppointment[]
  ): string[] => {
    return slots.filter(slot => !checkTimeOverlap(slot, serviceDurationMinutes, bookedAppointments));
  }, [checkTimeOverlap]);

  return {
    validateDateTime,
    generateTimeSlots,
    filterAvailableSlots,
    checkTimeOverlap,
    isTimeInRange,
    timeToMinutes,
  };
}
