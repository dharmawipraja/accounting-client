import { Table, TableBody, TableCaption, TableCell, TableRow } from '@/components/ui/table';
import { MoneyText } from '@/components/common/MoneyText';

export interface StatementRow {
  label: string;
  amount?: string;
  level?: number;
  bold?: boolean;
  border?: boolean;
}

export function StatementView({ rows, caption }: { rows: StatementRow[]; caption?: string }) {
  return (
    <div className="rounded-lg border">
      <Table>
        {caption ? <TableCaption className="sr-only">{caption}</TableCaption> : null}
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} className={r.border ? 'border-t-2' : undefined}>
              <TableCell className={r.bold ? 'font-semibold' : undefined} style={{ paddingLeft: `${1 + (r.level ?? 0) * 1.5}rem` }}>{r.label}</TableCell>
              <TableCell className={`text-right tabular-nums ${r.bold ? 'font-semibold' : ''}`}>
                {r.amount !== undefined ? <MoneyText value={r.amount} /> : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
