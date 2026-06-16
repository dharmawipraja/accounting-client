import type { ZodType } from 'zod';
import { useSession } from '@/stores/session';
import { API_BASE_URL } from './config';
import { ApiError } from './errors';
import { refreshAccessToken } from './refresh';

export interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  schema?: ZodType<T>;
  idempotencyKey?: string;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions<unknown>['query']): string {
  const url = new URL(API_BASE_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function toApiError(res: Response): Promise<ApiError> {
  const traceId = res.headers.get('X-Request-Id') ?? undefined;
  let body: { code?: string; message?: string; traceId?: string; details?: ApiError['details'] } =
    {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  const retryAfterHeader = res.headers.get('Retry-After');
  const retryAfterNum = retryAfterHeader !== null ? Number(retryAfterHeader) : NaN;
  const extraDetails = Number.isFinite(retryAfterNum)
    ? { retryAfter: retryAfterNum }
    : undefined;
  return new ApiError({
    status: res.status,
    code: body.code ?? `HTTP_${res.status}`,
    message: body.message ?? res.statusText,
    details: extraDetails ? { ...body.details, ...extraDetails } : body.details,
    traceId: body.traceId ?? traceId,
  });
}

export async function rawFetch<T>(
  path: string,
  opts: RequestOptions<T> = {},
): Promise<{ res: Response; data: T }> {
  const { method = 'GET', body, idempotencyKey, auth = true, query, schema } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  if (auth) {
    const token = useSession.getState().accessToken;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await toApiError(res);
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  const data = schema ? schema.parse(json) : (json as T);
  return { res, data };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function apiFetch<T>(path: string, opts: RequestOptions<T> = {}): Promise<T> {
  // Auto-assign a random Idempotency-Key for POST requests that don't supply one.
  // The same key is reused for every rawFetch call within this request's retry chain,
  // ensuring the backend's idempotency guard works correctly across 401/429 retries.
  const normalizedOpts: RequestOptions<T> =
    opts.method === 'POST' && !opts.idempotencyKey
      ? { ...opts, idempotencyKey: crypto.randomUUID() }
      : opts;
  const auth = normalizedOpts.auth ?? true;
  try {
    const { data } = await rawFetch<T>(path, normalizedOpts);
    return data;
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    const e = err;
    // 401 -> single-flight refresh, then retry once.
    if (e.status === 401 && auth) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        const { data } = await rawFetch<T>(path, normalizedOpts);
        return data;
      }
    }
    // 429 -> back off once, honoring Retry-After (seconds), then retry once.
    if (e.status === 429) {
      const retryAfter = Number(e.details?.['retryAfter']) || 1;
      await sleep(retryAfter * 1000);
      const { data } = await rawFetch<T>(path, normalizedOpts);
      return data;
    }
    throw err;
  }
}
