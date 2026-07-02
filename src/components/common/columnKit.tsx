import type { ColumnDef } from '@tanstack/react-table';
import { formatDateID } from '@/lib/format/date';
import { MoneyText } from './MoneyText';
import { StatusBadge } from './StatusBadge';
import { RowActions } from './RowActions';

/** Shared builders for the register/list table columns. Each returns a plain
 *  ColumnDef so features can mix them with their own feature-specific columns.
 *  The money builders right-align via `meta.align` (read once in DataTable). */

/** Plain-text column with an em-dash fallback for nullish values. */
export function textColumn<T>(accessorKey: keyof T & string, header: string): ColumnDef<T> {
  return { accessorKey, header, cell: ({ getValue }) => (getValue() as string | null | undefined) ?? '—' };
}

/** Date column: formats the first 10 chars (YYYY-MM-DD) of an ISO string. */
export function dateColumn<T>(accessorKey: keyof T & string, header: string): ColumnDef<T> {
  return { accessorKey, header, cell: ({ getValue }) => formatDateID((getValue() as string).slice(0, 10)) };
}

/** Right-aligned tabular money column from a 4dp API string field. */
export function moneyColumn<T>(accessorKey: keyof T & string, header: string): ColumnDef<T> {
  return { accessorKey, header, meta: { align: 'right' }, cell: ({ getValue }) => <MoneyText value={getValue() as string} /> };
}

/** Right-aligned money column computed from the whole row (not a single field). */
export function moneyDisplayColumn<T>(id: string, header: string, getAmount: (row: T) => string): ColumnDef<T> {
  return { id, header, meta: { align: 'right' }, cell: ({ row }) => <MoneyText value={getAmount(row.original)} /> };
}

/** Master-data active/inactive status column (accounts / partners / tax codes). */
export function activeStatusColumn<T extends { isActive: boolean }>(header: string): ColumnDef<T> {
  return { accessorKey: 'isActive', header, cell: ({ row }) => <StatusBadge active={row.original.isActive} /> };
}

export interface RowActionHandlers<T> {
  onEdit: (row: T) => void;
  onToggleActive: (row: T) => void;
  onDelete: (row: T) => void;
}

/** Master-data row-actions column (edit / toggle-active / delete) via RowActions. */
export function masterActionsColumn<T extends { isActive: boolean }>(handlers: RowActionHandlers<T>): ColumnDef<T> {
  return {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <RowActions
        onEdit={() => handlers.onEdit(row.original)}
        active={row.original.isActive}
        onToggleActive={() => handlers.onToggleActive(row.original)}
        onDelete={() => handlers.onDelete(row.original)}
      />
    ),
  };
}
