import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormDialog } from '@/components/common/FormDialog';
import { FieldError } from '@/components/common/FieldError';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';
import type { Role } from '@/stores/session';
import { useCreateUser, useUpdateUser } from './hooks';
import { ROLE_OPTIONS, roleLabel } from './user-meta';
import {
  userCreateSchema, userEditSchema,
  type User, type CreateUserResponse, type UserCreateValues, type UserEditValues,
} from './schema';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: 'create' | 'edit';
  user?: User;
  currentUserId?: string;
  onCreated: (resp: CreateUserResponse) => void;
}

export function UserFormDialog(props: Props) {
  if (props.mode === 'edit' && props.user) {
    return <EditForm key={props.user.id} {...props} user={props.user} />;
  }
  return <CreateForm {...props} />;
}

function CreateForm({ open, onOpenChange, onCreated }: Props) {
  const t = useT();
  const create = useCreateUser();
  const form = useForm<UserCreateValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { email: '', name: '', role: 'VIEWER' },
  });
  const role = useWatch({ control: form.control, name: 'role' });

  async function onSubmit(values: UserCreateValues) {
    try {
      const resp = await create.mutateAsync(values);
      onOpenChange(false);
      form.reset();
      onCreated(resp);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setError('email', { type: 'server', message: t.users.emailExists });
      } else {
        applyApiErrorToForm(err, form, t);
      }
    }
  }

  const e = form.formState.errors;
  const emailError = e.email
    ? (e.email.type === 'server' ? t.users.emailExists : t.users.emailInvalid)
    : undefined;
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t.users.newUser}
      onSubmit={form.handleSubmit(onSubmit)} pending={form.formState.isSubmitting}>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t.users.email}</Label>
        <Input id="email" type="email" {...form.register('email')} />
        <FieldError message={emailError} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">{t.users.name}</Label>
        <Input id="name" {...form.register('name')} />
      </div>
      <RoleField label={t.users.role} value={role} onChange={(v) => form.setValue('role', v)} />
      <FieldError message={(e as Record<string, { message?: string } | undefined>).root?.message} />
    </FormDialog>
  );
}

function EditForm({ open, onOpenChange, user, currentUserId }: Props & { user: User }) {
  const t = useT();
  const update = useUpdateUser();
  const isSelf = user.id === currentUserId;
  const form = useForm<UserEditValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: { name: user.name, role: user.role, isActive: user.isActive },
  });
  const role = useWatch({ control: form.control, name: 'role' });
  const isActive = useWatch({ control: form.control, name: 'isActive' });

  async function onSubmit(values: UserEditValues) {
    try {
      await update.mutateAsync({ id: user.id, data: values });
      toast.success(t.crud.saved);
      onOpenChange(false);
    } catch (err) {
      applyApiErrorToForm(err, form, t);
    }
  }

  const e = form.formState.errors;
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t.users.editUser} description={user.email}
      onSubmit={form.handleSubmit(onSubmit)} pending={form.formState.isSubmitting}>
      <div className="space-y-1.5">
        <Label htmlFor="ename">{t.users.name}</Label>
        <Input id="ename" {...form.register('name')} />
      </div>
      <RoleField label={t.users.role} value={role} onChange={(v) => form.setValue('role', v)} disabled={isSelf} />
      {isSelf ? <p className="text-xs text-muted-foreground">{t.users.cannotEditSelfRole}</p> : null}
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={isActive} onCheckedChange={(v) => form.setValue('isActive', v)} disabled={isSelf} aria-label={t.crud.status} />
        {t.crud.active}
      </label>
      <FieldError message={(e as Record<string, { message?: string } | undefined>).root?.message} />
    </FormDialog>
  );
}

function RoleField({ label, value, onChange, disabled }: { label: string; value: Role; onChange: (v: Role) => void; disabled?: boolean }) {
  const t = useT();
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={disabled}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{roleLabel(t, r)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
