import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { MoneyText } from '@/components/common/MoneyText';
import { PageHeader } from '@/components/common/PageHeader';
import { RoleGate } from '@/components/common/RoleGate';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { ErrorState } from '@/components/common/ErrorState';
import { mutationFeedback } from '@/lib/api/mutationFeedback';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { usePostInvoice } from '@/features/sales-invoices/hooks';
import { usePostBill } from '@/features/purchase-bills/hooks';
import { usePostPayment } from '@/features/payments/hooks';
import { usePostJournalEntry } from '@/features/journals/hooks';
import { useApprovalQueue, type ApprovalItem, type ApprovalKind } from './useApprovalQueue';

/** Reference cell: the document's ref (or a "no number yet" fallback) linking to it. */
function ApprovalRefLink({ item, label }: { item: ApprovalItem; label: string }) {
  const text = item.ref ?? label;
  const link =
    item.kind === 'invoice' ? <Link to="/sales-invoices/$id/edit" params={{ id: item.id }}>{text}</Link>
    : item.kind === 'bill' ? <Link to="/purchase-bills/$id/edit" params={{ id: item.id }}>{text}</Link>
    : item.kind === 'payment' ? <Link to="/payments/$id/edit" params={{ id: item.id }}>{text}</Link>
    : <Link to="/journals/$id" params={{ id: item.id }}>{text}</Link>;
  return <Button asChild variant="link" className="h-auto p-0 font-normal">{link}</Button>;
}

/** The approval inbox: every DRAFT document awaiting a post, in one place. Posting
 *  is APPROVER/ADMIN (server-enforced; role-gated here per the SoD workflow). */
export function ApprovalQueuePage() {
  const t = useT();
  const { items, isLoading, isError, error } = useApprovalQueue();
  const [pending, setPending] = useState<ApprovalItem | null>(null);

  const post = {
    invoice: usePostInvoice(),
    bill: usePostBill(),
    payment: usePostPayment(),
    journal: usePostJournalEntry(),
  };
  const anyPending = Object.values(post).some((m) => m.isPending);

  const kindLabel: Record<ApprovalKind, string> = {
    invoice: t.nav.salesInvoices,
    bill: t.nav.purchaseBills,
    payment: t.nav.payments,
    journal: t.nav.journals,
  };

  function confirmPost() {
    if (!pending) return;
    const done = mutationFeedback({ t, success: t.approvals.posted, errorMode: 'domain', onClose: () => setPending(null) });
    post[pending.kind].mutate({ id: pending.id }, done);
  }

  return (
    <div>
      <PageHeader title={t.approvals.title} />
      <p className="mb-4 text-sm text-muted-foreground">{t.approvals.subtitle}</p>

      {isError ? (
        <ErrorState error={error} />
      ) : isLoading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : items.length === 0 ? (
        <div className="rounded-lg border">
          <EmptyState icon={ClipboardCheck} title={t.approvals.emptyTitle} description={t.approvals.emptyHint} />
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.approvals.kind}</TableHead>
                <TableHead>{t.approvals.reference}</TableHead>
                <TableHead>{t.approvals.detail}</TableHead>
                <TableHead>{t.approvals.date}</TableHead>
                <TableHead className="text-right">{t.approvals.amount}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={`${item.kind}:${item.id}`}>
                  <TableCell><Badge variant="outline">{kindLabel[item.kind]}</Badge></TableCell>
                  <TableCell><ApprovalRefLink item={item} label={t.approvals.noRef} /></TableCell>
                  <TableCell className="max-w-xs truncate">{item.subtitle || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateID(item.date.slice(0, 10))}</TableCell>
                  <TableCell className="text-right"><MoneyText value={item.amount} /></TableCell>
                  <TableCell className="text-right">
                    <RoleGate allow={['APPROVER', 'ADMIN']}>
                      <Button variant="outline" size="sm" onClick={() => setPending(item)}>{t.approvals.post}</Button>
                    </RoleGate>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => { if (!o) setPending(null); }}
        title={t.approvals.confirmPostTitle}
        description={t.approvals.confirmPostDesc}
        detail={pending ? `${kindLabel[pending.kind]} · ${pending.ref ?? pending.subtitle}` : undefined}
        confirmLabel={t.approvals.post}
        pending={anyPending}
        onConfirm={confirmPost}
      />
    </div>
  );
}
