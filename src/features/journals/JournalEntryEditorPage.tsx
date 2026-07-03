import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { JournalStatusChip } from '@/components/common/statusChips';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NotFound } from '@/components/common/NotFound';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { MoneyText } from '@/components/common/MoneyText';
import { formatDateID } from '@/lib/format/date';
import { useEntityLabelMap } from '@/lib/hooks/useEntityLabelMap';
import { useT } from '@/lib/i18n/useT';
import { accountsApi } from '@/features/accounts/hooks';
import { JournalEntryForm } from './JournalEntryForm';
import { useJournalEntry } from './hooks';

export function JournalEntryEditorPage({ id }: { id?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const goList = () => navigate({ to: '/journals' });
  const item = useJournalEntry(id ?? '');
  const accountName = useEntityLabelMap(accountsApi.useList, (a) => `${a.code} — ${a.name}`);

  if (!id) {
    return <div><PageHeader title={t.journals.newEntry} parent={{ to: '/journals', label: t.nav.journals }} /><JournalEntryForm onSaved={goList} /></div>;
  }

  return (
    <QueryState
      query={item}
      loading={<SkeletonForm fields={6} />}
      onRetry
      notFound={
        <NotFound
          title={t.notFound.recordTitle}
          message={t.notFound.recordMessage}
          action={<Button onClick={goList}>{t.notFound.backToList}</Button>}
        />
      }
    >
      {(je) => (
        <div className="space-y-4">
          <PageHeader title={`${t.journals.view}${je.entryRef ? ` · ${je.entryRef}` : ''}`} parent={{ to: '/journals', label: t.nav.journals }} />
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div><div className="text-muted-foreground">{t.journals.date}</div><div>{formatDateID(je.date.slice(0, 10))}</div></div>
            <div className="md:col-span-2"><div className="text-muted-foreground">{t.journals.description}</div><div>{je.description}</div></div>
            <div><div className="text-muted-foreground">{t.journals.status}</div><JournalStatusChip status={je.status} t={t} /></div>
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
      )}
    </QueryState>
  );
}
