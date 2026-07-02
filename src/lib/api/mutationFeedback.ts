import { toast } from 'sonner';
import type { Messages } from '@/lib/i18n/messages.id';
import type { ApiError } from './errors';
import { toastApiError } from './toastApiError';

/** The shared result policy for a confirmed mutation. Returns the
 *  `{ onSuccess, onError }` to spread into `mutation.mutate(vars, …)`:
 *   - success → toast the message + run `onClose`
 *   - error   → route the ApiError (`domain` = `toastApiError`, with its SoD /
 *               closed-period messages; `plain` = generic error toast) + run `onClose`
 *  `onClose` fires on both outcomes (e.g. close the confirm dialog); omit it for
 *  immediate actions with no dialog. The confirm state machines stay per-feature;
 *  only this policy is shared. */
export function mutationFeedback(opts: {
  t: Messages;
  success: string;
  errorMode?: 'domain' | 'plain';
  onClose?: () => void;
}): { onSuccess: () => void; onError: (error: ApiError) => void } {
  const { t, success, errorMode = 'plain', onClose } = opts;
  return {
    onSuccess: () => {
      toast.success(success);
      onClose?.();
    },
    onError: (error) => {
      if (errorMode === 'domain') toastApiError(error, t);
      else toast.error(t.common.error);
      onClose?.();
    },
  };
}
