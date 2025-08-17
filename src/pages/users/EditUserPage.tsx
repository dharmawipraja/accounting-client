import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserForm } from '@/components/users/UserForm';
import { useUsers } from '@/hooks/useUsers';
import type { User } from '@/types/api';
import type { UpdateUserPayload } from '@/types/payloads';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

export function EditUserPage() {
  const navigate = useNavigate();
  const { id } = useParams({ from: '/users/$id/edit' });
  const { getUserById, updateUser } = useUsers();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await getUserById(id);
        setUser(response.data);
      } catch (error) {
        console.error('Failed to load user:', error);
        navigate({ to: '/users' });
      } finally {
        setInitialLoading(false);
      }
    };

    loadUser();
  }, [id, getUserById, navigate]);

  const handleSubmit = async (data: UpdateUserPayload) => {
    setLoading(true);
    try {
      await updateUser(id, data);
      navigate({ to: '/users' });
    } catch (error) {
      console.error('Failed to update user:', error);
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
          {initialLoading ? (
            <>
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

              <Card>
                <CardHeader>
                  <CardTitle>Loading User...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading user data...</div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : !user ? (
            <>
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

              <Card>
                <CardHeader>
                  <CardTitle>User Not Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">The requested user could not be found.</div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
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
                <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
                <p className="text-muted-foreground">
                  Update user information and permissions
                </p>
              </div>

              <UserForm
                user={user}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                loading={loading}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
