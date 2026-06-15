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

// --- reports (Plan 4b dashboard) ---
export const balanceSheetFixture = (asOf: string) => ({
  asOf,
  assets: { groups: [], total: '0.0000' },
  liabilities: { groups: [], total: '0.0000' },
  equity: { groups: [], total: '0.0000' },
  totalAssets: '1500000.0000',
  totalLiabilities: '600000.0000',
  totalEquity: '900000.0000',
  currentYearEarnings: '0.0000',
  balanced: true,
});
export const incomeStatementFixture = (from: string, to: string) => ({
  from, to,
  revenue: '2000000.0000', cogs: '0.0000', grossProfit: '2000000.0000',
  operatingExpense: '0.0000', operatingProfit: '2000000.0000', otherIncome: '0.0000',
  otherExpense: '0.0000', profitBeforeTax: '2000000.0000', taxExpense: '0.0000',
  netIncome: '1750000.0000',
});
export const cashFlowFixture = (from: string, to: string) => ({
  from, to, netIncome: '1750000.0000',
  operating: { adjustments: [], total: '0.0000' }, investing: { lines: [], total: '0.0000' },
  financing: { lines: [], total: '0.0000' }, netChange: '750000.0000',
  kasAwal: '250000.0000', kasAkhir: '1234000.0000', reconciles: true,
});

// --- journal entries (Plan 6) ---
export const journalEntryListFixture = () => [
  { id: 'jed1', entryRef: null, entryNumber: null, fiscalYear: null, date: '2026-06-16T00:00:00.000Z', description: 'Draf 1', status: 'DRAFT', sourceType: 'MANUAL', sourceId: null, totalDebit: '100000.0000', lineCount: 2 },
  { id: 'jed2', entryRef: null, entryNumber: null, fiscalYear: null, date: '2026-06-16T00:00:00.000Z', description: 'Draf 2', status: 'DRAFT', sourceType: 'MANUAL', sourceId: null, totalDebit: '200000.0000', lineCount: 2 },
  { id: 'jed3', entryRef: null, entryNumber: null, fiscalYear: null, date: '2026-06-16T00:00:00.000Z', description: 'Draf 3', status: 'DRAFT', sourceType: 'MANUAL', sourceId: null, totalDebit: '300000.0000', lineCount: 2 },
  { id: 'jep1', entryRef: 'JE/2026/000002', entryNumber: 2, fiscalYear: 2026, date: '2026-06-15T00:00:00.000Z', description: 'Penjualan diposting', status: 'POSTED', sourceType: 'SALE', sourceId: 'inv1', totalDebit: '1110000.0000', lineCount: 2 },
  { id: 'jep2', entryRef: 'JE/2026/000003', entryNumber: 3, fiscalYear: 2026, date: '2026-06-15T00:00:00.000Z', description: 'Jurnal manual diposting', status: 'POSTED', sourceType: 'MANUAL', sourceId: null, totalDebit: '500000.0000', lineCount: 2 },
];
export const journalEntryDetailFixture = () => ({
  id: 'jed1', entryNumber: null, entryRef: null, fiscalYear: null, date: '2026-06-16T00:00:00.000Z', periodId: null,
  description: 'Draf 1', sourceType: 'MANUAL', sourceId: null, status: 'DRAFT', reversalOfId: null, reversedById: null,
  lines: [
    { id: 'jl1', journalEntryId: 'jed1', lineNo: 1, accountId: 'a1', debit: '100000', credit: '0', description: 'sisi debit' },
    { id: 'jl2', journalEntryId: 'jed1', lineNo: 2, accountId: 'a2', debit: '0', credit: '100000', description: 'sisi kredit' },
  ],
});

