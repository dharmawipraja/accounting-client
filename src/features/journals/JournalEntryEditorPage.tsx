import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { MoneyText } from '@/components/common/MoneyText';
import { formatDateID } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { accountsApi } from '@/features/accounts/hooks';
import { JournalEntryForm } from './JournalEntryForm';
import { useJournalEntry } from './hooks';

export function JournalEntryEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/journals' });
  const item = useJournalEntry(id ?? '');
  const accounts = accountsApi.useList();
  const accountName = useMemo(() => {
    const map = new Map((accounts.data ?? []).map((a) => [a.id, `${a.code} — ${a.name}`]));
    return (aid: string) => map.get(aid) ?? aid;
  }, [accounts.data]);

  if (!id) {
    return <div><PageHeader title={t.journals.newEntry} /><JournalEntryForm onSaved={goList} /></div>;
  }
  if (item.isLoading) return <Skeleton className="h-96 w-full" />;
  if (item.isError || !item.data) return <ErrorState error={item.error} />;
  const je = item.data;
  return (
    <div className="space-y-4">
      <PageHeader title={`${t.journals.view}${je.entryRef ? ` · ${je.entryRef}` : ''}`} />
      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div><div className="text-muted-foreground">{t.journals.date}</div><div>{formatDateID(je.date.slice(0, 10))}</div></div>
        <div className="md:col-span-2"><div className="text-muted-foreground">{t.journals.description}</div><div>{je.description}</div></div>
        <div><div className="text-muted-foreground">{t.journals.status}</div><Badge variant={je.status === 'DRAFT' ? 'secondary' : 'default'}>{je.status === 'DRAFT' ? t.journals.statusDraft : t.journals.statusPosted}</Badge></div>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.journals.account}</TableHead>
              <TableHead className="text-right">{t.journals.debit}</TableHead>
              <TableHead className="text-right">{t.journals.credit}</TableHead>
              <TableHead>{t.journals.lineDescription}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {je.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{accountName(l.accountId)}</TableCell>
                <TableCell className="text-right"><MoneyText value={l.debit} /></TableCell>
                <TableCell className="text-right"><MoneyText value={l.credit} /></TableCell>
                <TableCell>{l.description ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
