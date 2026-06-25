import { toast } from 'sonner';
import type { Messages } from '@/lib/i18n/messages.id';
import { classifyApiError } from './classifyApiError';

/** Surface an API error as a toast (for action/confirm contexts, not forms). */
export function toastApiError(error: unknown, t: Messages): void {
  const { kind, error: e } = classifyApiError(error);
  switch (kind) {
    case 'segregationOfDuties':
      toast.error(t.roles.segregationOfDuties);
      return;
    case 'forbidden':
      toast.error(t.roles.forbidden);
      return;
    case 'closedPeriod':
      toast.error(t.crud.closedPeriod);
      return;
    case 'closedYear':
      toast.error(t.crud.closedYear);
      return;
    default:
      if (e) {
        toast.error(e.message || t.common.error, {
          description: e.traceId ? `${t.common.reference}: ${e.traceId}` : undefined,
        });
      } else {
        toast.error(t.common.error);
      }
  }
}
