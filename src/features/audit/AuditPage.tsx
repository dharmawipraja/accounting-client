import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryState } from '@/components/common/QueryState';
import { useRole } from '@/components/common/RoleGate';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { useT } from '@/lib/i18n/useT';
import { Pagination } from '@/components/common/Pagination';
import { useAuditLog, type AuditFilters } from './useAuditLog';
import { AUDIT_METHODS, formatAuditTime, type AuditEntry } from './schema';

const LIMIT = 50;

export function AuditPage() {
  const t = useT();
  const role = useRole();
  if (role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title={t.audit.title} />
        <p className="text-sm text-muted-foreground">{t.roles.forbidden}</p>
      </div>
    );
  }
  return <AuditContent />;
}

function AuditContent() {
  const t = useT();
  const [method, setMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const filters: AuditFilters = { method: method || undefined, from: from || undefined, to: to || undefined, limit: LIMIT, offset };
  const query = useAuditLog(filters);

  const onMethod = (v: string) => { setMethod(v === 'ALL' ? '' : v); setOffset(0); };
  const onFrom = (v: string) => { setFrom(v); setOffset(0); };
  const onTo = (v: string) => { setTo(v); setOffset(0); };

  return (
    <div>
      <PageHeader title={t.audit.title} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>{t.audit.method}</Label>
          <Select value={method || 'ALL'} onValueChange={onMethod}>
            <SelectTrigger className="w-40" aria-label={t.audit.method}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t.audit.allMethods}</SelectItem>
              {AUDIT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-from">{t.audit.from}</Label>
          <Input id="a-from" type="date" aria-label={t.audit.from} value={from} onChange={(e) => onFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-to">{t.audit.to}</Label>
          <Input id="a-to" type="date" aria-label={t.audit.to} value={to} onChange={(e) => onTo(e.target.value)} />
        </div>
      </div>

      <QueryState query={query} loading={<SkeletonTable rows={8} cols={5} />} onRetry>
        {(rows) => (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.audit.waktu}</TableHead>
                    <TableHead>{t.audit.pengguna}</TableHead>
                    <TableHead>{t.audit.metode}</TableHead>
                    <TableHead>{t.audit.path}</TableHead>
                    <TableHead>{t.audit.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t.audit.empty}</TableCell></TableRow>
                  ) : (
                    rows.map((e) => (
                      <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelected(e)}>
                        <TableCell className="whitespace-nowrap tabular-nums">{formatAuditTime(e.timestamp)}</TableCell>
                        <TableCell>{e.userRole ?? '—'}</TableCell>
                        <TableCell><Badge variant="outline">{e.method}</Badge></TableCell>
                        <TableCell className="max-w-xs truncate">{e.path}</TableCell>
                        <TableCell><Badge variant={e.statusCode && e.statusCode < 400 ? 'default' : 'destructive'}>{e.statusCode ?? '—'}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <Pagination offset={offset} limit={LIMIT} count={rows.length} onChange={setOffset} />
          </>
        )}
      </QueryState>

      <Sheet open={selected !== null} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{t.audit.detail}</SheetTitle></SheetHeader>
          {selected ? (
            <div className="space-y-3 px-4 pb-4 text-sm">
              <div className="flex items-center gap-2"><Badge variant="outline">{selected.method}</Badge><span className="break-all">{selected.path}</span></div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">{t.audit.waktu}</dt><dd>{formatAuditTime(selected.timestamp)}</dd>
                <dt className="text-muted-foreground">{t.audit.pengguna}</dt><dd>{selected.userRole ?? '—'}{selected.userId ? ` (${selected.userId})` : ''}</dd>
                <dt className="text-muted-foreground">{t.audit.status}</dt><dd>{selected.statusCode ?? '—'}</dd>
                <dt className="text-muted-foreground">{t.audit.durasi}</dt><dd>{selected.durationMs ?? '—'} ms</dd>
                <dt className="text-muted-foreground">{t.audit.ip}</dt><dd>{selected.ip ?? '—'}</dd>
              </dl>
              <div>
                <p className="font-medium">{t.audit.body}</p>
                <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">{JSON.stringify(selected.body, null, 2)}</pre>
              </div>
              <div>
                <p className="font-medium">{t.audit.params}</p>
                <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">{JSON.stringify(selected.params, null, 2)}</pre>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
