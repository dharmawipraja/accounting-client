import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { AccountSelect } from '@/components/common/AccountSelect';
import { MoneyInput } from '@/components/common/MoneyInput';
import { useT } from '@/lib/i18n/useT';

export interface JournalLineState {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

export function JournalLineRow({ line, onChange, onRemove }: { line: JournalLineState; onChange: (patch: Partial<JournalLineState>) => void; onRemove: () => void }) {
  const t = useT();
  return (
    <TableRow>
      <TableCell className="min-w-48">
        <AccountSelect value={line.accountId} onChange={(id) => onChange({ accountId: id })} aria-label={t.journals.account} placeholder={t.journals.selectAccount} />
      </TableCell>
      <TableCell className="w-32">
        <MoneyInput value={line.debit} onChange={(v) => onChange({ debit: v, credit: '' })} aria-label={t.journals.debit} />
      </TableCell>
      <TableCell className="w-32">
        <MoneyInput value={line.credit} onChange={(v) => onChange({ credit: v, debit: '' })} aria-label={t.journals.credit} />
      </TableCell>
      <TableCell>
        <Input aria-label={t.journals.lineDescription} value={line.description} onChange={(e) => onChange({ description: e.target.value })} />
      </TableCell>
      <TableCell>
        <Button type="button" variant="ghost" size="icon" aria-label={t.journals.removeLine} onClick={onRemove}><Trash2 className="size-4" /></Button>
      </TableCell>
    </TableRow>
  );
}
