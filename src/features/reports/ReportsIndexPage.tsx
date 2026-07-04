import type { LucideIcon } from 'lucide-react';
import { Scale, TrendingUp, ArrowLeftRight, Calculator, BookOpen, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { useT } from '@/lib/i18n/useT';

interface ReportLink {
  to: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}

export function ReportsIndexPage() {
  const t = useT();
  // Grouped by kind so the index reads as a structured menu, not one flat card grid.
  const groups: { label: string; items: ReportLink[] }[] = [
    {
      label: t.reports.groupStatements,
      items: [
        { to: '/reports/balance-sheet', title: t.reports.balanceSheet, desc: t.reports.balanceSheetDesc, icon: Scale },
        { to: '/reports/income-statement', title: t.reports.incomeStatement, desc: t.reports.incomeStatementDesc, icon: TrendingUp },
        { to: '/reports/cash-flow', title: t.reports.cashFlow, desc: t.reports.cashFlowDesc, icon: ArrowLeftRight },
      ],
    },
    {
      label: t.reports.groupLedger,
      items: [
        { to: '/reports/trial-balance', title: t.reports.trialBalance, desc: t.reports.trialBalanceDesc, icon: Calculator },
        { to: '/reports/general-ledger', title: t.reports.generalLedger, desc: t.reports.generalLedgerDesc, icon: BookOpen },
      ],
    },
    {
      label: t.reports.groupAging,
      items: [
        { to: '/reports/ar-aging', title: t.reports.arAging, desc: t.reports.arAgingDesc, icon: ArrowDownLeft },
        { to: '/reports/ap-aging', title: t.reports.apAging, desc: t.reports.apAgingDesc, icon: ArrowUpRight },
      ],
    },
  ];

  return (
    <div>
      <PageHeader title={t.reports.title} />
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.label} className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">{g.label}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map(({ to, title, desc, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full transition-colors hover:border-primary">
                    <CardHeader className="flex-row items-start gap-3 space-y-0">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-info-strong">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="space-y-1">
                        <CardTitle className="text-base">{title}</CardTitle>
                        <CardDescription>{desc}</CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
