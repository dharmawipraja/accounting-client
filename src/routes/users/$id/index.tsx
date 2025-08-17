import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserDetailPage } from '@/pages/users/UserDetailPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/users/$id/')({
  component: UserDetailComponent,
});

function UserDetailComponent() {
  return (
    <ProtectedRoute>
      <UserDetailPage />
    </ProtectedRoute>
  );
}
