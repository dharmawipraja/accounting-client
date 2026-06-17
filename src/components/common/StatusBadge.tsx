import { CheckCircle2, CircleOff } from 'lucide-react';
import { StatusChip } from './StatusChip';
import { useT } from '@/lib/i18n/useT';

/** Active / inactive status for accounts, partners, tax codes. */
export function StatusBadge({ active }: { active: boolean }) {
  const t = useT();
  return active
    ? <StatusChip tone="success" icon={CheckCircle2} label={t.crud.active} />
    : <StatusChip tone="neutral" icon={CircleOff} label={t.crud.inactive} />;
}
