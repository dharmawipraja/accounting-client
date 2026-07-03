import { Money } from '@/lib/money/money';
import type { Messages } from '@/lib/i18n/messages.id';
import { useT } from '@/lib/i18n/useT';
import { BalancedChip } from '@/components/common/statusChips';
import { StatementReportPage } from './StatementReportPage';
import type { StatementRow } from './StatementView';
import { balanceSheetReportSchema, type BalanceSheetReport } from './schema';

/** The balance-sheet report can emit subtype values beyond the account schema
 *  (e.g. the report-only CURRENT_EARNINGS), so resolve tolerantly: shared
 *  account subtype labels, the report-only earnings label, else the raw value. */
function bsSubtypeLabel(t: Messages, subtype: string): string {
  if (subtype === 'CURRENT_EARNINGS') return t.reports.currentEarnings;
  return (t.accounts.subtypeLabels as Record<string, string>)[subtype] ?? subtype;
}

function buildRows(bs: BalanceSheetReport, t: Messages): StatementRow[] {
  const rows: StatementRow[] = [];
  const section = (header: string, sec: BalanceSheetReport['assets'], totalLabel: string, total: string) => {
    rows.push({ label: header, bold: true });
    for (const g of sec.groups) {
      rows.push({ label: bsSubtypeLabel(t, g.subtype), level: 1 });
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
  return (
    <StatementReportPage<BalanceSheetReport>
      config={{
        title: t.reports.balanceSheet,
        path: '/reports/balance-sheet',
        schema: balanceSheetReportSchema,
        mode: 'asOf',
        buildRows,
        footer: (bs) => <BalancedChip balanced={Boolean(bs.balanced)} t={t} />,
      }}
    />
  );
}
