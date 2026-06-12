import type { ZodType } from 'zod';
import { useSession } from '@/stores/session';
import { API_BASE_URL } from './config';
import { ApiError } from './errors';

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
  return new ApiError({
    status: res.status,
    code: body.code ?? `HTTP_${res.status}`,
    message: body.message ?? res.statusText,
    details: body.details,
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

export async function apiFetch<T>(path: string, opts: RequestOptions<T> = {}): Promise<T> {
  const { data } = await rawFetch<T>(path, opts);
  return data;
}
