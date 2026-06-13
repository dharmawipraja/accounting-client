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
  onDeactivate?: () => void;
  onDelete?: () => void;
}

export function RowActions({ onEdit, onDeactivate, onDelete }: RowActionsProps) {
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
        {canAdmin && onDeactivate ? (
          <DropdownMenuItem onSelect={onDeactivate}>{t.crud.deactivate}</DropdownMenuItem>
        ) : null}
        {canAdmin && onDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              {t.common.delete}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
