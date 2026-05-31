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
    const [hoursStr, minutesStr] = timeStr.split(':');
    if (!hoursStr || !minutesStr) return timeStr;

    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // el 0 se convierte en 12

    return `${hours}:${minutes} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
}
