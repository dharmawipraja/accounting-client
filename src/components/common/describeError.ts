import { ApiError } from '@/lib/api/errors';
import type { Messages } from '@/lib/i18n/messages.id';

export type ErrorKind =
  | 'offline'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'validation'
  | 'server'
  | 'generic';

export interface ErrorDescription {
  kind: ErrorKind;
  title: string;
  message: string;
  showRetry: boolean;
  traceId?: string;
}

/** Map any thrown value to user-facing copy. Never throws; defensively handles
 *  non-ApiError values (Error/string/unknown) → generic, unless the browser is
 *  offline → offline. */
export function describeError(error: unknown, t: Messages): ErrorDescription {
  const make = (
    kind: ErrorKind,
    group: { title: string; message: string },
    showRetry: boolean,
    traceId?: string,
  ): ErrorDescription => ({ kind, title: group.title, message: group.message, showRetry, traceId });

  if (!(error instanceof ApiError)) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return offline ? make('offline', t.errors.offline, true) : make('generic', t.errors.generic, true);
  }

  const { status, traceId } = error;
  if (status === 0) return make('offline', t.errors.offline, true, traceId);
  if (status === 401) return make('unauthorized', t.errors.unauthorized, false, traceId);
  if (status === 403) return make('forbidden', t.errors.forbidden, false, traceId);
  if (status === 404) return make('notFound', t.errors.notFound, false, traceId);
  if (status === 422) return make('validation', t.errors.validation, false, traceId);
  if (status >= 500) return make('server', t.errors.server, true, traceId);
  return make('generic', t.errors.generic, true, traceId);
}
