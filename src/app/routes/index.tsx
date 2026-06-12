import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw redirect({ to: '/dashboard' as any });
  },
});
