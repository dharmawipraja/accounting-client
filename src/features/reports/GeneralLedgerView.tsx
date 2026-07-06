import { TableCell, TableRow } from '@/components/ui/table';
import { ExportCsvButton } from '@/components/common/ExportCsvButton';
import { MoneyText } from '@/components/common/MoneyText';
import { normalBalanceLabel, type NormalBalance } from '@/features/accounts/account-meta';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { TruncatedNotice } from './TruncatedNotice';
import { ReportTable, MoneyCell, type ReportColumn } from './ReportTable';
import type { GeneralLedger, GeneralLedgerLine } from './schema';

/** The general-ledger movement table for one account: truncation notice, CSV
 *  export, account line + opening balance, the movement rows, and a closing-balance
 *  footer. Shared by the GL report and the account drill-down. */
export function GeneralLedgerView({ gl, showAccountLine = true }: { gl: GeneralLedger; showAccountLine?: boolean }) {
  const t = useT();
  const columns: ReportColumn<GeneralLedgerLine>[] = [
    { header: t.reports.tanggal, cell: (l) => formatDateID(l.date.slice(0, 10)) },
    { header: t.reports.ref, cell: (l) => l.entryRef ?? '' },
    { header: t.reports.deskripsi, cell: (l) => l.description ?? '' },
    { header: t.reports.debit, align: 'right', cell: (l) => <MoneyCell value={l.debit} /> },
    { header: t.reports.kredit, align: 'right', cell: (l) => <MoneyCell value={l.credit} /> },
    { header: t.reports.saldo, align: 'right', cell: (l) => <MoneyText value={l.runningBalance} /> },
  ];
  return (
    <div className="space-y-2">
      <TruncatedNotice show={gl.truncated} message={t.reports.truncatedGl} />
      <div className="flex justify-end">
        <ExportCsvButton
          filename={`${t.reports.generalLedger} ${gl.account.code}`}
          headers={[t.reports.tanggal, t.reports.ref, t.reports.deskripsi, t.reports.debit, t.reports.kredit, t.reports.saldo]}
          rows={gl.lines.map((l) => [l.date.slice(0, 10), l.entryRef ?? '', l.description ?? '', l.debit, l.credit, l.runningBalance])}
        />
      </div>
      {showAccountLine ? (
        <div className="text-sm font-medium">{gl.account.code} · {gl.account.name} · {normalBalanceLabel(t, gl.account.normalBalance as NormalBalance)}</div>
      ) : null}
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
  );
}
