import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formata duração de minutos para formato de horas (ex: 90min -> 1h30)
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0min";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

/**
 * Retorna o nome preferido se disponível, senão o nome completo
 * Usado para personalizar notificações e mensagens
 */
export function getDisplayName(preferredName?: string | null, fullName?: string | null): string {
  return preferredName?.trim() || fullName?.trim() || 'Cliente';
}
