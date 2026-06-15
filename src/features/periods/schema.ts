import { z } from 'zod';

export const periodSchema = z.object({
  id: z.string(),
  fiscalYear: z.number(),
  // Real API: a period has `sequence` (1-12) + `name` ("2026-01"); there is no `month`.
  // `month`/`isClosed` are kept as defensive tolerance (only OPEN periods were observed live).
  sequence: z.number().nullish(),
  name: z.string().nullish(),
  month: z.number().nullish(),
  status: z.string().nullish(),
  isClosed: z.boolean().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  closedAt: z.string().nullish(),
  closedBy: z.string().nullish(),
});
export type Period = z.infer<typeof periodSchema>;
export const periodListSchema = z.array(periodSchema);

export const yearEndStatusSchema = z.object({
  fiscalYear: z.number().nullish(),
  status: z.string().nullish(),
  isClosed: z.boolean().nullish(),
  closedAt: z.string().nullish(),
  closingEntryId: z.string().nullish(),
});
export type YearEndStatus = z.infer<typeof yearEndStatusSchema>;

export function isPeriodClosed(p: Period): boolean {
  return p.status === 'CLOSED' || p.isClosed === true;
}
export function isYearClosed(s: YearEndStatus | null | undefined): boolean {
  return !!s && (s.status === 'CLOSED' || s.isClosed === true);
}

export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

export function monthLabel(p: Period): string {
  const m = p.sequence ?? p.month ?? (p.startDate ? new Date(p.startDate).getUTCMonth() + 1 : 0);
  return MONTHS_ID[m - 1] ?? p.name ?? '';
}
