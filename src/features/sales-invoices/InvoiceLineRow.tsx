import { Trash2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { AccountSelect } from '@/components/common/AccountSelect';
import { MoneyInput } from '@/components/common/MoneyInput';
import { TaxCodeMultiSelect } from '@/components/common/TaxCodeMultiSelect';
import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';
import type { InvoiceFormValues } from './schema';

const SALE_KINDS = ['PPN_OUTPUT', 'PPH_PREPAID'];

export function InvoiceLineRow({ form, index, onRemove }: { form: UseFormReturn<InvoiceFormValues>; index: number; onRemove: () => void }) {
  const t = useT();
  const line = form.watch(`lines.${index}`);
  const amount = (() => {
    try { return Money.from(line.quantity || '0').times(line.unitPrice || '0').toRupiah(); }
    catch { return Money.zero().toRupiah(); }
  })();

  return (
    <TableRow>
      <TableCell><Input aria-label={t.salesInvoices.lineDescription} {...form.register(`lines.${index}.description`)} /></TableCell>
      <TableCell className="min-w-48">
        <AccountSelect value={line.accountId} onChange={(id) => form.setValue(`lines.${index}.accountId`, id, { shouldValidate: true })} aria-label={t.salesInvoices.account} placeholder={t.salesInvoices.selectAccount} />
      </TableCell>
      <TableCell className="w-20"><Input className="text-right" inputMode="decimal" aria-label={t.salesInvoices.quantity} {...form.register(`lines.${index}.quantity`)} /></TableCell>
      <TableCell className="w-32">
        <MoneyInput value={line.unitPrice} onChange={(v) => form.setValue(`lines.${index}.unitPrice`, v)} aria-label={t.salesInvoices.unitPrice} />
      </TableCell>
      <TableCell className="min-w-40">
        <TaxCodeMultiSelect value={line.taxCodeIds} onChange={(ids) => form.setValue(`lines.${index}.taxCodeIds`, ids)} allowedKinds={SALE_KINDS} aria-label={t.salesInvoices.taxes} />
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">{amount}</TableCell>
      <TableCell><Button type="button" variant="ghost" size="icon" aria-label={t.salesInvoices.removeLine} onClick={onRemove}><Trash2 className="size-4" /></Button></TableCell>
    </TableRow>
  );
}
