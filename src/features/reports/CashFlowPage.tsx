import type { Messages } from '@/lib/i18n/messages.id';
import { useT } from '@/lib/i18n/useT';
import { StatementReportPage } from './StatementReportPage';
import type { StatementRow } from './StatementView';
import { cashFlowReportSchema, type CashFlowReport, type CashFlowItem } from './schema';

function buildRows(cf: CashFlowReport, t: Messages): StatementRow[] {
  const rows: StatementRow[] = [];
  rows.push({ label: t.reports.netIncome, amount: cf.netIncome });
  const section = (header: string, items: CashFlowItem[], totalLabel: string, total: string) => {
    rows.push({ label: header, bold: true });
    for (const it of items) rows.push({ label: it.name ?? '—', amount: it.amount ?? '0', level: 1 });
    rows.push({ label: totalLabel, amount: total, level: 1, bold: true });
  };
  section(t.reports.operating, cf.operating.adjustments, t.reports.cashFromOperating, cf.operating.total);
  section(t.reports.investing, cf.investing.lines, t.reports.cashFromInvesting, cf.investing.total);
  section(t.reports.financing, cf.financing.lines, t.reports.cashFromFinancing, cf.financing.total);
  rows.push({ label: t.reports.netChange, amount: cf.netChange, bold: true, border: true });
  rows.push({ label: t.reports.kasAwal, amount: cf.kasAwal });
  rows.push({ label: t.reports.kasAkhir, amount: cf.kasAkhir, bold: true, border: true });
  return rows;
}

export function CashFlowPage() {
  const t = useT();
  return (
    <StatementReportPage<CashFlowReport>
      config={{
        title: t.reports.cashFlow,
        path: '/reports/cash-flow',
        schema: cashFlowReportSchema,
        mode: 'range',
        buildRows,
      }}
    />
  );
}
