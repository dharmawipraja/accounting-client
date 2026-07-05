import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { MoneyText } from '@/components/common/MoneyText';
import { AccountSelect } from '@/features/accounts/AccountSelect';
import { normalBalanceLabel, type NormalBalance } from '@/features/accounts/account-meta';
import { formatDateID, toApiDate, isRangeValid } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { ReportTable, MoneyCell, type ReportColumn } from './ReportTable';
import { useReport } from './useReport';
import { generalLedgerSchema, type GeneralLedgerLine } from './schema';

function yearStart(): string { const d = new Date(); return toApiDate(new Date(d.getFullYear(), 0, 1)); }

export function GeneralLedgerPage({ initialAccountId }: { initialAccountId?: string }) {
  const t = useT();
  const [accountId, setAccountId] = useState(initialAccountId ?? '');
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(() => toApiDate(new Date()));
  const enabled = !!accountId && isRangeValid(from, to);
  const query = useReport('/reports/general-ledger', { accountId: accountId || undefined, from, to }, generalLedgerSchema, enabled);
  const columns: ReportColumn<GeneralLedgerLine>[] = [
    { header: t.reports.tanggal, cell: (l) => formatDateID(l.date.slice(0, 10)) },
    { header: t.reports.ref, cell: (l) => l.entryRef ?? '' },
    { header: t.reports.deskripsi, cell: (l) => l.description ?? '' },
    { header: t.reports.debit, align: 'right', cell: (l) => <MoneyCell value={l.debit} /> },
    { header: t.reports.kredit, align: 'right', cell: (l) => <MoneyCell value={l.credit} /> },
    { header: t.reports.saldo, align: 'right', cell: (l) => <MoneyText value={l.runningBalance} /> },
  ];
  return (
    <div>
      <PageHeader title={t.reports.generalLedger} parent={{ to: '/reports', label: t.nav.reports }} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t.reports.account}</span>
          <AccountSelect value={accountId} onChange={setAccountId} aria-label={t.reports.account} />
        </div>
        <ReportDateControls mode="range" from={from} to={to} onRange={(f, tt) => { setFrom(f); setTo(tt); }} />
      </div>
      {!accountId ? (
        <p className="text-sm text-muted-foreground">{t.reports.selectAccount}</p>
      ) : (
        <ReportContent query={query} loading={<SkeletonTable rows={6} cols={4} />}>
          {(gl) => (
            <div className="space-y-2">
              <div className="text-sm font-medium">{gl.account.code} · {gl.account.name} · {normalBalanceLabel(t, gl.account.normalBalance as NormalBalance)}</div>
              <div className="text-sm text-muted-foreground">{t.reports.openingBalance}: <MoneyText value={gl.openingBalance} /></div>
              <ReportTable<GeneralLedgerLine>
                columns={columns}
                rows={gl.lines}
                footer={
                  <TableRow>
                    <TableCell colSpan={5} className="font-semibold">{t.reports.closingBalance}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums"><MoneyText value={gl.closingBalance} /></TableCell>
                  </TableRow>
                }
              />
            </div>
          )}
        </ReportContent>
      )}
    </div>
  );
}
