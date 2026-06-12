import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

/** Display an API date string (YYYY-MM-DD) as dd/mm/yyyy. */
export function formatDateID(apiDate: string): string {
  return format(parseISO(apiDate), 'dd/MM/yyyy', { locale: id });
}

/** Convert a Date to a date-only API string (local calendar date). */
export function toApiDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True when from <= to (the API rejects from > to with 422). */
export function isRangeValid(from: string, to: string): boolean {
  return from <= to;
}
