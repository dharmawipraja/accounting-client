import { useEffect } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MasterDataFormDialog } from '@/features/master-data/MasterDataFormDialog';
import { FieldError } from '@/components/common/FieldError';
import { useT } from '@/lib/i18n/useT';
import { SUBTYPE_META, SUBTYPE_VALUES, subtypeLabel, cashFlowCategoryLabel, type AccountSubtype } from './account-meta';
import { accountsApi } from './hooks';
import {
  accountCreateSchema, accountEditSchema,
  type AccountCreateValues, type AccountEditValues, type Account,
} from './schema';

const CASH_FLOW_OPTIONS = ['NONE', 'OPERATING', 'INVESTING', 'FINANCING'] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  account?: Account;
}

export function AccountFormDialog({ open, onOpenChange, mode, account }: Props) {
  if (mode === 'edit' && account) {
    return <EditForm key={account.id} account={account} open={open} onOpenChange={onOpenChange} />;
  }
  return <CreateForm open={open} onOpenChange={onOpenChange} />;
}

function CreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const create = accountsApi.useCreate();
  return (
    <MasterDataFormDialog<AccountCreateValues>
      open={open}
      onOpenChange={onOpenChange}
      title={t.accounts.newAccount}
      schema={accountCreateSchema}
      defaultValues={{
        code: '', name: '', subtype: 'CURRENT_ASSET', type: 'ASSET',
        normalBalance: 'DEBIT', cashFlowCategory: 'NONE', isPostable: true, parentCode: '',
      }}
      resetOnSuccess
      submit={(values) => create.mutateAsync({ ...values, parentCode: values.parentCode || undefined })}
      fields={(form) => <AccountCreateFields form={form} />}
    />
  );
}

function EditForm({ account, open, onOpenChange }: { account: Account; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const update = accountsApi.useUpdate();
  return (
    <MasterDataFormDialog<AccountEditValues>
      open={open}
      onOpenChange={onOpenChange}
      title={t.accounts.editAccount}
      description={`${account.code} — ${account.name}`}
      schema={accountEditSchema}
      defaultValues={{ name: account.name, cashFlowCategory: account.cashFlowCategory ?? 'NONE', isActive: account.isActive }}
      submit={(values) => update.mutateAsync({ id: account.id, data: values })}
      fields={(form) => <AccountEditFields form={form} />}
    />
  );
}

function AccountCreateFields({ form }: { form: UseFormReturn<AccountCreateValues> }) {
  const t = useT();
  // useWatch (a hook), not form.watch (a method): under React Compiler this
  // component is memoized, and form.watch's result gets cached — so controlled
  // inputs bound to it never update. useWatch subscribes reactively instead.
  const { control } = form;
  const subtype = useWatch({ control, name: 'subtype' });
  const normalBalance = useWatch({ control, name: 'normalBalance' });
  const cashFlowCategory = useWatch({ control, name: 'cashFlowCategory' });
  const isPostable = useWatch({ control, name: 'isPostable' });
  useEffect(() => {
    const meta = SUBTYPE_META[subtype as AccountSubtype];
    if (meta) {
      form.setValue('type', meta.type);
      form.setValue('normalBalance', meta.defaultNormalBalance);
    }
  }, [subtype, form]);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t.accounts.code} htmlFor="code">
          <Input id="code" {...form.register('code')} />
        </Field>
        <Field label={t.accounts.name} htmlFor="name">
          <Input id="name" {...form.register('name')} />
          <FieldError message={form.formState.errors.name ? t.accounts.required : undefined} />
        </Field>
      </div>

      <Field label={t.accounts.subtype} htmlFor="subtype">
        <Select value={subtype} onValueChange={(v) => form.setValue('subtype', v as AccountSubtype)}>
          <SelectTrigger id="subtype" aria-label={t.accounts.subtype}><SelectValue /></SelectTrigger>
          <SelectContent>
            {SUBTYPE_VALUES.map((v) => (
              <SelectItem key={v} value={v}>{subtypeLabel(t, v)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t.accounts.normalBalance} htmlFor="nb">
          <Select
            value={normalBalance}
            onValueChange={(v) => form.setValue('normalBalance', v as 'DEBIT' | 'CREDIT')}
          >
            <SelectTrigger id="nb" aria-label={t.accounts.normalBalance}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DEBIT">{t.accounts.debit}</SelectItem>
              <SelectItem value="CREDIT">{t.accounts.credit}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t.accounts.cashFlowCategory} htmlFor="cf">
          <Select
            value={cashFlowCategory}
            onValueChange={(v) => form.setValue('cashFlowCategory', v as AccountCreateValues['cashFlowCategory'])}
          >
            <SelectTrigger id="cf" aria-label={t.accounts.cashFlowCategory}><SelectValue /></SelectTrigger>
            <SelectContent>
              {CASH_FLOW_OPTIONS.map((c) => <SelectItem key={c} value={c}>{cashFlowCategoryLabel(t, c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={isPostable}
          onCheckedChange={(v) => form.setValue('isPostable', v === true)}
        />
        {t.accounts.postable}
      </label>
    </>
  );
}

function AccountEditFields({ form }: { form: UseFormReturn<AccountEditValues> }) {
  const t = useT();
  const { control } = form;
  const cashFlowCategory = useWatch({ control, name: 'cashFlowCategory' });
  const isActive = useWatch({ control, name: 'isActive' });
  return (
    <>
      <Field label={t.accounts.name} htmlFor="ename">
        <Input id="ename" {...form.register('name')} />
        <FieldError message={form.formState.errors.name ? t.accounts.required : undefined} />
      </Field>
      <Field label={t.accounts.cashFlowCategory} htmlFor="ecf">
        <Select
          value={cashFlowCategory}
          onValueChange={(v) => form.setValue('cashFlowCategory', v as AccountEditValues['cashFlowCategory'])}
        >
          <SelectTrigger id="ecf" aria-label={t.accounts.cashFlowCategory}><SelectValue /></SelectTrigger>
          <SelectContent>
            {CASH_FLOW_OPTIONS.map((c) => <SelectItem key={c} value={c}>{cashFlowCategoryLabel(t, c)}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={isActive} onCheckedChange={(v) => form.setValue('isActive', v === true)} />
        {t.crud.active}
      </label>
    </>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
