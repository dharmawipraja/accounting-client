import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AccountSelect } from '@/features/accounts/AccountSelect';
import { MasterDataFormDialog } from '@/features/master-data/MasterDataFormDialog';
import { FieldError } from '@/components/common/FieldError';
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
  return (
    <MasterDataFormDialog<TaxCodeCreateValues>
      open={open}
      onOpenChange={onOpenChange}
      title={t.taxCodes.newTaxCode}
      schema={taxCodeCreateSchema}
      defaultValues={{ code: '', name: '', kind: 'PPN_OUTPUT', ratePercent: '', taxAccountId: '' }}
      resetOnSuccess
      submit={(values) => create.mutateAsync({
        code: values.code, name: values.name, kind: values.kind,
        rate: percentToFraction(values.ratePercent), taxAccountId: values.taxAccountId,
      })}
      fields={(form) => <TaxCodeCreateFields form={form} />}
    />
  );
}

function EditForm({ taxCode, open, onOpenChange }: { taxCode: TaxCode; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const update = taxCodesApi.useUpdate();
  return (
    <MasterDataFormDialog<TaxCodeEditValues>
      open={open}
      onOpenChange={onOpenChange}
      title={t.taxCodes.editTaxCode}
      description={`${taxCode.code} — ${taxCode.name}`}
      schema={taxCodeEditSchema}
      defaultValues={{ name: taxCode.name, ratePercent: fractionToPercent(taxCode.rate), isActive: taxCode.isActive }}
      submit={(values) => update.mutateAsync({
        id: taxCode.id, data: { name: values.name, rate: percentToFraction(values.ratePercent), isActive: values.isActive },
      })}
      fields={(form) => <TaxCodeEditFields form={form} />}
    />
  );
}

function TaxCodeCreateFields({ form }: { form: UseFormReturn<TaxCodeCreateValues> }) {
  const t = useT();
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rate">{t.taxCodes.rateLabel}</Label>
          <Input id="rate" inputMode="decimal" {...form.register('ratePercent')} />
          <FieldError message={err(t, form.formState.errors.ratePercent?.message as string | undefined)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t.taxCodes.taxAccount}</Label>
          <AccountSelect
            value={form.watch('taxAccountId')}
            onChange={(id) => form.setValue('taxAccountId', id, { shouldValidate: true })}
            placeholder={t.taxCodes.selectAccount}
            aria-label={t.taxCodes.taxAccount}
          />
          <FieldError message={err(t, form.formState.errors.taxAccountId?.message as string | undefined)} />
        </div>
      </div>
    </>
  );
}

function TaxCodeEditFields({ form }: { form: UseFormReturn<TaxCodeEditValues> }) {
  const t = useT();
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="ename">{t.taxCodes.name}</Label>
        <Input id="ename" {...form.register('name')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="erate">{t.taxCodes.rateLabel}</Label>
        <Input id="erate" inputMode="decimal" {...form.register('ratePercent')} />
        <FieldError message={err(t, form.formState.errors.ratePercent?.message as string | undefined)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={form.watch('isActive')} onCheckedChange={(v) => form.setValue('isActive', v === true)} />
        {t.crud.active}
      </label>
    </>
  );
}
