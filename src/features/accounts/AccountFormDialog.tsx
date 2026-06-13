import { useEffect } from 'react';
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
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { useT } from '@/lib/i18n/useT';
import { SUBTYPE_META, SUBTYPE_OPTIONS, type AccountSubtype } from './account-meta';
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
  const form = useForm<AccountCreateValues>({
    resolver: zodResolver(accountCreateSchema),
    defaultValues: {
      code: '', name: '', subtype: 'CURRENT_ASSET', type: 'ASSET',
      normalBalance: 'DEBIT', cashFlowCategory: 'NONE', isPostable: true, parentCode: '',
    },
  });

  const subtype = form.watch('subtype');
  useEffect(() => {
    const meta = SUBTYPE_META[subtype as AccountSubtype];
    if (meta) {
      form.setValue('type', meta.type);
      form.setValue('normalBalance', meta.defaultNormalBalance);
    }
  }, [subtype, form]);

  function onSubmit(values: AccountCreateValues) {
    create.mutate(
      { ...values, parentCode: values.parentCode || undefined },
      {
        onSuccess: () => { toast.success(t.crud.saved); onOpenChange(false); form.reset(); },
        onError: (err) => applyApiErrorToForm(err, form, t),
      },
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.accounts.newAccount}
      onSubmit={form.handleSubmit(onSubmit)}
      pending={create.isPending}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.accounts.code} htmlFor="code">
          <Input id="code" {...form.register('code')} />
        </Field>
        <Field label={t.accounts.name} htmlFor="name">
          <Input id="name" {...form.register('name')} />
        </Field>
      </div>

      <Field label={t.accounts.subtype} htmlFor="subtype">
        <Select value={subtype} onValueChange={(v) => form.setValue('subtype', v as AccountSubtype)}>
          <SelectTrigger id="subtype" aria-label={t.accounts.subtype}><SelectValue /></SelectTrigger>
          <SelectContent>
            {SUBTYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.accounts.normalBalance} htmlFor="nb">
          <Select
            value={form.watch('normalBalance')}
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
            value={form.watch('cashFlowCategory')}
            onValueChange={(v) => form.setValue('cashFlowCategory', v as AccountCreateValues['cashFlowCategory'])}
          >
            <SelectTrigger id="cf" aria-label={t.accounts.cashFlowCategory}><SelectValue /></SelectTrigger>
            <SelectContent>
              {CASH_FLOW_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.watch('isPostable')}
          onCheckedChange={(v) => form.setValue('isPostable', v === true)}
        />
        {t.accounts.postable}
      </label>

      {form.formState.errors.root ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      ) : null}
      {form.formState.errors.code ? (
        <p role="alert" className="text-sm text-destructive">{form.formState.errors.code.message}</p>
      ) : null}
    </FormDialog>
  );
}

function EditForm({ account, open, onOpenChange }: { account: Account; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const update = accountsApi.useUpdate();
  const form = useForm<AccountEditValues>({
    resolver: zodResolver(accountEditSchema),
    defaultValues: {
      name: account.name,
      cashFlowCategory: account.cashFlowCategory ?? 'NONE',
      isActive: account.isActive,
    },
  });

  function onSubmit(values: AccountEditValues) {
    update.mutate(
      { id: account.id, data: values },
      {
        onSuccess: () => { toast.success(t.crud.saved); onOpenChange(false); },
        onError: (err) => applyApiErrorToForm(err, form, t),
      },
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.accounts.editAccount}
      description={`${account.code} — ${account.name}`}
      onSubmit={form.handleSubmit(onSubmit)}
      pending={update.isPending}
    >
      <Field label={t.accounts.name} htmlFor="ename">
        <Input id="ename" {...form.register('name')} />
      </Field>
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

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
