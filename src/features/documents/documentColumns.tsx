import type { ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { RoleGate } from '@/components/common/RoleGate';
import { DocStatusChip, PaymentStatusChip } from '@/components/common/statusChips';
import type { Messages } from '@/lib/i18n/messages.id';
import { documentStatusLabel, type DocumentStatus } from './statusLabel';

/** Document-family (invoice / bill / payment) column builders. Journals differ
 *  (own status chip + a POSTED+MANUAL reverse action) and keep their own columns. */

/** Document status column (DRAFT | POSTED | VOID). The label comes from each
 *  feature's own i18n namespace via documentStatusLabel. */
export function docStatusColumn<T>(accessorKey: keyof T & string, header: string, t: Messages): ColumnDef<T> {
  return {
    accessorKey,
    header,
    cell: ({ getValue }) => (
      <DocStatusChip status={getValue() as string} label={documentStatusLabel(t, getValue() as DocumentStatus)} />
    ),
  };
}

/** Payment-status column (UNPAID | PARTIAL | PAID); em-dash when absent. */
export function paymentStatusColumn<T>(accessorKey: keyof T & string, header: string, t: Messages): ColumnDef<T> {
  return {
    accessorKey,
    header,
    cell: ({ getValue }) => {
      const ps = getValue() as string | null | undefined;
      return ps ? <PaymentStatusChip status={ps} t={t} /> : '—';
    },
  };
}

export interface DocumentActionsConfig<T extends { id: string; status: string }> {
  /** Route-typed edit/view link for a row, given the label to show. Feature-supplied
   *  so the TanStack route literal keeps its type. Used for both the DRAFT "edit"
   *  link and the non-draft "view" link (same route, different label). */
  renderOpenLink: (row: T, label: string) => ReactNode;
  /** Optional route-typed "duplicate into a new draft" link (invoices/bills). */
  renderDuplicateLink?: (row: T, label: string) => ReactNode;
  onPost: (row: T) => void;
  onVoid: (row: T) => void;
  onDelete: (row: T) => void;
  labels: { edit: string; view: string; delete: string; post: string; void: string; duplicate?: string };
}

/** The invoice/bill/payment per-row action column: DRAFT -> edit/delete/post
 *  (role-gated); POSTED -> view + void; other non-draft -> view. */
export function documentActionsColumn<T extends { id: string; status: string }>(
  cfg: DocumentActionsConfig<T>,
): ColumnDef<T> {
  return {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const d = row.original;
      const duplicate =
        cfg.renderDuplicateLink && cfg.labels.duplicate ? (
          <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
            <Button asChild variant="ghost" size="sm">{cfg.renderDuplicateLink(d, cfg.labels.duplicate)}</Button>
          </RoleGate>
        ) : null;
      return (
        <div className="flex items-center justify-end gap-1.5">
          {duplicate}
          {d.status === 'DRAFT' ? (
            <>
              <RoleGate allow={['ACCOUNTANT', 'APPROVER', 'ADMIN']}>
                {cfg.renderOpenLink(d, cfg.labels.edit)}
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => cfg.onDelete(d)}>{cfg.labels.delete}</Button>
              </RoleGate>
              {/* Post writes to the general ledger — give it distinct (outline) weight so it never reads as a twin of the ghost Edit link. */}
              <RoleGate allow={['APPROVER', 'ADMIN']}>
                <Button variant="outline" size="sm" onClick={() => cfg.onPost(d)}>{cfg.labels.post}</Button>
              </RoleGate>
            </>
          ) : (
            <>
              {cfg.renderOpenLink(d, cfg.labels.view)}
              {d.status === 'POSTED' ? (
                <RoleGate allow={['APPROVER', 'ADMIN']}>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => cfg.onVoid(d)}>{cfg.labels.void}</Button>
                </RoleGate>
              ) : null}
            </>
          )}
        </div>
      );
    },
  };
}
