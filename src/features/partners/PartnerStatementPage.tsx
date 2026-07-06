import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoneyText } from '@/components/common/MoneyText';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { DocStatusChip, DirectionChip } from '@/components/common/statusChips';
import { documentStatusLabel, type DocumentStatus } from '@/features/documents/statusLabel';
import { salesInvoicesApi } from '@/features/sales-invoices/hooks';
import { purchaseBillsApi } from '@/features/purchase-bills/hooks';
import { paymentsApi } from '@/features/payments/hooks';
import type { SalesInvoice } from '@/features/sales-invoices/schema';
import type { PurchaseBill } from '@/features/purchase-bills/schema';
import type { Payment } from '@/features/payments/schema';
import { Money } from '@/lib/money/money';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { usePartner } from './hooks';

/** Sum of outstanding over POSTED documents = the live AR/AP position. */
function outstandingOf(docs: { status: string; outstanding: string }[]): string {
  return docs
    .filter((d) => d.status === 'POSTED')
    .reduce((acc, d) => acc.plus(Money.from(d.outstanding)), Money.zero())
    .toApi();
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold"><MoneyText value={value} /></div>
    </div>
  );
}

function Section<T extends { id: string }>({ title, rows, head, row, empty }: { title: string; rows: T[]; head: ReactNode; row: (r: T) => ReactNode; empty: string }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader><TableRow>{head}</TableRow></TableHeader>
            <TableBody>{rows.map((r) => row(r))}</TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

/** Partner statement: a customer/vendor's outstanding position plus their sales
 *  invoices, purchase bills, and payments (all queried by ?partnerId=). */
export function PartnerStatementPage({ id }: { id: string }) {
  const t = useT();
  const partner = usePartner(id);
  const isCustomer = partner.data?.isCustomer ?? false;
  const isVendor = partner.data?.isVendor ?? false;

  const invoices = salesInvoicesApi.usePagedList({ partnerId: id, limit: 200 }, { enabled: !!id && isCustomer });
  const bills = purchaseBillsApi.usePagedList({ partnerId: id, limit: 200 }, { enabled: !!id && isVendor });
  const payments = paymentsApi.usePagedList({ partnerId: id, limit: 200 }, { enabled: !!id });

  const invoiceRows = (invoices.data?.data ?? []) as SalesInvoice[];
  const billRows = (bills.data?.data ?? []) as PurchaseBill[];
  const paymentRows = (payments.data?.data ?? []) as Payment[];

  const title = partner.data ? `${partner.data.code} · ${partner.data.name}` : t.partners.title;

  return (
    <div>
      <PageHeader title={title} parent={{ to: '/partners', label: t.nav.partners }} />

      <QueryState query={partner} loading={<Skeleton className="h-20 w-full max-w-xl" />} onRetry>
        {(p) => (
          <div className="mb-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {p.isCustomer ? <Badge variant="outline">{t.partners.customer}</Badge> : null}
              {p.isVendor ? <Badge variant="outline">{t.partners.vendor}</Badge> : null}
              {p.npwp ? <span className="text-sm text-muted-foreground">{t.partners.npwp}: {p.npwp}</span> : null}
              {p.email ? <span className="text-sm text-muted-foreground">{p.email}</span> : null}
              {p.phone ? <span className="text-sm text-muted-foreground">{p.phone}</span> : null}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:max-w-xl">
              {isCustomer ? <SummaryTile label={t.partners.arOutstanding} value={outstandingOf(invoiceRows)} /> : null}
              {isVendor ? <SummaryTile label={t.partners.apOutstanding} value={outstandingOf(billRows)} /> : null}
            </div>
          </div>
        )}
      </QueryState>

      <div className="space-y-6">
        {isCustomer ? (
          <QueryState query={invoices} loading={<Skeleton className="h-24 w-full" />} onRetry>
            {() => (
              <Section<SalesInvoice>
                title={t.nav.salesInvoices}
                rows={invoiceRows}
                empty={t.partners.noInvoices}
                head={<><TableHead>{t.salesInvoices.number}</TableHead><TableHead>{t.salesInvoices.date}</TableHead><TableHead>{t.salesInvoices.status}</TableHead><TableHead className="text-right">{t.reports.total}</TableHead><TableHead className="text-right">{t.payments.outstanding}</TableHead></>}
                row={(inv) => (
                  <TableRow key={inv.id}>
                    <TableCell><Button asChild variant="link" className="h-auto p-0 font-normal"><Link to="/sales-invoices/$id/edit" params={{ id: inv.id }}>{inv.invoiceRef ?? '—'}</Link></Button></TableCell>
                    <TableCell>{formatDateID(inv.date.slice(0, 10))}</TableCell>
                    <TableCell><DocStatusChip status={inv.status} label={documentStatusLabel(t, inv.status as DocumentStatus)} /></TableCell>
                    <TableCell className="text-right"><MoneyText value={inv.total} /></TableCell>
                    <TableCell className="text-right"><MoneyText value={inv.outstanding} /></TableCell>
                  </TableRow>
                )}
              />
            )}
          </QueryState>
        ) : null}

        {isVendor ? (
          <QueryState query={bills} loading={<Skeleton className="h-24 w-full" />} onRetry>
            {() => (
              <Section<PurchaseBill>
                title={t.nav.purchaseBills}
                rows={billRows}
                empty={t.partners.noBills}
                head={<><TableHead>{t.purchaseBills.number}</TableHead><TableHead>{t.purchaseBills.date}</TableHead><TableHead>{t.purchaseBills.status}</TableHead><TableHead className="text-right">{t.reports.total}</TableHead><TableHead className="text-right">{t.payments.outstanding}</TableHead></>}
                row={(bill) => (
                  <TableRow key={bill.id}>
                    <TableCell><Button asChild variant="link" className="h-auto p-0 font-normal"><Link to="/purchase-bills/$id/edit" params={{ id: bill.id }}>{bill.billRef ?? '—'}</Link></Button></TableCell>
                    <TableCell>{formatDateID(bill.date.slice(0, 10))}</TableCell>
                    <TableCell><DocStatusChip status={bill.status} label={documentStatusLabel(t, bill.status as DocumentStatus)} /></TableCell>
                    <TableCell className="text-right"><MoneyText value={bill.total} /></TableCell>
                    <TableCell className="text-right"><MoneyText value={bill.outstanding} /></TableCell>
                  </TableRow>
                )}
              />
            )}
          </QueryState>
        ) : null}

        <QueryState query={payments} loading={<Skeleton className="h-24 w-full" />} onRetry>
          {() =>
            paymentRows.length === 0 ? (
              <EmptyState title={t.partners.noPayments} description={t.partners.noPaymentsHint} />
            ) : (
              <Section<Payment>
                title={t.nav.payments}
                rows={paymentRows}
                empty={t.partners.noPayments}
                head={<><TableHead>{t.payments.number}</TableHead><TableHead>{t.payments.date}</TableHead><TableHead>{t.payments.direction}</TableHead><TableHead>{t.payments.status}</TableHead><TableHead className="text-right">{t.payments.amount}</TableHead></>}
                row={(pay) => (
                  <TableRow key={pay.id}>
                    <TableCell><Button asChild variant="link" className="h-auto p-0 font-normal"><Link to="/payments/$id/edit" params={{ id: pay.id }}>{pay.ref ?? '—'}</Link></Button></TableCell>
                    <TableCell>{formatDateID(pay.date.slice(0, 10))}</TableCell>
                    <TableCell><DirectionChip direction={pay.direction} t={t} /></TableCell>
                    <TableCell><DocStatusChip status={pay.status} label={documentStatusLabel(t, pay.status as DocumentStatus)} /></TableCell>
                    <TableCell className="text-right"><MoneyText value={pay.amount ?? '0'} /></TableCell>
                  </TableRow>
                )}
              />
            )
          }
        </QueryState>
      </div>
    </div>
  );
}
