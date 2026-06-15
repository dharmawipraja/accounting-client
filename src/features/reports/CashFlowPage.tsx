import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { toApiDate, isRangeValid } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import { useT } from '@/lib/i18n/useT';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { StatementView, type StatementRow } from './StatementView';
import { useReport } from './useReport';
import { cashFlowReportSchema, type CashFlowReport, type CashFlowItem } from './schema';

function yearStart(): string { const d = new Date(); return toApiDate(new Date(d.getFullYear(), 0, 1)); }

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
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(() => toApiDate(new Date()));
  const query = useReport('/reports/cash-flow', { from, to }, cashFlowReportSchema, isRangeValid(from, to));
  return (
    <div>
      <PageHeader title={t.reports.cashFlow} />
      <ReportDateControls mode="range" from={from} to={to} onRange={(f, tt) => { setFrom(f); setTo(tt); }} />
      <ReportContent query={query}>{(cf) => <StatementView rows={buildRows(cf, t)} />}</ReportContent>
    </div>
  );
}
