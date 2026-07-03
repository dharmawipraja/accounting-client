import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoneyText } from '@/components/common/MoneyText';
import { Money } from '@/lib/money/money';

export interface ReportColumn<T> {
  header: string;
  align?: 'right';
  cell: (row: T) => ReactNode;
}

interface ReportTableProps<T> {
  columns: ReportColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  /** Accessible name for an interactive row (required for keyboard/SR users when `onRowClick` is set). */
  rowLabel?: (row: T) => string;
  footer?: ReactNode;
}

export function ReportTable<T>({ columns, rows, onRowClick, rowLabel, footer }: ReportTableProps<T>) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c, i) => (
              <TableHead key={i} className={c.align === 'right' ? 'text-right' : undefined}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, ri) => (
            <TableRow
              key={ri}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick ? rowLabel?.(row) : undefined}
              className={onRowClick ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none' : undefined}
            >
              {columns.map((c, ci) => (
                <TableCell key={ci} className={c.align === 'right' ? 'text-right tabular-nums' : undefined}>{c.cell(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {footer ? <TableFooter>{footer}</TableFooter> : null}
      </Table>
    </div>
  );
}

/** Right-aligned money cell with zero-suppression: blank for a zero amount (the ledger convention). */
export function MoneyCell({ value }: { value: string }) {
  return Money.from(value).eq(Money.zero()) ? null : <MoneyText value={value} />;
}
