import { http, HttpResponse } from 'msw';

export const API = 'http://localhost:4000';

// --- accounts (Plan 2a) ---
export const accountFixtures = () => [
  { id: 'a1', code: '1-1000', name: 'Kas', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', cashFlowCategory: 'OPERATING', isPostable: true, isActive: true, parentId: null },
  { id: 'a2', code: '4-1000', name: 'Pendapatan Penjualan', type: 'REVENUE', subtype: 'REVENUE', normalBalance: 'CREDIT', cashFlowCategory: 'NONE', isPostable: true, isActive: true, parentId: null },
];

// --- partners (Plan 2b) ---
export const partnerFixtures = () => [
  { id: 'p1', code: 'CUST-001', name: 'PT Pelanggan Jaya', npwp: '01.234.567.8-901.000', email: 'beli@jaya.id', phone: '021-555', address: 'Jakarta', isCustomer: true, isVendor: false, isActive: true },
];
// --- tax codes (Plan 2b) ---
export const taxCodeFixtures = () => [
  { id: 't1', code: 'PPN-OUT', name: 'PPN Keluaran 11%', kind: 'PPN_OUTPUT', rate: '0.11', taxAccountId: 'a1', isActive: true },
];

export const handlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json(
        { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
        { status: 401, headers: { 'X-Request-Id': 'trace-login' } },
      );
    }
    return HttpResponse.json({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  }),
  http.get(`${API}/auth/me`, ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'No token' }, { status: 401 });
    }
    return HttpResponse.json({ id: 'u1', email: 'admin@buku.id', role: 'ADMIN' });
  }),
  http.get(`${API}/ledger/accounts`, () => HttpResponse.json(accountFixtures())),
  http.post(`${API}/ledger/accounts`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.code === '1-1000') {
      return HttpResponse.json({ code: 'CONFLICT', message: 'duplicate' }, { status: 409 });
    }
    return HttpResponse.json({ id: 'a9', isActive: true, parentId: null, ...body });
  }),
  http.patch(`${API}/ledger/accounts/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...accountFixtures()[0], id: params.id, ...body });
  }),
  http.post(`${API}/ledger/accounts/:id/deactivate`, () => HttpResponse.json({})),
  http.delete(`${API}/ledger/accounts/:id`, () => HttpResponse.json({})),

  http.get(`${API}/partners`, () => HttpResponse.json(partnerFixtures())),
  http.post(`${API}/partners`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.code === 'DUP') return HttpResponse.json({ code: 'CONFLICT', message: 'dup' }, { status: 409 });
    return HttpResponse.json({ id: 'p9', isActive: true, ...body });
  }),
  http.patch(`${API}/partners/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...partnerFixtures()[0], id: params.id, ...body });
  }),
  http.post(`${API}/partners/:id/deactivate`, () => HttpResponse.json({})),
  http.delete(`${API}/partners/:id`, () => HttpResponse.json({})),

  http.get(`${API}/tax/codes`, () => HttpResponse.json(taxCodeFixtures())),
  http.post(`${API}/tax/codes`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.code === 'DUP') return HttpResponse.json({ code: 'CONFLICT', message: 'dup' }, { status: 409 });
    return HttpResponse.json({ id: 't9', isActive: true, ...body });
  }),
  http.patch(`${API}/tax/codes/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...taxCodeFixtures()[0], id: params.id, ...body });
  }),
  http.post(`${API}/tax/codes/:id/deactivate`, () => HttpResponse.json({})),
  http.delete(`${API}/tax/codes/:id`, () => HttpResponse.json({})),
];
