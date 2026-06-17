import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { BackLink } from '@/components/common/BackLink';
import { toApiDate, isRangeValid } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import { useT } from '@/lib/i18n/useT';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { StatementView, type StatementRow } from './StatementView';
import { useReport } from './useReport';
import { incomeStatementReportSchema, type IncomeStatementReport, type ReportLine } from './schema';

function yearStart(): string { const d = new Date(); return toApiDate(new Date(d.getFullYear(), 0, 1)); }

function buildRows(is: IncomeStatementReport, t: Messages): StatementRow[] {
  const rows: StatementRow[] = [];
  const lines = (header: string, ls: ReportLine[], totalLabel: string, total: string) => {
    rows.push({ label: header, bold: true });
    for (const l of ls) rows.push({ label: `${l.code} ${l.name}`.trim(), amount: l.amount, level: 1 });
    rows.push({ label: totalLabel, amount: total, level: 1, bold: true });
  };
  lines(t.reports.revenue, is.revenueLines, t.reports.totalRevenue, is.revenue);
  lines(t.reports.cogs, is.cogsLines, t.reports.cogs, is.cogs);
  rows.push({ label: t.reports.grossProfit, amount: is.grossProfit, bold: true, border: true });
  lines(t.reports.operatingExpense, is.operatingExpenseLines, t.reports.operatingExpense, is.operatingExpense);
  rows.push({ label: t.reports.operatingProfit, amount: is.operatingProfit, bold: true, border: true });
  rows.push({ label: t.reports.otherIncome, amount: is.otherIncome });
  rows.push({ label: t.reports.otherExpense, amount: is.otherExpense });
  rows.push({ label: t.reports.profitBeforeTax, amount: is.profitBeforeTax, bold: true });
  rows.push({ label: t.reports.taxExpense, amount: is.taxExpense });
  rows.push({ label: t.reports.netIncome, amount: is.netIncome, bold: true, border: true });
  return rows;
}

export function IncomeStatementPage() {
  const t = useT();
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(() => toApiDate(new Date()));
  const query = useReport('/reports/income-statement', { from, to }, incomeStatementReportSchema, isRangeValid(from, to));
  return (
    <div>
      <PageHeader title={t.reports.incomeStatement} back={<BackLink to="/reports" label={t.nav.reports} />} />
      <ReportDateControls mode="range" from={from} to={to} onRange={(f, tt) => { setFrom(f); setTo(tt); }} />
      <ReportContent query={query} loading={<SkeletonForm fields={5} />}>{(is) => <StatementView rows={buildRows(is, t)} />}</ReportContent>
    </div>
  );
}
