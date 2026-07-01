import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { applyApiErrorToForm } from '@/lib/api/form-errors';
import { useT } from '@/lib/i18n/useT';

/** The shared save policy for the document-family editors (invoice/bill via
 *  DocumentEditor, payment, journal): on success toast "saved" + run onSaved; on
 *  error route the ApiError into the form. Returns the mutation callbacks to pass
 *  to `create`/`update` `.mutate(payload, handlers)`. */
export function useDocumentSubmit(
  form: UseFormReturn<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  onSaved: () => void,
) {
  const t = useT();
  return {
    onSuccess: () => {
      toast.success(t.crud.saved);
      onSaved();
    },
    onError: (err: unknown) => applyApiErrorToForm(err, form, t),
  };
}
