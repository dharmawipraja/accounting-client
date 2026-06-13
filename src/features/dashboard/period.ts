import { startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { isRangeValid, toApiDate } from '@/lib/format/date';

export type PeriodPreset = 'month' | 'quarter' | 'year' | 'custom';

export interface Period {
  preset: PeriodPreset;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

/** Build a Period for a non-custom preset, relative to `today`. */
export function computePeriod(preset: Exclude<PeriodPreset, 'custom'>, today: Date): Period {
  const start =
    preset === 'month' ? startOfMonth(today) : preset === 'quarter' ? startOfQuarter(today) : startOfYear(today);
  return { preset, from: toApiDate(start), to: toApiDate(today) };
}

/** True when both bounds are present and from <= to. */
export function periodValid(p: Period): boolean {
  return !!p.from && !!p.to && isRangeValid(p.from, p.to);
}
