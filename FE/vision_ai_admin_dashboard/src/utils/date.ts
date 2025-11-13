import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Format date theo chuẩn Việt Nam
 */
export function formatDateVN(date: Date | string | number): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return format(d, 'dd/MM/yyyy', { locale: vi });
}

/**
 * Format datetime theo chuẩn Việt Nam
 */
export function formatDateTimeVN(date: Date | string | number): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return format(d, 'dd/MM/yyyy HH:mm', { locale: vi });
}

/**
 * Format relative time (vd: "2 giờ trước", "hôm qua")
 */
export function formatRelativeTime(date: Date | string | number): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';

  if (isToday(d)) {
    return formatDistanceToNow(d, { addSuffix: true, locale: vi });
  }

  if (isYesterday(d)) {
    return 'hôm qua';
  }

  return format(d, 'dd/MM/yyyy', { locale: vi });
}

/**
 * Format time only (HH:mm)
 */
export function formatTimeVN(date: Date | string | number): string {
  const d = new Date(date);
  return format(d, 'HH:mm', { locale: vi });
}

/**
 * Check if date is within range
 */
export function isDateInRange(
  date: Date | string | number,
  startDate: Date | string | number,
  endDate: Date | string | number
): boolean {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  return d >= start && d <= end;
}
