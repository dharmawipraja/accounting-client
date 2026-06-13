import { toast } from 'sonner';
import type { Messages } from '@/lib/i18n/messages.id';
import { ApiError } from './errors';

/** Surface an API error as a toast (for action/confirm contexts, not forms). */
export function toastApiError(error: unknown, t: Messages): void {
  if (!(error instanceof ApiError)) {
    toast.error(t.common.error);
    return;
  }
  if (error.status === 403) {
    toast.error(error.code === 'SEGREGATION_OF_DUTIES' ? t.roles.segregationOfDuties : t.roles.forbidden);
    return;
  }
  if (error.status === 409 && error.code === 'CLOSED_PERIOD') {
    toast.error(t.crud.closedPeriod);
    return;
  }
  if (error.status === 409 && error.code === 'CLOSED_YEAR') {
    toast.error(t.crud.closedYear);
    return;
  }
  toast.error(error.message || t.common.error, {
    description: error.traceId ? `${t.common.reference}: ${error.traceId}` : undefined,
  });
}
