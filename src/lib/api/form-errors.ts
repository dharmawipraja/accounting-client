import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import type { Messages } from '@/lib/i18n/messages.id';
import { classifyApiError } from './classifyApiError';

/**
 * Translate an API error into form field errors and/or a toast.
 * - 409 (any code) -> `code` field error (duplicate code)
 * - 403            -> toast (SoD-distinct; UI already role-gates, this is defensive)
 * - details.errors[] -> root error listing the messages
 * - otherwise      -> toast with message + traceId
 */
export function applyApiErrorToForm(
  error: unknown,
  form: UseFormReturn<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  t: Messages,
): void {
  const { kind, error: e } = classifyApiError(error);
  if (!e) {
    toast.error(t.common.error);
    return;
  }
  switch (kind) {
    case 'closedPeriod':
    case 'closedYear':
    case 'conflict':
      form.setError('code', { message: t.crud.duplicateCode });
      return;
    case 'segregationOfDuties':
      toast.error(t.roles.segregationOfDuties);
      return;
    case 'forbidden':
      toast.error(t.roles.forbidden);
      return;
    default:
      if (e.fieldErrors.length > 0) {
        form.setError('root', { message: e.fieldErrors.join('. ') });
      } else {
        toast.error(e.message || t.common.error, {
          description: e.traceId ? `${t.common.reference}: ${e.traceId}` : undefined,
        });
      }
  }
}
