import { useMemo, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type Path } from 'react-hook-form';
import { Plus } from 'lucide-react';
import type { ZodType } from 'zod';
import type { UseMutationResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PartnerSelect } from '@/features/partners/PartnerSelect';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';
import type { ApiError } from '@/lib/api/errors';
import { accountsApi } from '@/features/accounts/hooks';
import { FieldError } from '@/components/common/FieldError';
import { useUnsavedGuard, UnsavedGuardDialog } from '@/components/common/useUnsavedGuard';
import { DocumentTotals } from './DocumentTotals';
import { DocumentLineRow } from './DocumentLineRow';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { useDocumentSubmit } from './useDocumentSubmit';
import { EMPTY_LINE, safeAmount, type DocumentHeaderValues } from './documentFormSchema';

export interface DocumentEditorLabels {
  partner: string; selectPartner: string; date: string; dueDate: string; description: string;
  vendorInvoiceNo: string; lineDescription: string; account: string; selectAccount: string;
  quantity: string; unitPrice: string; taxes: string; lineAmount: string; addLine: string;
  removeLine: string; atLeastOneLine: string; required: string; saveDraft: string;
  readOnlyPosted: string; readOnlyVoid: string;
}

export interface ExtraHeaderField<TFormValues> {
  name: Extract<keyof TFormValues, string>;
  label: string;
  inputId: string;
}

export interface DocumentEditorConfig<
  TItem extends { id: string; status: string },
  TFormValues extends DocumentHeaderValues,
  TCreate,
  TUpdate = Partial<TCreate>,
> {
  nature: 'SALE' | 'PURCHASE';
  settlementAccountCode: string;
  allowedTaxKinds: string[];
  partnerFilter: 'customer' | 'vendor';
  formSchema: ZodType<TFormValues>;
  emptyForm: TFormValues;
  toFormValues: (item: TItem) => TFormValues;
  toPayload: (values: TFormValues) => TCreate;
  create: UseMutationResult<TItem, ApiError, TCreate>;
  update: UseMutationResult<TItem, ApiError, { id: string; data: TUpdate }>;
  labels: DocumentEditorLabels;
  docRef: (item: TItem) => string | null | undefined;
  extraHeaderField?: ExtraHeaderField<TFormValues>;
}

export interface DocumentEditorProps<
  TItem extends { id: string; status: string },
  TFormValues extends DocumentHeaderValues,
  TCreate,
  TUpdate = Partial<TCreate>,
> {
  config: DocumentEditorConfig<TItem, TFormValues, TCreate, TUpdate>;
  mode: 'create' | 'edit';
  doc?: TItem;
  readOnly?: boolean;
  onSaved: () => void;
  startEmpty?: boolean;
}

export function DocumentEditor<
  TItem extends { id: string; status: string },
  TFormValues extends DocumentHeaderValues,
  TCreate,
  TUpdate = Partial<TCreate>,
