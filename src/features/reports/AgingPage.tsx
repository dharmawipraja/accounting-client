import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { MoneyText } from '@/components/common/MoneyText';
import { Money } from '@/lib/money/money';
import { formatDateID, toApiDate } from '@/lib/format/date';
import { useT } from '@/lib/i18n/useT';
import { SkeletonTable } from '@/components/common/skeletons/SkeletonTable';
import { ExportCsvButton } from '@/components/common/ExportCsvButton';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { ReportTable, MoneyCell, type ReportColumn } from './ReportTable';
import { useReport } from './useReport';
import { agingReportSchema, AGING_BUCKETS, type AgingPartner, type AgingDocument } from './schema';

function partnerTotal(p: AgingPartner): string {
  return AGING_BUCKETS.reduce((m, b) => m.plus(Money.from(p.buckets[b] ?? '0')), Money.zero()).toApi();
}

export function AgingPage({ kind }: { kind: 'AR' | 'AP' }) {
  const t = useT();
  const [asOf, setAsOf] = useState(() => toApiDate(new Date()));
  const [selected, setSelected] = useState<AgingPartner | null>(null);
  const path = kind === 'AR' ? '/reports/ar-aging' : '/reports/ap-aging';
  const query = useReport(path, { asOf }, agingReportSchema);
  const partnerLabel = kind === 'AR' ? t.reports.pelanggan : t.reports.vendor;

  const summaryColumns: ReportColumn<AgingPartner>[] = [
    { header: partnerLabel, cell: (p) => p.partnerName },
    ...AGING_BUCKETS.map((b): ReportColumn<AgingPartner> => ({
      header: b === 'Current' ? t.reports.lancar : b,
      align: 'right',
      cell: (p) => <MoneyCell value={p.buckets[b] ?? '0'} />,
    })),
    { header: t.reports.total, align: 'right', cell: (p) => <MoneyText value={partnerTotal(p)} /> },
  ];

  const docColumns: ReportColumn<AgingDocument>[] = [
    { header: t.reports.ref, cell: (d) => d.ref ?? '' },
    { header: t.reports.tanggal, cell: (d) => formatDateID(d.date.slice(0, 10)) },
    { header: t.reports.jatuhTempo, cell: (d) => (d.dueDate ? formatDateID(d.dueDate.slice(0, 10)) : '') },
    { header: t.reports.total, align: 'right', cell: (d) => <MoneyText value={d.total} /> },
    { header: t.reports.dibayar, align: 'right', cell: (d) => <MoneyCell value={d.paidAsOf ?? '0'} /> },
    { header: t.reports.outstanding, align: 'right', cell: (d) => <MoneyText value={d.outstanding} /> },
    { header: t.reports.umur, cell: (d) => d.bucket },
  ];

  const title = kind === 'AR' ? t.reports.arAging : t.reports.apAging;

  return (
    <div>
      <PageHeader title={title} parent={{ to: '/reports', label: t.nav.reports }} />
      <ReportDateControls mode="asOf" asOf={asOf} onAsOf={setAsOf} />
      <ReportContent query={query} loading={<SkeletonTable rows={6} cols={4} />}>
        {(rep) => {
          const bucketHeaders = AGING_BUCKETS.map((b) => (b === 'Current' ? t.reports.lancar : b));
          const csvRows = rep.partners.map((p) => [p.partnerName, ...AGING_BUCKETS.map((b) => p.buckets[b] ?? '0'), partnerTotal(p)]);
          return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <ExportCsvButton filename={title} headers={[partnerLabel, ...bucketHeaders, t.reports.total]} rows={csvRows} />
            </div>
            <ReportTable<AgingPartner>
              columns={summaryColumns}
              rows={rep.partners}
              onRowClick={(p) => setSelected(p)}
              rowLabel={(p) => p.partnerName}
              footer={
                <TableRow>
                  <TableCell className="font-semibold">{t.reports.total}</TableCell>
                  {AGING_BUCKETS.map((b) => (
                    <TableCell key={b} className="text-right font-semibold tabular-nums">
                      <MoneyText value={rep.totalsByBucket[b] ?? '0'} />
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular-nums"><MoneyText value={rep.totalOutstanding} /></TableCell>
                </TableRow>
              }
            />
            {selected ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">{selected.partnerName}</div>
                <ReportTable<AgingDocument> columns={docColumns} rows={selected.documents} />
              </div>
            ) : null}
          </div>
          );
        }}
      </ReportContent>
    </div>
  );
}
