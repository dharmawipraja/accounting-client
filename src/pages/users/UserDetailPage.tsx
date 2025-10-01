import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/hooks/useTranslation'
import { useUsers } from '@/hooks/useUsers'
import type { User } from '@/types/api'
import { formatDate } from '@/utils/formatters'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Edit, Shield, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function UserDetailPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams({ from: '/users/$id/' })
  const { getUserById, deleteUser } = useUsers()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await getUserById(id)
        setUser(response.data)
      } catch {
        toast.error(t('errors.failedToLoadUserDetails'))
        navigate({ to: '/users' })
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [id, getUserById, navigate])

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await deleteUser(id)
      navigate({ to: '/users' })
    } catch {
      toast.error(t('errors.failedToDeleteUser'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin'
      case 'MANAJER':
        return 'Manager'
      case 'AKUNTAN':
        return 'Accountant'
      case 'KASIR':
        return 'Cashier'
      case 'KOLEKTOR':
        return 'Collector'
      case 'NASABAH':
        return 'User'
      default:
        return role
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive'
      case 'MANAJER':
        return 'default'
      case 'AKUNTAN':
        return 'secondary'
      case 'KASIR':
        return 'outline'
      case 'KOLEKTOR':
        return 'outline'
      case 'NASABAH':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-3 py-4 mx-auto sm:px-6 lg:px-8">
        <div className="space-y-4 sm:space-y-6">
          {loading ? (
            <>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ to: '/users' })}
                  className="flex items-center space-x-1 md:hidden"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('labels.backToUsers')}</span>
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Loading User...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">
                      Loading user data...
                    </div>
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
                  className="flex items-center space-x-1 md:hidden"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('labels.backToUsers')}</span>
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>User Not Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">
                      The requested user could not be found.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: '/users' })}
                    className="flex items-center space-x-1 md:hidden"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t('labels.backToUsers')}</span>
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: `/users/${user.id}/edit` })}
                    className="flex items-center space-x-1 md:hidden"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit User</span>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="flex items-center space-x-1 md:hidden"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete User</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete the user account for {user.name}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={deleteLoading}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteLoading
                            ? t('forms.deleting')
                            : t('forms.deleteUser')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2 lg:space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>User Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                          <span className="text-2xl font-semibold text-primary">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </span>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold sm:text-2xl">
                            {user.name}
                          </h2>
                          <p className="text-muted-foreground">
                            @{user.username}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <Shield className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Username</p>
                              <p className="text-sm text-muted-foreground">
                                {user.username}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <Shield className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Role</p>
                              <Badge variant={getRoleBadgeVariant(user.role)}>
                                {getRoleLabel(user.role)}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-5 h-5">
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  user.status === 'ACTIVE'
                                    ? 'bg-green-500'
                                    : 'bg-gray-500'
                                }`}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Status</p>
                              <Badge
                                variant={
                                  user.status === 'ACTIVE'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {user.status === 'ACTIVE'
                                  ? 'Active'
                                  : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">User ID</p>
                        <p className="font-mono text-sm text-muted-foreground">
                          {user.id}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium">Created</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium">Last Updated</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(user.updatedAt)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
