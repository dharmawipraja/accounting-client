import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { UserForm } from '@/components/users/UserForm';
import { useUsers } from '@/hooks/useUsers';
import type { CreateUserPayload, UpdateUserPayload } from '@/types/payloads';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export function CreateUserPage() {
  const navigate = useNavigate();
  const { createUser } = useUsers();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CreateUserPayload | UpdateUserPayload) => {
    setLoading(true);
    try {
      await createUser(data as CreateUserPayload);
      navigate({ to: '/users' });
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate({ to: '/users' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/users' })}
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Users</span>
            </Button>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create User</h1>
            <p className="text-muted-foreground">
              Add a new user to the system with appropriate permissions
            </p>
          </div>

          <UserForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
}
