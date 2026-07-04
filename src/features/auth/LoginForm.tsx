import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { BookText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/common/FieldError';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';
import { useLogin } from './useLogin';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

// Distinct Bahasa validation messages that do NOT match the field label text
const VALIDATION_MESSAGES = {
  email: 'Email tidak valid',
  password: 'Kata sandi wajib diisi',
} as const;

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useT();
  const login = useLogin();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await login.mutateAsync(values);
      onSuccess();
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 401
          ? t.auth.invalidCredentials
          : t.common.error;
      form.setError('root', { message: msg });
    }
  }

  return (
    <div className="flex min-h-svh flex-col lg:grid lg:grid-cols-2">
      {/* Brand panel: the premium navy identity, committed to the first impression. */}
      <div className="flex flex-col justify-between gap-8 bg-sidebar p-8 text-sidebar-foreground lg:p-12">
        <div className="flex items-center gap-2">
          <BookText className="size-6" aria-hidden="true" />
          <span className="text-lg font-semibold">{t.app.name}</span>
        </div>
        <div className="hidden lg:block">
          <p className="text-2xl font-semibold tracking-tight text-balance">{t.auth.brandHeadline}</p>
          <p className="mt-3 max-w-sm text-sm text-sidebar-foreground/70">{t.auth.brandSub}</p>
        </div>
        <p className="hidden text-xs text-sidebar-foreground/60 lg:block">{t.app.tagline}</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{t.auth.loginTitle}</h1>
            <p className="text-sm text-muted-foreground">{t.auth.loginSubtitle}</p>
          </div>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                {...form.register('email')}
              />
              <FieldError message={form.formState.errors.email ? VALIDATION_MESSAGES.email : undefined} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              <FieldError message={form.formState.errors.password ? VALIDATION_MESSAGES.password : undefined} />
            </div>
            <FieldError message={form.formState.errors.root?.message} />
            <Button
              type="submit"
              className="w-full"
              disabled={login.isPending}
            >
              {t.auth.signIn}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