>({ config, mode, doc, readOnly, onSaved, startEmpty }: DocumentEditorProps<TItem, TFormValues, TCreate, TUpdate>) {
  const { create, update, labels } = config;
  const t = useT();
  const accounts = accountsApi.useList();
  const settlementAccountId = accounts.data?.find((a) => a.code === config.settlementAccountCode)?.id;

  const form = useForm<TFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(config.formSchema as any) as any,
    defaultValues: (doc
      ? config.toFormValues(doc)
      : startEmpty
        ? { ...config.emptyForm, lines: [] }
        : config.emptyForm) as never,
  });
  const lines = useFieldArray({ control: form.control, name: 'lines' as never });
  const leavingRef = useRef(false);
  const handlers = useDocumentSubmit(form, () => { leavingRef.current = true; onSaved(); });

  const watched = form.watch('lines' as Path<TFormValues>) as DocumentHeaderValues['lines'] | undefined;
  const previewLines = useMemo(
    () =>
      (watched ?? [])
        .filter((l) => l.accountId)
        .map((l) => ({ accountId: l.accountId, amount: safeAmount(l.quantity, l.unitPrice), taxCodeIds: l.taxCodeIds })),
    [watched],
  );

  function onSubmit(values: TFormValues) {
    if (mode === 'edit' && doc) {
      update.mutate({ id: doc.id, data: config.toPayload(values) as unknown as TUpdate }, handlers);
    } else {
      create.mutate(config.toPayload(values), handlers);
    }
  }

  const errors = form.formState.errors as Record<string, { message?: string } | undefined>;
  const dirty = form.formState.isDirty;
  const guard = useUnsavedGuard(() => dirty && !leavingRef.current);

  return (
    <form onSubmit={form.handleSubmit(onSubmit as never)} className="space-y-6" noValidate>
      <ReadOnlyBanner
        show={!!readOnly}
        status={doc?.status}
        docRef={doc ? config.docRef(doc) : null}
        postedLabel={labels.readOnlyPosted}
        voidLabel={labels.readOnlyVoid}
      />
      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', config.extraHeaderField ? 'md:grid-cols-5' : 'md:grid-cols-4')}>
        <div className="space-y-1.5">
          <Label>{labels.partner}</Label>
          <PartnerSelect value={form.watch('partnerId' as Path<TFormValues>) as string} onChange={(id) => form.setValue('partnerId' as Path<TFormValues>, id as never, { shouldValidate: true })} filter={config.partnerFilter} aria-label={labels.partner} placeholder={labels.selectPartner} disabled={readOnly} />
          <FieldError message={errors.partnerId ? labels.selectPartner : undefined} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">{labels.date}</Label>
          <Input id="date" type="date" aria-label={labels.date} disabled={readOnly} {...form.register('date' as Path<TFormValues>)} />
          <FieldError message={errors.date ? labels.required : undefined} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDate">{labels.dueDate}</Label>
          <Input id="dueDate" type="date" aria-label={labels.dueDate} disabled={readOnly} {...form.register('dueDate' as Path<TFormValues>)} />
        </div>
        {config.extraHeaderField ? (
          <div className="space-y-1.5">
            <Label htmlFor={config.extraHeaderField.inputId}>{config.extraHeaderField.label}</Label>
            <Input id={config.extraHeaderField.inputId} aria-label={config.extraHeaderField.label} disabled={readOnly} {...form.register(config.extraHeaderField.name as unknown as Path<TFormValues>)} />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="desc">{labels.description}</Label>
          <Input id="desc" aria-label={labels.description} disabled={readOnly} {...form.register('description' as Path<TFormValues>)} />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.lineDescription}</TableHead>
              <TableHead>{labels.account}</TableHead>
              <TableHead className="text-right">{labels.quantity}</TableHead>
              <TableHead className="text-right">{labels.unitPrice}</TableHead>
              <TableHead>{labels.taxes}</TableHead>
              <TableHead className="text-right">{labels.lineAmount}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.fields.map((f, i) => (
              <DocumentLineRow key={f.id} form={form} index={i} onRemove={() => lines.remove(i)} readOnly={readOnly} allowedTaxKinds={config.allowedTaxKinds} labels={labels} />
            ))}
          </TableBody>
        </Table>
      </div>

      <FieldError message={errors.lines ? labels.atLeastOneLine : undefined} />

      <div className="flex items-start justify-between gap-4">
        {readOnly ? <div /> : (
          <Button type="button" variant="outline" onClick={() => lines.append({ ...EMPTY_LINE } as never)}>
            <Plus className="size-4" /> {labels.addLine}
          </Button>
        )}
        <DocumentTotals nature={config.nature} settlementAccountId={settlementAccountId} lines={previewLines} />
      </div>

      <FieldError message={errors.root?.message} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSaved}>{t.common.cancel}</Button>
        {readOnly ? null : <Button type="submit" disabled={create.isPending || update.isPending}>{labels.saveDraft}</Button>}
      </div>
      <UnsavedGuardDialog guard={guard} />
    </form>
  );
}