// --- purchase bills (Plan 5a) ---
export const purchaseBillFixtures = () => [
  { id: 'b1', billNumber: null, billRef: null, fiscalYear: null, vendorInvoiceNo: 'VINV-77', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z', dueDate: '2026-07-15T00:00:00.000Z', description: 'Bill 1', status: 'DRAFT', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [{ id: 'l1', purchaseBillId: 'b1', lineNo: 1, description: 'Jasa', accountId: 'a2', quantity: '1.0000', unitPrice: '1000000.0000', amount: '1000000.0000', taxCodeIds: ['t1'] }] },
];

// --- payments (Plan 4a) ---
export const paymentFixtures = () => [
  { id: 'pay1', number: null, ref: null, fiscalYear: null, direction: 'RECEIPT', partnerId: 'p1', date: '2026-06-16T00:00:00.000Z', cashAccountId: 'a1', description: 'Terima', status: 'DRAFT', amount: '1110000.0000', journalEntryId: null, allocations: [{ id: 'al1', salesInvoiceId: 'i1', purchaseBillId: null, amount: '1110000.0000' }] },
];
// a POSTED open invoice to allocate against (used by the payment editor test)
export const openInvoiceFixture = () => ({ id: 'i1', invoiceNumber: 1, invoiceRef: 'INV/2026/000001', partnerId: 'p1', date: '2026-06-15T00:00:00.000Z', dueDate: '2026-07-15T00:00:00.000Z', description: null, status: 'POSTED', subtotal: '1000000.0000', taxTotal: '110000.0000', withholdingTotal: '0.0000', total: '1110000.0000', amountPaid: '0.0000', outstanding: '1110000.0000', paymentStatus: 'UNPAID', lines: [] });

// --- company settings (Plan 10) ---
export const companySettingsFixture = () => ({
  id: 'company-1', singleton: true, legalName: 'My Company', npwp: null, address: null,
  fiscalYearStartMonth: 1, baseCurrency: 'IDR', segregationOfDutiesEnabled: true, isPkp: true,
  createdAt: '2026-06-12T16:26:01.120Z', updatedAt: '2026-06-14T15:06:57.559Z',
});

// --- audit log (Plan 9) ---
export const auditFixtures = () => [
  { id: 'audit-1', timestamp: '2026-06-15T13:18:25.590Z', userId: 'u1', userRole: 'ADMIN', method: 'POST', path: '/ledger/periods/p1/close', params: { id: 'p1' }, body: {}, statusCode: 200, durationMs: 42, ip: '::1' },
  { id: 'audit-2', timestamp: '2026-06-15T13:10:00.000Z', userId: null, userRole: null, method: 'POST', path: '/auth/login', params: {}, body: { email: 'admin@mail.com', password: '[REDACTED]' }, statusCode: 401, durationMs: 88, ip: '::1' },
];

// --- periods + year-end (Plan 8) ---
export const periodFixtures = (fiscalYear = 2026) =>
  Array.from({ length: 12 }, (_, i) => {
    const mm = String(i + 1).padStart(2, '0');
    return {
      id: `period-${fiscalYear}-${i + 1}`,
      fiscalYear,
      sequence: i + 1,
      name: `${fiscalYear}-${mm}`,
      status: 'OPEN',
      startDate: `${fiscalYear}-${mm}-01T00:00:00.000Z`,
      endDate: `${fiscalYear}-${mm}-28T00:00:00.000Z`,
      closedAt: null,
      closedBy: null,
    };
  });

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

  // --- purchase bills (Plan 5a) ---
  http.get(`${API}/purchase-bills`, () => HttpResponse.json(purchaseBillFixtures())),
  http.get(`${API}/purchase-bills/:id`, ({ params }) => HttpResponse.json({ ...purchaseBillFixtures()[0], id: params.id })),
  http.post(`${API}/purchase-bills`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...purchaseBillFixtures()[0], id: 'b9', ...body, status: 'DRAFT' });
  }),
  http.patch(`${API}/purchase-bills/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...purchaseBillFixtures()[0], id: params.id, ...body });
  }),
  http.delete(`${API}/purchase-bills/:id`, () => HttpResponse.json({})),
  http.post(`${API}/purchase-bills/:id/post`, ({ params }) =>
    HttpResponse.json({ ...purchaseBillFixtures()[0], id: params.id, status: 'POSTED', billNumber: 1, billRef: 'BILL/2026/000001', fiscalYear: 2026, postedBy: 'u', postedAt: '2026-06-15T00:00:00.000Z', journalEntryId: 'j1' }),
  ),
  http.post(`${API}/purchase-bills/:id/void`, ({ params }) =>
    HttpResponse.json({ ...purchaseBillFixtures()[0], id: params.id, status: 'VOID', billNumber: 1, billRef: 'BILL/2026/000001', fiscalYear: 2026, journalEntryId: 'j1' }),
  ),

  // --- reports (Plan 4b dashboard) ---
  http.get(`${API}/reports/balance-sheet`, ({ request }) => {
    const asOf = new URL(request.url).searchParams.get('asOf') ?? '';
    return HttpResponse.json(balanceSheetFixture(asOf));
  }),
  http.get(`${API}/reports/income-statement`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    return HttpResponse.json(incomeStatementFixture(u.get('from') ?? '', u.get('to') ?? ''));
  }),
  http.get(`${API}/reports/cash-flow`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    return HttpResponse.json(cashFlowFixture(u.get('from') ?? '', u.get('to') ?? ''));
  }),
  http.get(`${API}/ledger/journal-entries`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    const status = u.get('status');
    const sourceType = u.get('sourceType');
    const limit = Number(u.get('limit') ?? '20');
    const offset = Number(u.get('offset') ?? '0');
    let data = journalEntryListFixture();
    if (status) data = data.filter((e) => e.status === status);
    if (sourceType) data = data.filter((e) => e.sourceType === sourceType);
    return HttpResponse.json({ data: data.slice(offset, offset + limit), total: data.length, limit, offset });
  }),
  http.get(`${API}/ledger/journal-entries/:id`, ({ params }) => HttpResponse.json({ ...journalEntryDetailFixture(), id: params.id })),
  http.post(`${API}/ledger/journal-entries`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...journalEntryDetailFixture(), id: 'je9', status: 'DRAFT', ...body, lines: undefined });
  }),
  http.delete(`${API}/ledger/journal-entries/:id`, () => HttpResponse.json({})),
  http.post(`${API}/ledger/journal-entries/:id/post`, ({ params }) =>
    HttpResponse.json({ ...journalEntryDetailFixture(), id: params.id, status: 'POSTED', entryNumber: 13, entryRef: 'JE/2026/000013', fiscalYear: 2026, lines: undefined }),
  ),
  http.post(`${API}/ledger/journal-entries/:id/reverse`, ({ params }) =>
    HttpResponse.json({ ...journalEntryDetailFixture(), id: 'rev1', status: 'POSTED', sourceType: 'REVERSAL', reversalOfId: params.id, entryNumber: 14, entryRef: 'JE/2026/000014', lines: undefined }),
  ),

  // --- periods + year-end (Plan 8) ---
  http.get(`${API}/ledger/periods`, ({ request }) => {
    const fy = Number(new URL(request.url).searchParams.get('fiscalYear')) || 2026;
    return HttpResponse.json(periodFixtures(fy));
  }),
  http.post(`${API}/ledger/periods/generate`, () => HttpResponse.json(periodFixtures())),
  http.post(`${API}/ledger/periods/:id/close`, ({ params }) => HttpResponse.json({ id: params.id, status: 'CLOSED' })),
  http.post(`${API}/ledger/periods/:id/reopen`, ({ params }) => HttpResponse.json({ id: params.id, status: 'OPEN' })),
  http.get(`${API}/close/year-end/:fy`, () => HttpResponse.json({ code: 'NOT_FOUND', message: 'Not found' }, { status: 404 })),
  http.post(`${API}/close/year-end`, async ({ request }) => {
    const body = (await request.json()) as { fiscalYear: number };
    return HttpResponse.json({ fiscalYear: body.fiscalYear, status: 'CLOSED', closedAt: '2026-12-31T00:00:00Z' });
  }),
  http.post(`${API}/close/year-end/:fy/reopen`, ({ params }) => HttpResponse.json({ fiscalYear: Number(params.fy), status: 'OPEN' })),

  // --- audit log (Plan 9) ---
  http.get(`${API}/audit`, () => HttpResponse.json(auditFixtures())),

  // --- company settings (Plan 10) ---
  http.get(`${API}/company/settings`, () => HttpResponse.json(companySettingsFixture())),
  http.patch(`${API}/company/settings`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...companySettingsFixture(), ...body });
  }),
];
