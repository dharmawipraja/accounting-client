import { Link } from '@tanstack/react-router';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { useT } from '@/lib/i18n/useT';

export function ReportsIndexPage() {
  const t = useT();
  const reports = [
    { to: '/reports/balance-sheet', title: t.reports.balanceSheet, desc: t.reports.balanceSheetDesc },
    { to: '/reports/income-statement', title: t.reports.incomeStatement, desc: t.reports.incomeStatementDesc },
    { to: '/reports/cash-flow', title: t.reports.cashFlow, desc: t.reports.cashFlowDesc },
    { to: '/reports/trial-balance', title: t.reports.trialBalance, desc: t.reports.trialBalanceDesc },
    { to: '/reports/general-ledger', title: t.reports.generalLedger, desc: t.reports.generalLedgerDesc },
  ] as const;
  return (
    <div>
      <PageHeader title={t.reports.title} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Link key={r.to} to={r.to} className="block">
            <Card className="transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle>{r.title}</CardTitle>
                <CardDescription>{r.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
