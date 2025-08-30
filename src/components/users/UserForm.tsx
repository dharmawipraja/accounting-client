import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SubmitOverlay } from '@/components/ui/submit-overlay'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import {
  useCreateUserMutation,
  useUpdateUserMutation,
} from '@/hooks/useUsersQuery'
import type { UserRole } from '@/types'
import type { User } from '@/types/api'
import { getAllowedRolesToAssign, getRoleLabel } from '@/utils/rolePermissions'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const userFormSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .optional(),
  role: z.enum(['ADMIN', 'MANAJER', 'AKUNTAN', 'KASIR', 'KOLEKTOR', 'NASABAH']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

type UserFormData = z.infer<typeof userFormSchema>

interface UserFormProps {
  user?: User
  onSuccess?: () => void
  onCancel: () => void
}

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const isEditing = !!user
  const { user: currentUser } = useAuth()
  const { t } = useTranslation()

  const createUserMutation = useCreateUserMutation()
  const updateUserMutation = useUpdateUserMutation()

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: user?.username || '',
      name: user?.name || '',
      password: '',
      role: user?.role || 'NASABAH',
      status: user?.status || 'ACTIVE',
    },
  })

  const handleSubmit = async (data: UserFormData) => {
    try {
      if (isEditing && user) {
        const payload = { ...data }
        // Remove password field if editing and password is empty
        if (!data.password) {
          delete (payload as any).password
        }
        await updateUserMutation.mutateAsync({ id: user.id, payload })
      } else {
        // Ensure password is provided for creation
        if (!data.password) {
          form.setError('password', {
            message: t('users.passwordRequired'),
          })
          return
        }
        await createUserMutation.mutateAsync(data as any)
      }
      onSuccess?.()
    } catch {
      toast.error(t('users.failedToSave'))
    }
  }

  const isLoading = createUserMutation.isPending || updateUserMutation.isPending

  // Get allowed roles based on current user's role
  const allowedRoles = currentUser?.role
    ? getAllowedRolesToAssign(currentUser.role)
    : []

  const roleOptions: { value: UserRole; label: string }[] = allowedRoles.map(
    (role) => ({
      value: role,
      label: getRoleLabel(role),
    }),
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing
              ? t('users.editUser', { name: user.name })
              : t('users.createNew')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('users.username')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('users.enterUsername')}
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('users.fullName')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('users.enterFullName')}
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.role')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('users.selectRole')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.status')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('users.selectStatus')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">
                            {t('common.active')}
                          </SelectItem>
                          <SelectItem value="INACTIVE">
                            {t('common.inactive')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isEditing ? t('users.newPassword') : t('users.password')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={
                          isEditing
                            ? t('users.leaveBlankToKeep')
                            : t('users.enterPassword')
                        }
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isLoading
                    ? t('users.saving')
                    : isEditing
                      ? t('users.updateUser')
                      : t('users.createUser')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Submit overlay for form submission */}
      <SubmitOverlay
        isVisible={isLoading}
        message={isEditing ? t('users.updating') : t('users.creating')}
      />
    </>
  )
}
