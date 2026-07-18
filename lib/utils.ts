import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback para WebViews antiguos
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

export function formatTime12h(timeStr: string | undefined): string {
  if (!timeStr) return '';
  try {
    const normalizedTime = timeStr.trim();

    // Si ya viene en formato 12h, no lo volvemos a transformar.
    if (/\b(?:AM|PM|A\.M\.|P\.M\.)\b/i.test(normalizedTime)) {
      return normalizedTime;
    }

    const match = normalizedTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return timeStr;

    const [, hoursStr, minutesStr] = match;

    let hours = parseInt(hoursStr, 10);
    if (Number.isNaN(hours)) return timeStr;
    const minutes = minutesStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // el 0 se convierte en 12

    return `${hours}:${minutes} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
}
