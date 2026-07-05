import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { LoginForm } from '@/features/auth/LoginForm';
import { sanitizeRedirect } from '@/features/auth/guard';

export const Route = createFileRoute('/login')({
  // `redirect` carries the deep link the auth guard bounced here from; only
  // sanitized in-app paths survive (open-redirect guard).
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = sanitizeRedirect(search.redirect);
    return redirect ? { redirect } : {};
  },
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect } = Route.useSearch();
  return (
    <LoginForm
      onSuccess={() => {
        if (redirect) router.history.push(redirect);
        else navigate({ to: '/dashboard' });
      }}
    />
  );
}
