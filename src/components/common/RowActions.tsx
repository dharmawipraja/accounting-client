import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useT } from '@/lib/i18n/useT';
import { hasRole, useRole } from './RoleGate';

interface RowActionsProps {
  onEdit: () => void;
  /** Current active state of the row; decides the toggle label (Aktifkan / Nonaktifkan). */
  active?: boolean;
  onToggleActive?: () => void;
  onDelete?: () => void;
  /** Label for the destructive `onDelete` item. Defaults to `t.common.delete`;
   *  callers can repurpose the slot (e.g. users' "Setel ulang kata sandi"). */
  deleteLabel?: string;
}

export function RowActions({ onEdit, active, onToggleActive, onDelete, deleteLabel }: RowActionsProps) {
  const t = useT();
  const role = useRole();
  const canEdit = hasRole(role, ['ACCOUNTANT', 'APPROVER', 'ADMIN']);
  const canAdmin = hasRole(role, ['ADMIN']);
  if (!canEdit && !canAdmin) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.common.actions}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit ? (
          <DropdownMenuItem onSelect={onEdit}>{t.common.edit}</DropdownMenuItem>
        ) : null}
        {canAdmin && onToggleActive ? (
          <DropdownMenuItem onSelect={onToggleActive}>
            {active ? t.crud.deactivate : t.crud.activate}
          </DropdownMenuItem>
        ) : null}
        {canAdmin && onDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              {deleteLabel ?? t.common.delete}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
