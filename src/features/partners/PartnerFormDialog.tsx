import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FormDialog } from '@/components/common/FormDialog';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { useT } from '@/lib/i18n/useT';
import type { Messages } from '@/lib/i18n/messages.id';
import { partnersApi } from './hooks';
import {
  partnerCreateSchema, partnerEditSchema,
  type PartnerCreateValues, type PartnerEditValues, type Partner,
} from './schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  partner?: Partner;
}

/** Translate an i18n-key error message to its Indonesian text. */
function msg(t: Messages, key?: string): string | undefined {
  if (!key) return undefined;
  return (t.partners as Record<string, string>)[key] ?? key;
}

export function PartnerFormDialog({ open, onOpenChange, mode, partner }: Props) {
  if (mode === 'edit' && partner) {
    return <EditForm key={partner.id} partner={partner} open={open} onOpenChange={onOpenChange} />;
  }
  return <CreateForm open={open} onOpenChange={onOpenChange} />;
}

function CreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const create = partnersApi.useCreate();
  const form = useForm<PartnerCreateValues>({
    resolver: zodResolver(partnerCreateSchema),
    defaultValues: { code: '', name: '', npwp: '', email: '', phone: '', address: '', isCustomer: false, isVendor: false },
  });

  function onSubmit(values: PartnerCreateValues) {
    create.mutate(values, {
      onSuccess: () => { toast.success(t.crud.saved); onOpenChange(false); form.reset(); },
      onError: (err) => applyApiErrorToForm(err, form, t),
    });
  }

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t.partners.newPartner}
      onSubmit={form.handleSubmit(onSubmit)} pending={create.isPending}>
      <CreateFields form={form} />
    </FormDialog>
  );
}

function EditForm({ partner, open, onOpenChange }: { partner: Partner; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const update = partnersApi.useUpdate();
  const form = useForm<PartnerEditValues>({
    resolver: zodResolver(partnerEditSchema),
    defaultValues: {
      name: partner.name, npwp: partner.npwp ?? '', email: partner.email ?? '',
      phone: partner.phone ?? '', address: partner.address ?? '',
      isCustomer: partner.isCustomer, isVendor: partner.isVendor, isActive: partner.isActive,
    },
  });

  function onSubmit(values: PartnerEditValues) {
    update.mutate({ id: partner.id, data: values }, {
      onSuccess: () => { toast.success(t.crud.saved); onOpenChange(false); },
      onError: (err) => applyApiErrorToForm(err, form, t),
    });
  }

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t.partners.editPartner}
      description={`${partner.code} — ${partner.name}`}
      onSubmit={form.handleSubmit(onSubmit)} pending={update.isPending}>
      <SharedFields form={form} />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={form.watch('isActive')} onCheckedChange={(v) => form.setValue('isActive', v === true)} />
        {t.crud.active}
      </label>
      <RootError form={form} />
    </FormDialog>
  );
}

function CreateFields({ form }: { form: UseFormReturn<PartnerCreateValues> }) {
  const t = useT();
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="code">{t.partners.code}</Label>
          <Input id="code" {...form.register('code')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">{t.partners.name}</Label>
          <Input id="name" {...form.register('name')} />
        </div>
      </div>
      <SharedFields form={form} />
      <RootError form={form} />
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SharedFields({ form }: { form: UseFormReturn<any> }) {
  const t = useT();
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="npwp">{t.partners.npwp}</Label>
          <Input id="npwp" {...form.register('npwp')} />
          {form.formState.errors.npwp ? (
            <p role="alert" className="text-sm text-destructive">{msg(t, form.formState.errors.npwp.message as string)}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t.partners.email}</Label>
          <Input id="email" {...form.register('email')} />
          {form.formState.errors.email ? (
            <p role="alert" className="text-sm text-destructive">{msg(t, form.formState.errors.email.message as string)}</p>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t.partners.phone}</Label>
          <Input id="phone" {...form.register('phone')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">{t.partners.address}</Label>
          <Input id="address" {...form.register('address')} />
        </div>
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            aria-label={t.partners.customer}
            checked={form.watch('isCustomer')}
            onCheckedChange={(v) => form.setValue('isCustomer', v === true)}
          />
          {t.partners.customer}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            aria-label={t.partners.vendor}
            checked={form.watch('isVendor')}
            onCheckedChange={(v) => form.setValue('isVendor', v === true)}
          />
          {t.partners.vendor}
        </label>
      </div>
      {form.formState.errors.isCustomer ? (
        <p role="alert" className="text-sm text-destructive">{msg(t, form.formState.errors.isCustomer.message as string)}</p>
      ) : null}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RootError({ form }: { form: UseFormReturn<any> }) {
  return form.formState.errors.root ? (
    <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
  ) : null;
}
