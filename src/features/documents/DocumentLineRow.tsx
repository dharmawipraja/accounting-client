import { Trash2 } from 'lucide-react';
import type { Path, UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { AccountSelect } from '@/features/accounts/AccountSelect';
import { MoneyInput } from '@/components/common/MoneyInput';
import { MoneyText } from '@/components/common/MoneyText';
import { TaxCodeMultiSelect } from '@/features/tax-codes/TaxCodeMultiSelect';
import { Money } from '@/lib/money/money';
import type { DocumentHeaderValues } from './documentFormSchema';

export interface DocumentLineRowLabels {
  lineDescription: string;
  account: string;
  selectAccount: string;
  quantity: string;
  unitPrice: string;
  taxes: string;
  removeLine: string;
}

export function DocumentLineRow<TForm extends DocumentHeaderValues>({
  form, index, onRemove, readOnly, allowedTaxKinds, labels,
}: {
  form: UseFormReturn<TForm>;
  index: number;
  onRemove: () => void;
  readOnly?: boolean;
  allowedTaxKinds: string[];
  labels: DocumentLineRowLabels;
}) {
  // `lines.${index}.*` paths are valid because TForm extends DocumentHeaderValues (which has `lines`).
  const p = (field: string) => `lines.${index}.${field}` as Path<TForm>;
  const line = form.watch(`lines.${index}` as Path<TForm>) as DocumentHeaderValues['lines'][number];
  const amount = (() => {
    try { return Money.from(line.quantity || '0').times(line.unitPrice || '0').toApi(); }
    catch { return Money.zero().toApi(); }
  })();

  return (
    <TableRow>
      <TableCell><Input aria-label={labels.lineDescription} disabled={readOnly} {...form.register(p('description'))} /></TableCell>
      <TableCell className="min-w-48">
        <AccountSelect value={line.accountId} onChange={(id) => form.setValue(p('accountId'), id as never, { shouldValidate: true })} aria-label={labels.account} placeholder={labels.selectAccount} disabled={readOnly} />
      </TableCell>
      <TableCell className="w-20"><Input className="text-right" inputMode="decimal" aria-label={labels.quantity} disabled={readOnly} {...form.register(p('quantity'))} /></TableCell>
      <TableCell className="w-32">
        <MoneyInput value={line.unitPrice} onChange={(v) => form.setValue(p('unitPrice'), v as never)} aria-label={labels.unitPrice} disabled={readOnly} />
      </TableCell>
      <TableCell className="min-w-40">
        <TaxCodeMultiSelect value={line.taxCodeIds} onChange={(ids) => form.setValue(p('taxCodeIds'), ids as never)} allowedKinds={allowedTaxKinds} aria-label={labels.taxes} placeholder={labels.taxes} disabled={readOnly} />
      </TableCell>
      <TableCell className="text-right"><MoneyText value={amount} /></TableCell>
      <TableCell>{readOnly ? null : <Button type="button" variant="ghost" size="icon" aria-label={labels.removeLine} onClick={onRemove}><Trash2 className="size-4" /></Button>}</TableCell>
    </TableRow>
  );
}
