import { Money } from '@/lib/money/money';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';
import { useTaxPreview, type TaxPreviewLine } from './useTaxPreview';

function sumByKind(taxes: { kind: string; amount: string }[], prefix: string): Money {
  return taxes.filter((x) => x.kind.startsWith(prefix)).reduce((acc, x) => acc.plus(Money.from(x.amount)), Money.zero());
}

export function DocumentTotals({ nature, settlementAccountId, lines }: { nature: 'SALE' | 'PURCHASE'; settlementAccountId?: string; lines: TaxPreviewLine[] }) {
  const t = useT();
  const { data, isLoading, error } = useTaxPreview({ nature, settlementAccountId, lines });
  const ppn = data ? sumByKind(data.taxes, 'PPN') : Money.zero();
  const pph = data ? sumByKind(data.taxes, 'PPH') : Money.zero();

  return (
    <div className="ml-auto w-full max-w-xs space-y-1 rounded-lg border p-4 text-sm">
      {isLoading ? <p className="text-muted-foreground">{t.documents.calculating}</p> : null}
      {error instanceof ApiError ? <p role="alert" className="text-destructive">{error.message}</p> : null}
      <Row label={t.documents.subtotal} value={data ? Money.from(data.subtotal).toRupiah() : Money.zero().toRupiah()} />
      <Row label={`+ ${t.documents.ppn}`} value={ppn.toRupiah()} />
      <Row label={`− ${t.documents.pphWithheld}`} value={pph.toRupiah()} />
      <div className="border-t pt-1">
        <Row label={t.documents.total} value={data ? Money.from(data.settlementAmount).toRupiah() : Money.zero().toRupiah()} bold />
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
