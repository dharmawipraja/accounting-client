import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDocumentSubmit } from '@/features/documents/useDocumentSubmit';
import { FieldError } from '@/components/common/FieldError';
import { Money } from '@/lib/money/money';
import { useT } from '@/lib/i18n/useT';
import { JournalLineRow, type JournalLineState } from './JournalLineRow';
import { JournalTotals } from './JournalTotals';
import { isBalanced } from './balance';
import { useCreateJournalEntry } from './hooks';

const headerSchema = z.object({ date: z.string().min(1, 'required'), description: z.string().min(1, 'required') });
type HeaderValues = z.infer<typeof headerSchema>;

const emptyLine = (): JournalLineState => ({ id: crypto.randomUUID(), accountId: '', debit: '', credit: '', description: '' });
const hasValue = (v: string) => { try { return Money.from(v || '0').gt(Money.zero()); } catch { return false; } };

export function JournalEntryForm({ onSaved }: { onSaved: () => void }) {
  const t = useT();
  const create = useCreateJournalEntry();
  const form = useForm<HeaderValues>({ resolver: zodResolver(headerSchema), defaultValues: { date: '', description: '' } });
  const handlers = useDocumentSubmit(form, onSaved);
  const [lines, setLines] = useState<JournalLineState[]>(() => [emptyLine(), emptyLine()]);

  const setLine = (i: number, patch: Partial<JournalLineState>) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const balanced = isBalanced(lines);

  function onSubmit(values: HeaderValues) {
    if (!balanced) return;
    const payload = {
      date: values.date,
      description: values.description,
      lines: lines
        .filter((l) => l.accountId && (hasValue(l.debit) || hasValue(l.credit)))
        .map((l) => ({
          accountId: l.accountId,
          description: l.description || undefined,
          ...(hasValue(l.debit) ? { debit: Money.from(l.debit).toApi() } : { credit: Money.from(l.credit).toApi() }),
        })),
    };
    create.mutate(payload, handlers);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="jdate">{t.journals.date}</Label>
          <Input id="jdate" type="date" aria-label={t.journals.date} {...form.register('date')} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="jdesc">{t.journals.description}</Label>
          <Input id="jdesc" aria-label={t.journals.description} {...form.register('description')} />
        </div>
      </div>

      <div className="rounded-lg border">
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
              <JournalLineRow key={line.id} line={line} onChange={(patch) => setLine(i, patch)} onRemove={() => removeLine(i)} />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-start justify-between gap-4">
        <Button type="button" variant="outline" onClick={addLine}><Plus className="size-4" /> {t.journals.addLine}</Button>
        <JournalTotals lines={lines} />
      </div>

      <FieldError message={form.formState.errors.date ? t.journals.required : undefined} />
      <FieldError message={form.formState.errors.description ? t.journals.required : undefined} />
      <FieldError message={form.formState.errors.root?.message} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSaved}>{t.common.cancel}</Button>
        <Button type="submit" disabled={!balanced || create.isPending}>{t.journals.saveEntry}</Button>
      </div>
    </form>
  );
}
