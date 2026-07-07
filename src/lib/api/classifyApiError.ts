import { ApiError } from './errors';

export type ApiErrorKind =
  | 'offline'
  | 'unauthorized'
  | 'segregationOfDuties'
  | 'passwordChangeRequired'
  | 'forbidden'
  | 'notFound'
  | 'closedPeriod'
  | 'closedYear'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'unknown';

export interface ApiErrorClass {
  kind: ApiErrorKind;
  /** The underlying ApiError when the thrown value was one; renderers read
   *  message / traceId / fieldErrors from it for their tails. */
  error?: ApiError;
}

/** Pure: maps any thrown value to a semantic ApiErrorKind. The single home for
 *  status/code matching. i18n-free; renderers project the kind to their output. */
export function classifyApiError(error: unknown): ApiErrorClass {
  if (!(error instanceof ApiError)) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return { kind: offline ? 'offline' : 'unknown' };
  }
  const { status, code } = error;
  let kind: ApiErrorKind;
  if (status === 0) kind = 'offline';
  else if (status === 401) kind = 'unauthorized';
  else if (status === 403)
    kind =
      code === 'PASSWORD_CHANGE_REQUIRED'
        ? 'passwordChangeRequired'
        : code === 'SEGREGATION_OF_DUTIES'
          ? 'segregationOfDuties'
          : 'forbidden';
  else if (status === 404) kind = 'notFound';
  else if (status === 409) kind = code === 'CLOSED_PERIOD' ? 'closedPeriod' : code === 'CLOSED_YEAR' ? 'closedYear' : 'conflict';
  else if (status === 422) kind = 'validation';
  else if (status >= 500) kind = 'server';
  else kind = 'unknown';
  return { kind, error };
}
