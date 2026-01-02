import { addDays, addWeeks, addMonths, format, isBefore, startOfDay } from 'date-fns';

export type RecurrenceRule = 'weekly' | 'biweekly' | 'triweekly' | 'monthly' | 'custom';

export interface RecurrenceConfig {
  rule: RecurrenceRule;
  count: number;
  customIntervalDays?: number;
  endDate?: Date;
}

export interface GeneratedDate {
  date: Date;
  index: number;
  formattedDate: string;
}

export interface AvailabilityResult {
  date: Date;
  time: string;
  available: boolean;
  reason?: string;
}

/**
 * Gera datas baseado na regra de recorrência
 */
export function generateRecurringDates(
  startDate: Date,
  config: RecurrenceConfig
): GeneratedDate[] {
  const dates: GeneratedDate[] = [];
  let currentDate = startOfDay(startDate);
  const maxDates = config.endDate ? 52 : config.count; // Max 52 para evitar loops infinitos

  for (let i = 0; i < maxDates; i++) {
    // Verifica se passou da data limite
    if (config.endDate && isBefore(config.endDate, currentDate)) {
      break;
    }

    dates.push({
      date: currentDate,
      index: i,
      formattedDate: format(currentDate, 'yyyy-MM-dd'),
    });

    // Calcula próxima data baseado na regra
    switch (config.rule) {
      case 'weekly':
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'biweekly':
        currentDate = addWeeks(currentDate, 2);
        break;
      case 'triweekly':
        currentDate = addWeeks(currentDate, 3);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
      case 'custom':
        currentDate = addDays(currentDate, config.customIntervalDays || 7);
        break;
    }
  }

  return dates;
}

/**
 * Converte regra para texto legível
 */
export function getRecurrenceLabel(rule: RecurrenceRule, customDays?: number): string {
  switch (rule) {
    case 'weekly':
      return 'Semanalmente';
    case 'biweekly':
      return 'Quinzenalmente';
    case 'triweekly':
      return 'A cada 3 semanas';
    case 'monthly':
      return 'Mensalmente';
    case 'custom':
      return `A cada ${customDays} dias`;
    default:
      return 'Personalizado';
  }
}

/**
 * Gera um UUID v4 simples para grupo de recorrência
 */
export function generateRecurrenceGroupId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Calcula valor total para múltiplos agendamentos
 */
export function calculateTotalPrice(servicePrice: number, dateCount: number): number {
  return servicePrice * dateCount;
}

/**
 * Formata resumo da recorrência
 */
export function formatRecurrenceSummary(
  rule: RecurrenceRule,
  count: number,
  startDate: Date,
  customDays?: number
): string {
  const ruleLabel = getRecurrenceLabel(rule, customDays);
  return `${ruleLabel} por ${count} ${count === 1 ? 'vez' : 'vezes'}, a partir de ${format(startDate, 'dd/MM/yyyy')}`;
}

/**
 * Calcula a duração aproximada em semanas/meses baseado na frequência
 */
export function getCountDurationLabel(count: number, rule: RecurrenceRule, customDays?: number): string {
  let daysPerRepetition: number;
  
  switch (rule) {
    case 'weekly':
      daysPerRepetition = 7;
      break;
    case 'biweekly':
      daysPerRepetition = 14;
      break;
    case 'triweekly':
      daysPerRepetition = 21;
      break;
    case 'monthly':
      daysPerRepetition = 30;
      break;
    case 'custom':
      daysPerRepetition = customDays || 7;
      break;
    default:
      daysPerRepetition = 7;
  }
  
  const totalDays = (count - 1) * daysPerRepetition; // -1 porque a primeira data é o início
  const weeks = Math.round(totalDays / 7);
  const months = Math.round(totalDays / 30);
  
  if (totalDays < 7) {
    return '';
  } else if (weeks < 4) {
    return `(${weeks} ${weeks === 1 ? 'semana' : 'semanas'})`;
  } else {
    return `(${months} ${months === 1 ? 'mês' : 'meses'})`;
  }
}

/**
 * Gera opções de quantidade de repetições com duração dinâmica
 */
export function getRecurrenceCountOptions(rule: RecurrenceRule, customDays?: number) {
  const counts = [2, 3, 4, 5, 6, 8, 10, 12];
  
  return counts.map(count => {
    const durationLabel = getCountDurationLabel(count, rule, customDays);
    return {
      value: count,
      label: durationLabel ? `${count} vezes ${durationLabel}` : `${count} vezes`
    };
  });
}

/**
 * Opções predefinidas básicas (para fallback)
 */
export const RECURRENCE_COUNT_OPTIONS = [
  { value: 2, label: '2 vezes' },
  { value: 3, label: '3 vezes' },
  { value: 4, label: '4 vezes' },
  { value: 5, label: '5 vezes' },
  { value: 6, label: '6 vezes' },
  { value: 8, label: '8 vezes' },
  { value: 10, label: '10 vezes' },
  { value: 12, label: '12 vezes' },
];

/**
 * Opções predefinidas de regras de recorrência
 */
export const RECURRENCE_RULE_OPTIONS: { value: RecurrenceRule; label: string; description: string }[] = [
  { value: 'weekly', label: 'Semanal', description: 'Todo mesmo dia da semana' },
  { value: 'biweekly', label: 'Quinzenal', description: 'A cada 2 semanas' },
  { value: 'triweekly', label: 'A cada 3 semanas', description: 'A cada 21 dias' },
  { value: 'monthly', label: 'Mensal', description: 'Mesmo dia do mês' },
  { value: 'custom', label: 'Personalizado', description: 'Definir intervalo em dias' },
];
