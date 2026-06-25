import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PartnerSelect } from '@/features/partners/PartnerSelect';
import { AccountSelect } from '@/features/accounts/AccountSelect';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';
import { useOpenDocuments } from './useOpenDocuments';
import { AllocationTable } from './AllocationTable';
import { PaymentTotals } from './PaymentTotals';
import { paymentsApi } from './hooks';
import type { Payment, PaymentHeaderValues } from './schema';

const headerSchema = z.object({
  partnerId: z.string().min(1, 'selectPartner'),
  date: z.string().min(1, 'required'),
  cashAccountId: z.string().min(1, 'selectCashAccount'),
  description: z.string(),
});

interface Props {
  mode: 'create' | 'edit';
  payment?: Payment;
  onSaved: () => void;
  readOnly?: boolean;
  direction?: 'RECEIPT' | 'DISBURSEMENT';
}

export function PaymentForm({ mode, payment, onSaved, readOnly, direction: directionProp = 'RECEIPT' }: Props) {
  const t = useT();
  const direction = payment?.direction ?? directionProp;
  const create = paymentsApi.useCreate();
  const update = paymentsApi.useUpdate();

  const form = useForm<PaymentHeaderValues>({
    resolver: zodResolver(headerSchema),
    defaultValues: payment
      ? { partnerId: payment.partnerId, date: payment.date.slice(0, 10), cashAccountId: payment.cashAccountId, description: payment.description ?? '' }
      : { partnerId: '', date: '', cashAccountId: '', description: '' },
  });

  const partnerId = form.watch('partnerId');
  const openDocuments = useOpenDocuments(direction, partnerId);

  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    payment?.allocations.forEach((a) => {
      const docId = direction === 'RECEIPT' ? a.salesInvoiceId : a.purchaseBillId;
      if (docId) seed[docId] = a.amount;
    });
    return seed;
  });
  const [allocError, setAllocError] = useState<string | null>(null);

  function buildAllocations() {
    return Object.entries(amounts)
      .filter(([, v]) => { try { return Money.from(v || '0').gt(Money.zero()); } catch { return false; } })
      .map(([id, amount]) => direction === 'RECEIPT'
        ? { salesInvoiceId: id, amount: Money.from(amount).toApi() }
        : { purchaseBillId: id, amount: Money.from(amount).toApi() });
  }

  function validateAllocations(): boolean {
    const allocs = buildAllocations();
    if (allocs.length === 0) { setAllocError(t.payments.atLeastOneAllocation); return false; }
    const over = openDocuments.some((doc) => {
      const v = amounts[doc.id];
      try { return v ? Money.from(v).gt(Money.from(doc.outstanding)) : false; } catch { return false; }
    });
    if (over) { setAllocError(t.payments.overAllocated); return false; }
    setAllocError(null);
    return true;
  }

  function onSubmit(values: PaymentHeaderValues) {
    if (!validateAllocations()) return;
    const payload = { direction, partnerId: values.partnerId, date: values.date, cashAccountId: values.cashAccountId, description: values.description || undefined, allocations: buildAllocations() };
    const onError = (err: unknown) => applyApiErrorToForm(err, form, t);
    if (mode === 'edit' && payment) {
      update.mutate({ id: payment.id, data: payload }, { onSuccess: () => { toast.success(t.crud.saved); onSaved(); }, onError });
    } else {
      create.mutate(payload, { onSuccess: () => { toast.success(t.crud.saved); onSaved(); }, onError });
    }
  }

  const partnerLabel = direction === 'RECEIPT' ? t.payments.partner : t.payments.partnerVendor;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {readOnly ? (
        <div className="rounded-md border border-muted bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {payment?.status === 'VOID' ? t.payments.readOnlyVoid : t.payments.readOnlyPosted}
          {payment?.ref ? ` (${payment.ref})` : ''}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>{partnerLabel}</Label>
          <PartnerSelect value={form.watch('partnerId')} onChange={(id) => form.setValue('partnerId', id, { shouldValidate: true })} filter={direction === 'RECEIPT' ? 'customer' : 'vendor'} aria-label={partnerLabel} placeholder={partnerLabel} disabled={readOnly} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pdate">{t.payments.date}</Label>
          <Input id="pdate" type="date" aria-label={t.payments.date} disabled={readOnly} {...form.register('date')} />
        </div>
        <div className="space-y-1.5">
          <Label>{t.payments.cashAccount}</Label>
          <AccountSelect value={form.watch('cashAccountId')} onChange={(id) => form.setValue('cashAccountId', id, { shouldValidate: true })} aria-label={t.payments.cashAccount} placeholder={t.payments.selectCashAccount} disabled={readOnly} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pdesc">{t.payments.description}</Label>
          <Input id="pdesc" aria-label={t.payments.description} disabled={readOnly} {...form.register('description')} />
        </div>
      </div>

      <AllocationTable
        documents={openDocuments}
        amounts={amounts}
        onAmountChange={(id, raw) => setAmounts((prev) => ({ ...prev, [id]: raw }))}
        readOnly={readOnly}
        partnerSelected={!!partnerId}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          {allocError ? <p role="alert" className="text-sm text-destructive">{allocError}</p> : null}
          {form.formState.errors.partnerId ? <p role="alert" className="text-sm text-destructive">{t.salesInvoices.selectPartner}</p> : null}
          {form.formState.errors.cashAccountId ? <p role="alert" className="text-sm text-destructive">{t.payments.selectCashAccount}</p> : null}
          {form.formState.errors.date ? <p role="alert" className="text-sm text-destructive">{t.salesInvoices.required}</p> : null}
          {form.formState.errors.root ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p> : null}
        </div>
        <PaymentTotals amounts={amounts} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSaved}>{t.common.cancel}</Button>
        {readOnly ? null : <Button type="submit" disabled={create.isPending || update.isPending}>{t.payments.savePayment}</Button>}
      </div>
    </form>
  );
}
