import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/journals')({
  component: () => <Outlet />,
});
