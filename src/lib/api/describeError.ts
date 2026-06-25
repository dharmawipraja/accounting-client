import type { Messages } from '@/lib/i18n/messages.id';
import { classifyApiError } from './classifyApiError';

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

/** Map any thrown value to user-facing page copy. Never throws. Projects the
 *  shared classifyApiError kind onto the page-level ErrorKind set. */
export function describeError(error: unknown, t: Messages): ErrorDescription {
  const { kind, error: e } = classifyApiError(error);
  const traceId = e?.traceId;
  const make = (
    k: ErrorKind,
    group: { title: string; message: string },
    showRetry: boolean,
  ): ErrorDescription => ({ kind: k, title: group.title, message: group.message, showRetry, traceId });

  switch (kind) {
    case 'offline':
      return make('offline', t.errors.offline, true);
    case 'unauthorized':
      return make('unauthorized', t.errors.unauthorized, false);
    case 'segregationOfDuties':
    case 'forbidden':
      return make('forbidden', t.errors.forbidden, false);
    case 'notFound':
      return make('notFound', t.errors.notFound, false);
    case 'validation':
      return make('validation', t.errors.validation, false);
    case 'server':
      return make('server', t.errors.server, true);
    default:
      // closedPeriod | closedYear | conflict | unknown
      return make('generic', t.errors.generic, true);
  }
}
