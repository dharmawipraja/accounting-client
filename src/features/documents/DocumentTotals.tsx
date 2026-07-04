import { Money } from '@/lib/money/money';
import { ApiError } from '@/lib/api/errors';
import { useT } from '@/lib/i18n/useT';
import { MoneyText } from '@/components/common/MoneyText';
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
      <Row label={t.documents.subtotal} value={data?.subtotal ?? '0'} />
      <Row label={`+ ${t.documents.ppn}`} value={ppn.toApi()} />
      <Row label={`− ${t.documents.pphWithheld}`} value={pph.toApi()} />
      <div className="border-t pt-1">
        <Row label={t.documents.total} value={data?.settlementAmount ?? '0'} strong />
      </div>
    </div>
  );
}

/** Money rendered through the shared MoneyText primitive (Public Sans tabular 600),
 *  not a mono one-off, so the totals match every other figure in the app. */
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={strong ? 'font-medium text-foreground' : 'text-muted-foreground'}>{label}</span>
      <MoneyText value={value} />
    </div>
  );
}
