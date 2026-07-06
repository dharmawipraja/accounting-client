import { ApiError } from '@/lib/api/errors';
import { MoneyText } from '@/components/common/MoneyText';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useT } from '@/lib/i18n/useT';
import type { PaymentAllocationInput } from './schema';
import { useJournalPreview } from './useJournalPreview';

/** The balanced journal this payment WOULD post — a read-only dry run rendered
 *  below the allocation table (same live-figures idea as the invoice tax preview),
 *  so the accountant sees the debits/credits before saving. */
export function PaymentJournalPreview({
  direction,
  cashAccountId,
  date,
  allocations,
}: {
  direction: 'RECEIPT' | 'DISBURSEMENT';
  cashAccountId: string;
  date: string;
  allocations: PaymentAllocationInput[];
}) {
  const t = useT();
  const { data, isLoading, error } = useJournalPreview({ direction, cashAccountId, date, allocations });
  if (allocations.length === 0 || !cashAccountId) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium">{t.payments.journalPreview}</h2>
      <p className="text-xs text-muted-foreground">{t.payments.journalPreviewHint}</p>
      {isLoading ? <p className="text-sm text-muted-foreground">{t.documents.calculating}</p> : null}
      {error instanceof ApiError ? <p role="alert" className="text-sm text-destructive">{error.message}</p> : null}
      {data && data.lines.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.journals.account}</TableHead>
                <TableHead className="text-right">{t.journals.debit}</TableHead>
                <TableHead className="text-right">{t.journals.credit}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lines.map((l) => (
                <TableRow key={l.accountId}>
                  <TableCell>{`${l.accountCode} — ${l.accountName}`}</TableCell>
                  <TableCell className="text-right"><MoneyText value={l.debit} /></TableCell>
                  <TableCell className="text-right"><MoneyText value={l.credit} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
            {data.totalDebit && data.totalCredit ? (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">{t.reports.total}</TableCell>
                  <TableCell className="text-right font-semibold"><MoneyText value={data.totalDebit} /></TableCell>
                  <TableCell className="text-right font-semibold"><MoneyText value={data.totalCredit} /></TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      ) : null}
    </div>
  );
}
