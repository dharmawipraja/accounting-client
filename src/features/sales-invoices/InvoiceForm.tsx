import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PartnerSelect } from '@/components/common/PartnerSelect';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';
import { accountsApi } from '@/features/accounts/hooks';
import { InvoiceLineRow } from './InvoiceLineRow';
import { DocumentTotals } from '@/features/documents/DocumentTotals';
import { salesInvoicesApi } from './hooks';
import { invoiceFormSchema, type InvoiceFormValues, type SalesInvoice } from './schema';

const EMPTY_LINE = { description: '', accountId: '', quantity: '1', unitPrice: '', taxCodeIds: [] as string[] };

function toFormValues(inv: SalesInvoice): InvoiceFormValues {
  return {
    partnerId: inv.partnerId,
    date: inv.date.slice(0, 10),
    dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : '',
    description: inv.description ?? '',
    lines: inv.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
  };
}

interface Props {
  mode: 'create' | 'edit';
  invoice?: SalesInvoice;
  onSaved: () => void;
  startEmpty?: boolean;
  readOnly?: boolean;
}

export function InvoiceForm({ mode, invoice, onSaved, startEmpty, readOnly }: Props) {
  const t = useT();
  const create = salesInvoicesApi.useCreate();
  const update = salesInvoicesApi.useUpdate();
  const accounts = accountsApi.useList();
  const arAccountId = accounts.data?.find((a) => a.code === '1-1200')?.id;

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: invoice
      ? toFormValues(invoice)
      : { partnerId: '', date: '', dueDate: '', description: '', lines: startEmpty ? [] : [{ ...EMPTY_LINE }] },
  });
  const lines = useFieldArray({ control: form.control, name: 'lines' });

  const watched = form.watch('lines');
  const previewLines = useMemo(
    () =>
      (watched ?? [])
        .filter((l) => l.accountId)
        .map((l) => ({ accountId: l.accountId, amount: safeAmount(l.quantity, l.unitPrice), taxCodeIds: l.taxCodeIds })),
    [watched],
  );

  function onSubmit(values: InvoiceFormValues) {
    const payload = {
      partnerId: values.partnerId,
      date: values.date,
      dueDate: values.dueDate || undefined,
      description: values.description || undefined,
      lines: values.lines.map((l) => ({ description: l.description, accountId: l.accountId, quantity: l.quantity, unitPrice: l.unitPrice, taxCodeIds: l.taxCodeIds })),
    };
    const onError = (err: unknown) => applyApiErrorToForm(err, form, t);
    if (mode === 'edit' && invoice) {
      update.mutate({ id: invoice.id, data: payload }, { onSuccess: () => { toast.success(t.crud.saved); onSaved(); }, onError });
    } else {
      create.mutate(payload, { onSuccess: () => { toast.success(t.crud.saved); onSaved(); }, onError });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {readOnly ? (
        <div className="rounded-md border border-muted bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {invoice?.status === 'VOID' ? t.salesInvoices.readOnlyVoid : t.salesInvoices.readOnlyPosted}
          {invoice?.invoiceRef ? ` (${invoice.invoiceRef})` : ''}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>{t.salesInvoices.partner}</Label>
          <PartnerSelect value={form.watch('partnerId')} onChange={(id) => form.setValue('partnerId', id, { shouldValidate: true })} filter="customer" aria-label={t.salesInvoices.partner} placeholder={t.salesInvoices.selectPartner} disabled={readOnly} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">{t.salesInvoices.date}</Label>
          <Input id="date" type="date" aria-label={t.salesInvoices.date} disabled={readOnly} {...form.register('date')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDate">{t.salesInvoices.dueDate}</Label>
          <Input id="dueDate" type="date" aria-label={t.salesInvoices.dueDate} disabled={readOnly} {...form.register('dueDate')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">{t.salesInvoices.description}</Label>
          <Input id="desc" aria-label={t.salesInvoices.description} disabled={readOnly} {...form.register('description')} />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.salesInvoices.lineDescription}</TableHead>
              <TableHead>{t.salesInvoices.account}</TableHead>
              <TableHead className="text-right">{t.salesInvoices.quantity}</TableHead>
              <TableHead className="text-right">{t.salesInvoices.unitPrice}</TableHead>
              <TableHead>{t.salesInvoices.taxes}</TableHead>
              <TableHead className="text-right">{t.salesInvoices.lineAmount}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.fields.map((f, i) => (
              <InvoiceLineRow key={f.id} form={form} index={i} onRemove={() => lines.remove(i)} readOnly={readOnly} />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-start justify-between gap-4">
        {readOnly ? <div /> : (
          <Button type="button" variant="outline" onClick={() => lines.append({ ...EMPTY_LINE })}>
            <Plus className="size-4" /> {t.salesInvoices.addLine}
          </Button>
        )}
        <DocumentTotals nature="SALE" settlementAccountId={arAccountId} lines={previewLines} />
      </div>

      {form.formState.errors.lines ? (
        <p role="alert" className="text-sm text-destructive">{t.salesInvoices.atLeastOneLine}</p>
      ) : null}
      {form.formState.errors.partnerId ? (
        <p role="alert" className="text-sm text-destructive">{t.salesInvoices.selectPartner}</p>
      ) : null}
      {form.formState.errors.date ? (
        <p role="alert" className="text-sm text-destructive">{t.salesInvoices.required}</p>
      ) : null}
      {form.formState.errors.root ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSaved}>{t.common.cancel}</Button>
        {readOnly ? null : (
          <Button type="submit" disabled={create.isPending || update.isPending}>{t.salesInvoices.saveDraft}</Button>
        )}
      </div>
    </form>
  );
}

function safeAmount(qty: string, price: string): string {
  try {
    return Money.from(qty || '0').times(price || '0').toApi();
  } catch {
    return '0';
  }
}
