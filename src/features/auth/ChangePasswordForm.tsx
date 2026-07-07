import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/common/FieldError';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';
import { useChangePassword } from './useChangePassword';

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    confirmNewPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'mismatch',
  });
type Values = z.infer<typeof schema>;

export function ChangePasswordForm({
  onSuccess,
  submitLabel,
  currentPasswordLabel,
}: {
  onSuccess: () => void | Promise<void>;
  submitLabel: string;
  currentPasswordLabel: string;
}) {
  const t = useT();
  const change = useChangePassword();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  async function onSubmit(values: Values) {
    try {
      await change.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      await onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        form.setError('currentPassword', { message: t.auth.currentPasswordWrong });
      } else {
        form.setError('root', { message: t.common.error });
      }
    }
  }

  const e = form.formState.errors;
  const newPasswordError = e.newPassword
    ? e.newPassword.type === 'too_big'
      ? t.auth.passwordTooLong
      : t.auth.passwordTooShort
    : undefined;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">{currentPasswordLabel}</Label>
        <Input id="currentPassword" type="password" autoComplete="current-password" {...form.register('currentPassword')} />
        <FieldError message={e.currentPassword?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">{t.auth.newPassword}</Label>
        <Input id="newPassword" type="password" autoComplete="new-password" {...form.register('newPassword')} />
        <p className="text-xs text-muted-foreground">{t.auth.newPasswordHint}</p>
        <FieldError message={newPasswordError} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmNewPassword">{t.auth.confirmNewPassword}</Label>
        <Input id="confirmNewPassword" type="password" autoComplete="new-password" {...form.register('confirmNewPassword')} />
        <FieldError message={e.confirmNewPassword ? t.auth.passwordMismatch : undefined} />
      </div>
      <FieldError message={e.root?.message} />
      <Button type="submit" className="w-full" disabled={change.isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
