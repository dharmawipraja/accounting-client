import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';
import { MoneyText } from '@/components/common/MoneyText';
import { Money } from '@/lib/money/money';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import type { OpenDocument } from './useOpenDocuments';

interface Props {
  documents: OpenDocument[];
  amounts: Record<string, string>;
  onAmountChange: (documentId: string, raw: string) => void;
  readOnly?: boolean;
  partnerSelected: boolean;
}

export function AllocationTable({ documents, amounts, onAmountChange, readOnly, partnerSelected }: Props) {
  const t = useT();
  if (!partnerSelected) return <p className="text-sm text-muted-foreground">{t.payments.selectPartnerFirst}</p>;
  if (documents.length === 0) return <EmptyState message={t.payments.noOpenDocuments} />;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.payments.documentRef}</TableHead>
            <TableHead>{t.payments.dueDate}</TableHead>
            <TableHead className="text-right">{t.payments.outstanding}</TableHead>
            <TableHead className="text-right">{t.payments.allocation}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const over = (() => {
              try { return Money.from(amounts[doc.id] || '0').gt(Money.from(doc.outstanding)); } catch { return false; }
            })();
            return (
              <TableRow key={doc.id}>
                <TableCell>{doc.ref ?? '—'}</TableCell>
                <TableCell>{doc.dueDate ? formatDateID(doc.dueDate.slice(0, 10)) : '—'}</TableCell>
                <TableCell className="text-right"><MoneyText value={doc.outstanding} /></TableCell>
                <TableCell className="w-40">
                  <Input
                    className="text-right font-mono tabular-nums"
                    inputMode="decimal"
                    aria-label={`${t.payments.allocation} ${doc.ref ?? doc.id}`}
                    value={amounts[doc.id] ?? ''}
                    disabled={readOnly}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (next === '' || /^\d*\.?\d{0,4}$/.test(next)) onAmountChange(doc.id, next);
                    }}
                  />
                  {over ? <p role="alert" className="text-xs text-destructive">{t.payments.overAllocated}</p> : null}
                </TableCell>
                <TableCell>
                  {readOnly ? null : (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onAmountChange(doc.id, Money.from(doc.outstanding).toApi())}>
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
