// Standardized schedule types used across the entire system

/**
 * Standard format for a single day's schedule
 * This is the AUTHORITATIVE format - all schedule data should conform to this
 */
export interface StandardDaySchedule {
  enabled: boolean;
  start: string;       // "09:00" format
  end: string;         // "18:00" format
  break_start?: string | null;
  break_end?: string | null;
}

/**
 * Weekly schedule using standard format
 */
export interface StandardWeeklySchedule {
  monday: StandardDaySchedule;
  tuesday: StandardDaySchedule;
  wednesday: StandardDaySchedule;
  thursday: StandardDaySchedule;
  friday: StandardDaySchedule;
  saturday: StandardDaySchedule;
  sunday: StandardDaySchedule;
}

/**
 * Multi-unit schedule format
 * Used when staff works at multiple units with different schedules per unit
 */
export interface MultiUnitSchedule {
  units: {
    [barbershopId: string]: StandardWeeklySchedule;
  };
}

/**
 * Complete staff schedule that can be either single-unit or multi-unit
 */
export type StaffScheduleData = StandardWeeklySchedule | MultiUnitSchedule;

/**
 * Day names constant
 */
export const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type DayName = typeof DAY_NAMES[number];

/**
 * Day labels in Portuguese
 */
export const DAY_LABELS: Record<DayName, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

/**
 * Day of week number to name mapping
 */
export const DAY_OF_WEEK_MAP: Record<number, DayName> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

/**
 * Default day schedule
 */
export const DEFAULT_DAY_SCHEDULE: StandardDaySchedule = {
  enabled: true,
  start: '09:00',
  end: '18:00',
  break_start: null,
  break_end: null,
};

/**
 * Default weekly schedule
 */
export const DEFAULT_WEEKLY_SCHEDULE: StandardWeeklySchedule = {
  monday: { ...DEFAULT_DAY_SCHEDULE },
  tuesday: { ...DEFAULT_DAY_SCHEDULE },
  wednesday: { ...DEFAULT_DAY_SCHEDULE },
  thursday: { ...DEFAULT_DAY_SCHEDULE },
  friday: { ...DEFAULT_DAY_SCHEDULE },
  saturday: { ...DEFAULT_DAY_SCHEDULE, end: '14:00' },
  sunday: { ...DEFAULT_DAY_SCHEDULE, enabled: false },
};

/**
 * Type guard to check if schedule is multi-unit format
 */
export function isMultiUnitSchedule(schedule: any): schedule is MultiUnitSchedule {
  return schedule && typeof schedule === 'object' && 'units' in schedule;
}

/**
 * Normalize any schedule format to the standard format for a specific day and unit
 */
export function getScheduleForDay(
  schedule: any,
  dayOfWeek: DayName,
  unitId?: string
): StandardDaySchedule | null {
  if (!schedule) return null;

  // Multi-unit format: schedule.units[unitId][day]
  if (isMultiUnitSchedule(schedule)) {
    if (unitId && schedule.units[unitId]) {
      const daySchedule = schedule.units[unitId][dayOfWeek];
      if (daySchedule) {
        return normalizeToStandardFormat(daySchedule);
      }
    }
    return null;
  }

  // Standard weekly format: schedule[day]
  const daySchedule = schedule[dayOfWeek];
  if (daySchedule) {
    return normalizeToStandardFormat(daySchedule);
  }

  return null;
}

/**
 * Normalize various legacy formats to standard format
 */
export function normalizeToStandardFormat(daySchedule: any): StandardDaySchedule {
  if (!daySchedule) return { ...DEFAULT_DAY_SCHEDULE, enabled: false };

  return {
    enabled: daySchedule.enabled ?? daySchedule.is_open ?? daySchedule.is_working ?? false,
    start: daySchedule.start ?? daySchedule.open_time ?? '09:00',
    end: daySchedule.end ?? daySchedule.close_time ?? '18:00',
    break_start: daySchedule.break_start ?? null,
    break_end: daySchedule.break_end ?? null,
  };
}

/**
 * Convert business hours database format to standard format
 */
export function businessHoursToStandard(businessHours: {
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
}): StandardDaySchedule {
  return {
    enabled: businessHours.is_open,
    start: businessHours.open_time,
    end: businessHours.close_time,
    break_start: businessHours.break_start,
    break_end: businessHours.break_end,
  };
}

/**
 * Get effective schedule for a staff member on a specific day
 * Priority: Staff individual schedule > Business hours > Default
 */
export function getEffectiveSchedule(
  staffSchedule: any | null,
  businessHours: StandardDaySchedule | null,
  dayOfWeek: DayName,
  unitId?: string
): StandardDaySchedule {
  // 1. Try staff individual schedule
  const staffDaySchedule = getScheduleForDay(staffSchedule, dayOfWeek, unitId);
  if (staffDaySchedule) {
    return staffDaySchedule;
  }

  // 2. Try business hours
  if (businessHours) {
    return businessHours;
  }

  // 3. Return default (closed on Sunday)
  return {
    ...DEFAULT_DAY_SCHEDULE,
    enabled: dayOfWeek !== 'sunday',
  };
}
