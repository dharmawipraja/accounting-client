import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type StatusTone = 'success' | 'warning' | 'error' | 'neutral' | 'info';

const VARIANT: Record<StatusTone, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  success: 'success',
  warning: 'warning',
  error: 'destructive',
  neutral: 'secondary',
  info: 'info',
};

/** Semantic status pill: tinted fill + matching text + a decorative icon. The
 *  text label is the accessible status (icon is aria-hidden) — never colour alone. */
export function StatusChip({ tone, icon: Icon, label }: { tone: StatusTone; icon: LucideIcon; label: string }) {
  return (
    <Badge variant={VARIANT[tone]}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
