import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t.auth.loginTitle}</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
