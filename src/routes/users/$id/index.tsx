import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserDetailPage } from '@/pages/users/UserDetailPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/users/$id/')({
  component: UserDetailComponent,
});

function UserDetailComponent() {
  const { id } = Route.useParams();
  
  return (
    <ProtectedRoute 
      requiredRoles={['ADMIN', 'MANAJER']} 
      allowOwnAccess={true}
      targetUserId={id}
    >
      <UserDetailPage />
    </ProtectedRoute>
  );
}
