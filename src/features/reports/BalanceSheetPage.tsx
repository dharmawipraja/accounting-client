import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/PageHeader';
import { Money } from '@/lib/money/money';
import { toApiDate } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import { useT } from '@/lib/i18n/useT';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { StatementView, type StatementRow } from './StatementView';
import { subtypeLabel } from './subtypeLabel';
import { useReport } from './useReport';
import { balanceSheetReportSchema, type BalanceSheetReport } from './schema';

function buildRows(bs: BalanceSheetReport, t: Messages): StatementRow[] {
  const rows: StatementRow[] = [];
  const section = (header: string, sec: BalanceSheetReport['assets'], totalLabel: string, total: string) => {
    rows.push({ label: header, bold: true });
    for (const g of sec.groups) {
      rows.push({ label: subtypeLabel(t, g.subtype), level: 1 });
      for (const l of g.lines) rows.push({ label: `${l.code} ${l.name}`.trim(), amount: l.amount, level: 2 });
      rows.push({ label: t.reports.subtotal, amount: g.subtotal, level: 1, bold: true });
    }
    rows.push({ label: totalLabel, amount: total, bold: true, border: true });
  };
  section(t.reports.assets, bs.assets, t.reports.totalAssets, bs.totalAssets);
  section(t.reports.liabilities, bs.liabilities, t.reports.totalLiabilities, bs.totalLiabilities);
  section(t.reports.equity, bs.equity, t.reports.totalEquity, bs.totalEquity);
  rows.push({ label: t.reports.totalLiabEquity, amount: Money.from(bs.totalLiabilities).plus(Money.from(bs.totalEquity)).toApi(), bold: true, border: true });
  return rows;
}

export function BalanceSheetPage() {
  const t = useT();
  const [asOf, setAsOf] = useState(() => toApiDate(new Date()));
  const query = useReport('/reports/balance-sheet', { asOf }, balanceSheetReportSchema);
  return (
    <div>
      <PageHeader title={t.reports.balanceSheet} />
      <ReportDateControls mode="asOf" asOf={asOf} onAsOf={setAsOf} />
      <ReportContent query={query} loading={<SkeletonForm fields={5} />}>
        {(bs) => (
          <div className="space-y-3">
            <StatementView rows={buildRows(bs, t)} />
            <Badge variant={bs.balanced ? 'default' : 'destructive'}>{bs.balanced ? t.reports.balanced : t.reports.unbalanced}</Badge>
          </div>
        )}
      </ReportContent>
    </div>
  );
}
