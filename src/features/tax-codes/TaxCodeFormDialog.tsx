import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FormDialog } from '@/components/common/FormDialog';
import { AccountSelect } from '@/features/accounts/AccountSelect';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { useT } from '@/lib/i18n/useT';
import type { Messages } from '@/lib/i18n/messages.id';
import { taxCodesApi } from './hooks';
import { percentToFraction, fractionToPercent } from './rate';
import {
  taxCodeCreateSchema, taxCodeEditSchema,
  type TaxCodeCreateValues, type TaxCodeEditValues, type TaxCode, type TaxKind,
} from './schema';

const KIND_OPTIONS: { value: TaxKind; key: keyof Messages['taxCodes'] }[] = [
  { value: 'PPN_OUTPUT', key: 'kindPpnOutput' },
  { value: 'PPN_INPUT', key: 'kindPpnInput' },
  { value: 'PPH_PAYABLE', key: 'kindPphPayable' },
  { value: 'PPH_PREPAID', key: 'kindPphPrepaid' },
];

function err(t: Messages, key?: string): string | undefined {
  if (!key) return undefined;
  return (t.taxCodes as Record<string, string>)[key] ?? key;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  taxCode?: TaxCode;
}

export function TaxCodeFormDialog({ open, onOpenChange, mode, taxCode }: Props) {
  if (mode === 'edit' && taxCode) {
    return <EditForm key={taxCode.id} taxCode={taxCode} open={open} onOpenChange={onOpenChange} />;
  }
  return <CreateForm open={open} onOpenChange={onOpenChange} />;
}

function CreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const create = taxCodesApi.useCreate();
  const form = useForm<TaxCodeCreateValues>({
    resolver: zodResolver(taxCodeCreateSchema),
    defaultValues: { code: '', name: '', kind: 'PPN_OUTPUT', ratePercent: '', taxAccountId: '' },
  });

  function onSubmit(values: TaxCodeCreateValues) {
    create.mutate(
      { code: values.code, name: values.name, kind: values.kind, rate: percentToFraction(values.ratePercent), taxAccountId: values.taxAccountId },
      {
        onSuccess: () => { toast.success(t.crud.saved); onOpenChange(false); form.reset(); },
        onError: (e) => applyApiErrorToForm(e, form, t),
      },
    );
  }

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t.taxCodes.newTaxCode}
      onSubmit={form.handleSubmit(onSubmit)} pending={create.isPending}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="code">{t.taxCodes.code}</Label>
          <Input id="code" {...form.register('code')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">{t.taxCodes.name}</Label>
          <Input id="name" {...form.register('name')} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="kind">{t.taxCodes.kind}</Label>
        <Select value={form.watch('kind')} onValueChange={(v) => form.setValue('kind', v as TaxKind)}>
          <SelectTrigger id="kind" aria-label={t.taxCodes.kind}><SelectValue /></SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{t.taxCodes[o.key]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="rate">{t.taxCodes.rate} (%)</Label>
          <Input id="rate" inputMode="decimal" {...form.register('ratePercent')} />
          {form.formState.errors.ratePercent ? (
            <p role="alert" className="text-sm text-destructive">{err(t, form.formState.errors.ratePercent.message as string)}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>{t.taxCodes.taxAccount}</Label>
          <AccountSelect
            value={form.watch('taxAccountId')}
            onChange={(id) => form.setValue('taxAccountId', id, { shouldValidate: true })}
            placeholder={t.taxCodes.selectAccount}
            aria-label={t.taxCodes.taxAccount}
          />
          {form.formState.errors.taxAccountId ? (
            <p role="alert" className="text-sm text-destructive">{err(t, form.formState.errors.taxAccountId.message as string)}</p>
          ) : null}
        </div>
      </div>

      {form.formState.errors.root ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      ) : null}
      {form.formState.errors.code ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.code.message}</p>
      ) : null}
    </FormDialog>
  );
}

function EditForm({ taxCode, open, onOpenChange }: { taxCode: TaxCode; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const update = taxCodesApi.useUpdate();
  const form = useForm<TaxCodeEditValues>({
    resolver: zodResolver(taxCodeEditSchema),
    defaultValues: { name: taxCode.name, ratePercent: fractionToPercent(taxCode.rate), isActive: taxCode.isActive },
  });

  function onSubmit(values: TaxCodeEditValues) {
    update.mutate(
      { id: taxCode.id, data: { name: values.name, rate: percentToFraction(values.ratePercent), isActive: values.isActive } },
      {
        onSuccess: () => { toast.success(t.crud.saved); onOpenChange(false); },
        onError: (e) => applyApiErrorToForm(e, form, t),
      },
    );
  }

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t.taxCodes.editTaxCode}
      description={`${taxCode.code} — ${taxCode.name}`}
      onSubmit={form.handleSubmit(onSubmit)} pending={update.isPending}>
      <div className="space-y-1.5">
        <Label htmlFor="ename">{t.taxCodes.name}</Label>
        <Input id="ename" {...form.register('name')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="erate">{t.taxCodes.rate} (%)</Label>
        <Input id="erate" inputMode="decimal" {...form.register('ratePercent')} />
        {form.formState.errors.ratePercent ? (
          <p role="alert" className="text-sm text-destructive">{err(t, form.formState.errors.ratePercent.message as string)}</p>
        ) : null}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={form.watch('isActive')} onCheckedChange={(v) => form.setValue('isActive', v === true)} />
        {t.crud.active}
      </label>
      {form.formState.errors.root ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      ) : null}
    </FormDialog>
  );
}
