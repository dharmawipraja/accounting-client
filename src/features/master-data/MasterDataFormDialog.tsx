import type { ReactNode } from 'react';
import { useForm, type UseFormReturn, type FieldValues, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { ZodType } from 'zod';
import { FormDialog } from '@/components/common/FormDialog';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { useT } from '@/lib/i18n/useT';

export interface MasterDataFormDialogProps<TValues extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: ZodType<TValues>;
  defaultValues: DefaultValues<TValues>;
  /** Reset the form after a successful submit (true for create, false for edit). */
  resetOnSuccess?: boolean;
  /** Perform the mutation; throw on failure (use `mutateAsync`). */
  submit: (values: TValues) => Promise<unknown>;
  fields: (form: UseFormReturn<TValues>) => ReactNode;
}

/** A validated master-data dialog form bound to one submit. Owns the FormDialog
 *  shell, RHF setup, the submit → success-toast/reset/close · error → form lifecycle,
 *  and the shared root + code error block. Fields are supplied per resource. */
export function MasterDataFormDialog<TValues extends FieldValues>({
  open, onOpenChange, title, description, schema, defaultValues, resetOnSuccess, submit, fields,
}: MasterDataFormDialogProps<TValues>) {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<TValues>({ resolver: zodResolver(schema as any), defaultValues });

  async function onSubmit(values: TValues) {
    try {
      await submit(values);
      toast.success(t.crud.saved);
      if (resetOnSuccess) form.reset();
      onOpenChange(false);
    } catch (err) {
      applyApiErrorToForm(err, form, t);
    }
  }

  const errors = form.formState.errors as Record<string, { message?: string } | undefined>;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      onSubmit={form.handleSubmit(onSubmit as never)}
      pending={form.formState.isSubmitting}
    >
      {fields(form)}
      {errors.root ? <p role="alert" className="text-sm text-destructive">{errors.root.message}</p> : null}
      {errors.code ? <p role="alert" className="text-sm text-destructive">{errors.code.message}</p> : null}
    </FormDialog>
  );
}
