import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import type { Messages } from '@/lib/i18n/messages.id';
import { ApiError } from './errors';

/**
 * Translate an API error into form field errors and/or a toast.
 * - 409 CONFLICT      -> `code` field error (duplicate code)
 * - 403 FORBIDDEN     -> toast (UI already role-gates; this is defensive)
 * - details.errors[]  -> root error listing the messages (best-effort inline)
 * - otherwise         -> toast with message + traceId
 */
export function applyApiErrorToForm(
  error: unknown,
  form: UseFormReturn<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  t: Messages,
): void {
  if (!(error instanceof ApiError)) {
    toast.error(t.common.error);
    return;
  }

  if (error.status === 409) {
    form.setError('code', { message: t.crud.duplicateCode });
    return;
  }

  if (error.status === 403) {
    toast.error(error.code === 'SEGREGATION_OF_DUTIES' ? t.roles.segregationOfDuties : t.roles.forbidden);
    return;
  }

  const fieldErrors = error.fieldErrors;
  if (fieldErrors.length > 0) {
    form.setError('root', { message: fieldErrors.join('. ') });
    return;
  }

  toast.error(error.message || t.common.error, {
    description: error.traceId ? `${t.common.reference}: ${error.traceId}` : undefined,
  });
}
