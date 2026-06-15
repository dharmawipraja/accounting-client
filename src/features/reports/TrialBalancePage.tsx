import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { MoneyText } from '@/components/common/MoneyText';
import { Money } from '@/lib/money/money';
import { toApiDate } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { ReportTable, MoneyCell, type ReportColumn } from './ReportTable';
import { useReport } from './useReport';
import { trialBalanceSchema, type TrialBalanceRow } from './schema';

export function TrialBalancePage({ onOpenAccount }: { onOpenAccount: (accountId: string) => void }) {
  const t = useT();
  const [asOf, setAsOf] = useState(() => toApiDate(new Date()));
  const query = useReport('/ledger/trial-balance', { asOf }, trialBalanceSchema);
  const columns: ReportColumn<TrialBalanceRow>[] = [
    { header: t.reports.kode, cell: (r) => r.code },
    { header: t.reports.nama, cell: (r) => r.name },
    { header: t.reports.debit, align: 'right', cell: (r) => <MoneyCell value={r.debit} /> },
    { header: t.reports.kredit, align: 'right', cell: (r) => <MoneyCell value={r.credit} /> },
  ];
  return (
    <div>
      <PageHeader title={t.reports.trialBalance} />
      <ReportDateControls mode="asOf" asOf={asOf} onAsOf={setAsOf} />
      <ReportContent query={query}>
        {(tb) => {
          const balanced = Money.from(tb.totalDebit).eq(Money.from(tb.totalCredit));
          return (
            <div className="space-y-3">
              <ReportTable<TrialBalanceRow>
                columns={columns}
                rows={tb.rows}
                onRowClick={(r) => onOpenAccount(r.accountId)}
                footer={
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">{t.reports.total}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums"><MoneyText value={tb.totalDebit} /></TableCell>
                    <TableCell className="text-right font-semibold tabular-nums"><MoneyText value={tb.totalCredit} /></TableCell>
                  </TableRow>
                }
              />
              <Badge variant={balanced ? 'default' : 'destructive'}>{balanced ? t.reports.balanced : t.reports.unbalanced}</Badge>
            </div>
          );
        }}
      </ReportContent>
    </div>
  );
}
