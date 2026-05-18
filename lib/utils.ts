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

import { parse, format } from 'date-fns'

export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) return timeStr;
    const parsed = parse(timeStr, 'HH:mm', new Date());
    if (isNaN(parsed.getTime())) return timeStr;
    return format(parsed, 'hh:mm a');
  } catch (e) {
    return timeStr;
  }
}
