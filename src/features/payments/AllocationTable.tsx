import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';
import { MoneyText } from '@/components/common/MoneyText';
import { Money } from '@/lib/money/money';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import type { SalesInvoice } from '@/features/sales-invoices/schema';

interface Props {
  invoices: SalesInvoice[];
  amounts: Record<string, string>;
  onAmountChange: (invoiceId: string, raw: string) => void;
  readOnly?: boolean;
  partnerSelected: boolean;
}

export function AllocationTable({ invoices, amounts, onAmountChange, readOnly, partnerSelected }: Props) {
  const t = useT();
  if (!partnerSelected) return <p className="text-sm text-muted-foreground">{t.payments.selectPartnerFirst}</p>;
  if (invoices.length === 0) return <EmptyState message={t.payments.noOpenInvoices} />;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.payments.invoiceRef}</TableHead>
            <TableHead>{t.payments.dueDate}</TableHead>
            <TableHead className="text-right">{t.payments.outstanding}</TableHead>
            <TableHead className="text-right">{t.payments.allocation}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => {
            const over = (() => {
              try { return Money.from(amounts[inv.id] || '0').gt(Money.from(inv.outstanding)); } catch { return false; }
            })();
            return (
              <TableRow key={inv.id}>
                <TableCell>{inv.invoiceRef ?? '—'}</TableCell>
                <TableCell>{inv.dueDate ? formatDateID(inv.dueDate.slice(0, 10)) : '—'}</TableCell>
                <TableCell className="text-right"><MoneyText value={inv.outstanding} /></TableCell>
                <TableCell className="w-40">
                  <Input
                    className="text-right font-mono tabular-nums"
                    inputMode="decimal"
                    aria-label={`${t.payments.allocation} ${inv.invoiceRef ?? inv.id}`}
                    value={amounts[inv.id] ?? ''}
                    disabled={readOnly}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (next === '' || /^\d*\.?\d{0,4}$/.test(next)) onAmountChange(inv.id, next);
                    }}
                  />
                  {over ? <p role="alert" className="text-xs text-destructive">{t.payments.overAllocated}</p> : null}
                </TableCell>
                <TableCell>
                  {readOnly ? null : (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onAmountChange(inv.id, Money.from(inv.outstanding).toApi())}>
                      {t.payments.payFull}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
