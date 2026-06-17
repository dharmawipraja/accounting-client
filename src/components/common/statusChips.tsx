import { CheckCircle2, Ban, PencilLine, RotateCcw, Lock, LockOpen, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { Messages } from '@/lib/i18n/messages.id';
import { StatusChip } from './StatusChip';

/** Invoice / bill / payment status (DRAFT | POSTED | VOID). Label is passed in
 *  because the three features keep it in their own i18n namespaces. */
export function DocStatusChip({ status, label }: { status: string; label: string }) {
  if (status === 'POSTED') return <StatusChip tone="success" icon={CheckCircle2} label={label} />;
  if (status === 'VOID') return <StatusChip tone="error" icon={Ban} label={label} />;
  return <StatusChip tone="neutral" icon={PencilLine} label={label} />;
}

/** Journal status (DRAFT | POSTED | REVERSED) — single i18n namespace, owns its label. */
export function JournalStatusChip({ status, t }: { status: string; t: Messages }) {
  if (status === 'POSTED') return <StatusChip tone="success" icon={CheckCircle2} label={t.journals.statusPosted} />;
  if (status === 'REVERSED') return <StatusChip tone="neutral" icon={RotateCcw} label={t.journals.statusReversed} />;
  return <StatusChip tone="neutral" icon={PencilLine} label={t.journals.statusDraft} />;
}

/** Fiscal period: open = success, closed = neutral. */
export function PeriodStatusChip({ closed, t }: { closed: boolean; t: Messages }) {
  return closed
    ? <StatusChip tone="neutral" icon={Lock} label={t.periods.closed} />
    : <StatusChip tone="success" icon={LockOpen} label={t.periods.open} />;
}

/** Payment direction (RECEIPT | DISBURSEMENT) — informational, info tone. */
export function DirectionChip({ direction, t }: { direction: string; t: Messages }) {
  return direction === 'DISBURSEMENT'
    ? <StatusChip tone="info" icon={ArrowUpRight} label={t.payments.directionDisbursement} />
    : <StatusChip tone="info" icon={ArrowDownLeft} label={t.payments.directionReceipt} />;
}
