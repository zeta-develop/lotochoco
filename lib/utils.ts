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

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
]

/**
 * Convierte un número de 4 dígitos en formato DDMM a texto legible "DD Mes".
 * Ejemplo: "0505" → "05 Mayo", "2512" → "25 Diciembre"
 */
export function formatDateNumber(number: string, short?: boolean): string {
  if (!number || number.length !== 4) return number
  const day = number.substring(0, 2)
  const monthIndex = parseInt(number.substring(2, 4), 10) - 1
  if (monthIndex < 0 || monthIndex > 11) return number
  const dayNum = parseInt(day, 10)
  if (dayNum < 1 || dayNum > 31) return number
  const names = short ? MONTH_NAMES_SHORT : MONTH_NAMES
  return `${day} ${names[monthIndex]}`
}

/**
 * Verifica si un juego usa formato de fecha (4 dígitos).
 */
export function isDateGame(digitCount: number): boolean {
  return digitCount === 4
}

/**
 * Retorna los días válidos para un mes dado (1-12).
 */
export function getDaysInMonth(month: number): number {
  // Usar año actual como referencia
  if (month < 1 || month > 12) return 31
  return new Date(new Date().getFullYear(), month, 0).getDate()
}
