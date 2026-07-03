import { CheckCircle2, Ban, PencilLine, RotateCcw, Lock, LockOpen, ArrowDownLeft, ArrowUpRight, Circle, CircleDashed, AlertTriangle } from 'lucide-react';
import type { Messages } from '@/lib/i18n/messages.id';
import { documentStatusLabel } from '@/features/documents/statusLabel';
import { StatusChip } from './StatusChip';

/** Invoice / bill / payment status (DRAFT | POSTED | VOID). Label is passed in
 *  because the three features keep it in their own i18n namespaces. */
export function DocStatusChip({ status, label }: { status: string; label: string }) {
  if (status === 'POSTED') return <StatusChip tone="success" icon={CheckCircle2} label={label} />;
  if (status === 'VOID') return <StatusChip tone="error" icon={Ban} label={label} />;
  return <StatusChip tone="neutral" icon={PencilLine} label={label} />;
}

/** Payment status of an invoice/bill (UNPAID | PARTIAL | PAID) — single i18n namespace. */
export function PaymentStatusChip({ status, t }: { status: string; t: Messages }) {
  if (status === 'PAID') return <StatusChip tone="success" icon={CheckCircle2} label={t.documents.paid} />;
  if (status === 'PARTIAL') return <StatusChip tone="warning" icon={CircleDashed} label={t.documents.partial} />;
  return <StatusChip tone="neutral" icon={Circle} label={t.documents.unpaid} />;
}

/** Journal status (DRAFT | POSTED | REVERSED) — single i18n namespace, owns its label. */
export function JournalStatusChip({ status, t }: { status: string; t: Messages }) {
  if (status === 'POSTED') return <StatusChip tone="success" icon={CheckCircle2} label={documentStatusLabel(t, 'POSTED')} />;
  if (status === 'REVERSED') return <StatusChip tone="neutral" icon={RotateCcw} label={documentStatusLabel(t, 'REVERSED')} />;
  return <StatusChip tone="neutral" icon={PencilLine} label={documentStatusLabel(t, 'DRAFT')} />;
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

/** Trial-balance / balance-sheet balance indicator: balanced = success, else error.
 *  Icon + text so the state never rests on colour alone. */
export function BalancedChip({ balanced, t }: { balanced: boolean; t: Messages }) {
  return balanced
    ? <StatusChip tone="success" icon={CheckCircle2} label={t.reports.balanced} />
    : <StatusChip tone="error" icon={AlertTriangle} label={t.reports.unbalanced} />;
}

/** HTTP response status: 2xx/3xx = success, 4xx/5xx = error, unknown = neutral.
 *  The code itself is the label; the icon carries the pass/fail meaning. */
export function HttpStatusChip({ code }: { code: number | null | undefined }) {
  if (code == null) return <StatusChip tone="neutral" icon={Circle} label="—" />;
  const ok = code < 400;
  return <StatusChip tone={ok ? 'success' : 'error'} icon={ok ? CheckCircle2 : AlertTriangle} label={String(code)} />;
}
