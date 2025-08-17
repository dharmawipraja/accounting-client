import { ProtectedRoute } from '@/components/ProtectedRoute';
import { CreateUserPage } from '@/pages/users/CreateUserPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/users/new')({
  component: NewUserComponent,
});

function NewUserComponent() {
  return (
    <ProtectedRoute>
      <CreateUserPage />
    </ProtectedRoute>
  );
}
