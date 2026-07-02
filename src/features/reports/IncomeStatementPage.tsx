import type { Messages } from '@/lib/i18n/messages.id';
import { useT } from '@/lib/i18n/useT';
import { StatementReportPage } from './StatementReportPage';
import type { StatementRow } from './StatementView';
import { incomeStatementReportSchema, type IncomeStatementReport, type ReportLine } from './schema';

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
  return (
    <StatementReportPage<IncomeStatementReport>
      config={{
        title: t.reports.incomeStatement,
        path: '/reports/income-statement',
        schema: incomeStatementReportSchema,
        mode: 'range',
        buildRows,
      }}
    />
  );
}
