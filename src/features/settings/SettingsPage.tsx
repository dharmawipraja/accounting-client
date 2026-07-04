import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { FieldError } from '@/components/common/FieldError';
import { useRole } from '@/components/common/RoleGate';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { MONTHS_ID } from '@/lib/format/months';
import { useT } from '@/lib/i18n/useT';
import { useCompanySettings, useUpdateCompanySettings } from './hooks';
import { companySettingsFormSchema, toFormValues, type CompanySettings, type CompanySettingsForm } from './schema';

export function SettingsPage() {
  const t = useT();
  const query = useCompanySettings();
  return (
    <div>
      <PageHeader title={t.settings.title} />
      <QueryState query={query} loading={<SkeletonForm fields={5} />} onRetry>
        {(settings) => <SettingsForm settings={settings} />}
      </QueryState>
    </div>
  );
}

function SettingsForm({ settings }: { settings: CompanySettings }) {
  const t = useT();
  const isAdmin = useRole() === 'ADMIN';
  const update = useUpdateCompanySettings();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<CompanySettingsForm | null>(null);
  const form = useForm<CompanySettingsForm>({
    resolver: zodResolver(companySettingsFormSchema),
    defaultValues: toFormValues(settings),
  });

  const save = (values: CompanySettingsForm) => {
    update.mutate(values, {
      onSuccess: () => toast.success(t.settings.saved),
      onError: (err) => applyApiErrorToForm(err, form, t),
    });
  };

  const onSubmit = (values: CompanySettingsForm) => {
    if (!values.segregationOfDutiesEnabled && settings.segregationOfDutiesEnabled) {
      setPending(values);
      setConfirmOpen(true);
    } else {
      save(values);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="legalName">{t.settings.legalName}</Label>
        <Input id="legalName" disabled={!isAdmin} {...form.register('legalName')} />
        <FieldError message={form.formState.errors.legalName ? t.settings.legalNameRequired : undefined} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="npwp">{t.settings.npwp}</Label>
        <Input id="npwp" disabled={!isAdmin} {...form.register('npwp')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">{t.settings.address}</Label>
        <Textarea id="address" disabled={!isAdmin} {...form.register('address')} />
      </div>
      <div className="space-y-1.5">
        <Label>{t.settings.fiscalYearStart}</Label>
        <Controller
          control={form.control}
          name="fiscalYearStartMonth"
          render={({ field }) => (
            <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} disabled={!isAdmin}>
              <SelectTrigger className="w-48" aria-label={t.settings.fiscalYearStart}><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_ID.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t.settings.currency}</Label>
        <p className="text-sm text-muted-foreground">{settings.baseCurrency ?? 'IDR'}</p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">{t.settings.sod}</p>
          <p className="text-xs text-muted-foreground">{t.settings.sodHelp}</p>
        </div>
        <Controller control={form.control} name="segregationOfDutiesEnabled" render={({ field }) => (
          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!isAdmin} aria-label={t.settings.sod} />
        )} />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">{t.settings.pkp}</p>
          <p className="text-xs text-muted-foreground">{t.settings.pkpHelp}</p>
        </div>
        <Controller control={form.control} name="isPkp" render={({ field }) => (
          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!isAdmin} aria-label={t.settings.pkp} />
        )} />
      </div>

      {isAdmin ? (
        <Button type="submit" disabled={update.isPending}>{t.settings.save}</Button>
      ) : (
        <p className="text-sm text-muted-foreground">{t.settings.adminOnly}</p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t.settings.sod}
        description={t.settings.confirmDisableSod}
        confirmLabel={t.settings.save}
        destructive
        pending={update.isPending}
        onConfirm={() => { setConfirmOpen(false); if (pending) save(pending); }}
      />
    </form>
  );
}
