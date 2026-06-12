import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LoginForm } from '@/features/auth/LoginForm';

export const Route = createFileRoute('/login')({
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = useNavigate();
  return (
    <LoginForm
      onSuccess={() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigate({ to: '/dashboard' as any })
      }
    />
  );
}
