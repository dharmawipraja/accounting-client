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

// --- sales invoices (Plan 3a) ---
export const salesInvoiceFixtures = () => [
  { id: 'i1', invoiceNumber: null, partnerId: 'p1', date: '2026-06-13T00:00:00.000Z', dueDate: '2026-07-13T00:00:00.000Z', description: 'Inv 1', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [{ id: 'l1', lineNo: 1, description: 'Jasa', accountId: 'a2', quantity: '2.0000', unitPrice: '500000.0000', amount: '1000000.0000', taxCodeIds: ['t1'] }] },
];

// --- payments (Plan 4a) ---
export const paymentFixtures = () => [
  { id: 'pay1', number: null, ref: null, fiscalYear: null, direction: 'RECEIPT', partnerId: 'p1', date: '2026-06-16T00:00:00.000Z', cashAccountId: 'a1', description: 'Terima', status: 'DRAFT', amount: '1110000.0000', journalEntryId: null, allocations: [{ id: 'al1', salesInvoiceId: 'i1', purchaseBillId: null, amount: '1110000.0000' }] },
];
// a POSTED open invoice to allocate against (used by the payment editor test)
export const openInvoiceFixture = () => ({ id: 'i1', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z', dueDate: '2026-07-15T00:00:00.000Z', description: null, status: 'POSTED', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] });

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

  http.get(`${API}/sales-invoices`, () => HttpResponse.json(salesInvoiceFixtures())),
  http.get(`${API}/sales-invoices/:id`, ({ params }) => HttpResponse.json({ ...salesInvoiceFixtures()[0], id: params.id })),
  http.post(`${API}/sales-invoices`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...salesInvoiceFixtures()[0], id: 'i9', ...body, status: 'DRAFT' });
  }),
  http.patch(`${API}/sales-invoices/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...salesInvoiceFixtures()[0], id: params.id, ...body });
  }),
  http.delete(`${API}/sales-invoices/:id`, () => HttpResponse.json({})),
  http.post(`${API}/sales-invoices/:id/post`, ({ params }) =>
    HttpResponse.json({ ...salesInvoiceFixtures()[0], id: params.id, status: 'POSTED', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', postedBy: 'u', postedAt: '2026-06-15T00:00:00.000Z', journalEntryId: 'j1' }),
  ),
  http.post(`${API}/sales-invoices/:id/void`, ({ params }) =>
    HttpResponse.json({ ...salesInvoiceFixtures()[0], id: params.id, status: 'VOID', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', journalEntryId: 'j1' }),
  ),
  http.post(`${API}/tax/calculate`, async ({ request }) => {
    const body = (await request.json()) as { lines: { amount: string }[] };
    const subtotal = body.lines.reduce((s, l) => s + Number(l.amount), 0);
    return HttpResponse.json({
      subtotal: subtotal.toFixed(4),
      taxes: [{ taxCodeId: 't1', code: 'PPN-OUT-11', kind: 'PPN_OUTPUT', base: subtotal.toFixed(4), amount: (subtotal * 0.11).toFixed(4), accountId: 'ppn' }],
      settlementAmount: (subtotal * 1.11).toFixed(4),
      journalLines: [],
    });
  }),

  // --- payments (Plan 4a) ---
  http.get(`${API}/payments`, () => HttpResponse.json(paymentFixtures())),
  http.get(`${API}/payments/:id`, ({ params }) => HttpResponse.json({ ...paymentFixtures()[0], id: params.id })),
  http.post(`${API}/payments`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...paymentFixtures()[0], id: 'pay9', status: 'DRAFT', ...body });
  }),
  http.patch(`${API}/payments/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...paymentFixtures()[0], id: params.id, ...body });
  }),
  http.delete(`${API}/payments/:id`, () => HttpResponse.json({})),
  http.post(`${API}/payments/:id/post`, ({ params }) => HttpResponse.json({ ...paymentFixtures()[0], id: params.id, status: 'POSTED', number: 1, ref: 'PAY-RCV/2026/000001', fiscalYear: 2026 })),
  http.post(`${API}/payments/:id/void`, ({ params }) => HttpResponse.json({ ...paymentFixtures()[0], id: params.id, status: 'VOID' })),
];
