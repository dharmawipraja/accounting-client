import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mutationFeedback } from '@/lib/api/mutationFeedback';
import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';
import { JournalLineRow, type JournalLineState } from '@/features/journals/JournalLineRow';
import { JournalTotals } from '@/features/journals/JournalTotals';
import { usePostOpeningBalances } from './mutations';

const emptyLine = (): JournalLineState => ({ id: crypto.randomUUID(), accountId: '', debit: '', credit: '', description: '' });
const hasValue = (v: string) => { try { return Money.from(v || '0').gt(Money.zero()); } catch { return false; } };

/** ADMIN-only onboarding action: seed the ledger's opening balances
 *  (POST /ledger/opening-balances). Any debit/credit difference is plugged
 *  server-side to the Saldo Awal equity account (3-9000), so balance is not
 *  required here — the totals card shows the difference that will be plugged. */
export function OpeningBalancesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const post = usePostOpeningBalances();
  const [date, setDate] = useState('');
  const [lines, setLines] = useState<JournalLineState[]>(() => [emptyLine(), emptyLine()]);

  const setLine = (i: number, patch: Partial<JournalLineState>) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const completeLines = lines.filter((l) => l.accountId && (hasValue(l.debit) || hasValue(l.credit)));
  const canSubmit = !!date && completeLines.length > 0 && !post.isPending;

  function reset() {
    setDate('');
    setLines([emptyLine(), emptyLine()]);
  }

  function onSubmit() {
    if (!canSubmit) return;
    const body = {
      date,
      balances: completeLines.map((l) => ({
        accountId: l.accountId,
        description: l.description || undefined,
        ...(hasValue(l.debit) ? { debit: Money.from(l.debit).toApi() } : { credit: Money.from(l.credit).toApi() }),
      })),
    };
    post.mutate(
      body,
      mutationFeedback({
        t,
        success: t.periods.openingBalancesSuccess,
        errorMode: 'domain',
        onClose: () => { reset(); onOpenChange(false); },
      }),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.periods.openingBalances}</DialogTitle>
          <DialogDescription>{t.periods.openingBalancesDesc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4" noValidate>
          <div className="max-w-48 space-y-1.5">
            <Label htmlFor="ob-date">{t.periods.openingBalancesDate}</Label>
            <Input id="ob-date" type="date" aria-label={t.periods.openingBalancesDate} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.journals.account}</TableHead>
                  <TableHead className="text-right">{t.journals.debit}</TableHead>
                  <TableHead className="text-right">{t.journals.credit}</TableHead>
                  <TableHead>{t.journals.lineDescription}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => (
                  <JournalLineRow key={line.id} line={line} onChange={(patch) => setLine(i, patch)} onRemove={() => setLines((prev) => prev.filter((_, idx) => idx !== i))} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-start justify-between gap-4">
            <Button type="button" variant="outline" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
              <Plus className="size-4" /> {t.journals.addLine}
            </Button>
            <JournalTotals lines={lines} />
          </div>
          <p className="text-xs text-muted-foreground">{t.periods.openingBalancesPlugHint}</p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
            <Button type="submit" disabled={!canSubmit}>{t.periods.postOpeningBalances}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
