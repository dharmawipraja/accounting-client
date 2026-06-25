import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { API, paged } from '@/test/handlers';
import { server } from '@/test/server';
import { useSession } from '@/stores/session';
import { useT } from '@/lib/i18n/useT';
import { createResourceHooks } from '@/lib/crud/createResourceHooks';
import { DocumentEditor, type DocumentEditorConfig, type DocumentEditorLabels } from './DocumentEditor';
import { documentHeaderSchema, EMPTY_LINE, type DocumentHeaderValues } from './documentFormSchema';

afterEach(() => useSession.getState().clear());

// A synthetic "test-docs" resource exercises the real create/update path through MSW.
const testItemSchema = z.object({ id: z.string(), status: z.string(), partnerId: z.string() });
type TestItem = z.infer<typeof testItemSchema>;
type TestCreate = { partnerId: string; date: string; dueDate?: string; description?: string; lines: unknown[] };
const testApi = createResourceHooks<TestItem, TestCreate, Partial<TestCreate>>({ key: 'test-docs', basePath: '/test-docs', itemSchema: testItemSchema });

const accounts = [{ id: 'ar', code: '1-1200', name: 'Piutang', type: 'ASSET', subtype: 'CURRENT_ASSET', normalBalance: 'DEBIT', isPostable: true, isActive: true, parentId: null }];
const partners = [{ id: 'c1', code: 'CUST-1', name: 'Toko A', isCustomer: true, isVendor: false, isActive: true }];

function labels(t: ReturnType<typeof useT>): DocumentEditorLabels {
  return {
    partner: t.salesInvoices.partner, selectPartner: t.salesInvoices.selectPartner, date: t.salesInvoices.date,
    dueDate: t.salesInvoices.dueDate, description: t.salesInvoices.description, vendorInvoiceNo: t.purchaseBills.vendorInvoiceNo,
    lineDescription: t.salesInvoices.lineDescription, account: t.salesInvoices.account, selectAccount: t.salesInvoices.selectAccount,
    quantity: t.salesInvoices.quantity, unitPrice: t.salesInvoices.unitPrice, taxes: t.salesInvoices.taxes, lineAmount: t.salesInvoices.lineAmount,
    addLine: t.salesInvoices.addLine, removeLine: t.salesInvoices.removeLine, atLeastOneLine: t.salesInvoices.atLeastOneLine,
    required: t.salesInvoices.required, saveDraft: t.salesInvoices.saveDraft, readOnlyPosted: t.salesInvoices.readOnlyPosted, readOnlyVoid: t.salesInvoices.readOnlyVoid,
  };
}

function useTestConfig(withExtra: boolean): DocumentEditorConfig<TestItem, DocumentHeaderValues, TestCreate> {
  const t = useT();
  return {
    nature: 'SALE', settlementAccountCode: '1-1200', allowedTaxKinds: ['PPN_OUTPUT'], partnerFilter: 'customer',
    formSchema: documentHeaderSchema,
    emptyForm: { partnerId: '', date: '', dueDate: '', description: '', lines: [{ ...EMPTY_LINE }] },
    toFormValues: (item) => ({ partnerId: item.partnerId, date: '2026-06-25', dueDate: '', description: '', lines: [{ ...EMPTY_LINE, accountId: 'ar', unitPrice: '1000' }] }),
    toPayload: (v) => ({ partnerId: v.partnerId, date: v.date, dueDate: v.dueDate || undefined, description: v.description || undefined, lines: v.lines }),
    create: testApi.useCreate(),
    update: testApi.useUpdate(),
    labels: labels(t),
    docRef: (item) => item.id,
    extraHeaderField: withExtra ? { name: 'description', label: t.purchaseBills.vendorInvoiceNo, inputId: 'vinv' } : undefined,
  };
}

function Harness({ withExtra = false, ...props }: { withExtra?: boolean; mode: 'create' | 'edit'; doc?: TestItem; readOnly?: boolean; onSaved: () => void; startEmpty?: boolean }) {
  const config = useTestConfig(withExtra);
  return <DocumentEditor config={config} {...props} />;
}

function renderEditor(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function baseHandlers() {
  server.use(
    http.get(`${API}/ledger/accounts`, () => HttpResponse.json(paged(accounts))),
    http.get(`${API}/partners`, () => HttpResponse.json({ data: partners, total: 1, limit: 200, offset: 0 })),
    http.get(`${API}/tax/codes`, () => HttpResponse.json(paged([]))),
  );
}

it('creates a draft and posts the payload', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  baseHandlers();
  let posted: Record<string, unknown> | null = null;
  server.use(http.post(`${API}/test-docs`, async ({ request }) => {
    posted = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'x9', status: 'DRAFT', partnerId: 'c1' });
  }));
  const onSaved = vi.fn();
  renderEditor(<Harness mode="create" onSaved={onSaved} />);

  await user.click(screen.getByRole('combobox', { name: /pelanggan/i }));
  await user.click(await screen.findByRole('option', { name: /CUST-1/i }));
  await user.type(screen.getByLabelText(/tanggal/i), '2026-06-25');
  await user.type(screen.getByLabelText(/deskripsi/i), 'Jasa konsultasi');
  await user.click(screen.getByRole('combobox', { name: /akun/i }));
  await user.click(await screen.findByRole('option', { name: /1-1200/i }));
  await user.clear(screen.getByLabelText(/qty/i));
  await user.type(screen.getByLabelText(/qty/i), '2');
  await user.type(screen.getByLabelText(/harga satuan/i), '500000');
  await user.click(screen.getByRole('button', { name: /simpan draf/i }));

  await waitFor(() => expect(posted).toBeTruthy());
  expect(posted).toMatchObject({ partnerId: 'c1', date: '2026-06-25', lines: [{ accountId: 'ar', quantity: '2', unitPrice: '500000' }] });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it('blocks save when empty (validation errors)', async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  baseHandlers();
  renderEditor(<Harness mode="create" onSaved={vi.fn()} startEmpty />);
  await user.click(screen.getByRole('button', { name: /simpan draf/i }));
  expect((await screen.findAllByText(/minimal satu baris|pilih pelanggan|wajib diisi/i)).length).toBeGreaterThan(0);
});

it('renders read-only: banner, disabled date, no Save / Add', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  baseHandlers();
  renderEditor(<Harness mode="edit" doc={{ id: 'x1', status: 'POSTED', partnerId: 'c1' }} readOnly onSaved={vi.fn()} />);
  expect(await screen.findByText(/hanya-baca/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /simpan draf/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /tambah baris/i })).not.toBeInTheDocument();
  expect(screen.getByLabelText(/tanggal/i)).toBeDisabled();
});

it('renders the extraHeaderField only when configured', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  baseHandlers();
  const { unmount } = renderEditor(<Harness mode="create" onSaved={vi.fn()} />);
  await screen.findByLabelText(/tanggal/i);
  expect(screen.queryByLabelText(/no\. faktur vendor/i)).not.toBeInTheDocument();
  unmount();
  renderEditor(<Harness withExtra mode="create" onSaved={vi.fn()} />);
  expect(await screen.findByLabelText(/no\. faktur vendor/i)).toBeInTheDocument();
});
