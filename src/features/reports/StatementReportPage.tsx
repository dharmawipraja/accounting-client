import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ZodType } from 'zod';
import { PageHeader } from '@/components/common/PageHeader';
import { SkeletonForm } from '@/components/common/skeletons/SkeletonForm';
import { toApiDate, isRangeValid } from '@/lib/format/date';
import type { Messages } from '@/lib/i18n/messages.id';
import { useT } from '@/lib/i18n/useT';
import { ReportDateControls } from './ReportDateControls';
import { ReportContent } from './ReportContent';
import { StatementView, type StatementRow } from './StatementView';
import { useReport } from './useReport';

/** Jan 1 of the current year as an API date — the default range start. */
function yearStart(): string {
  const d = new Date();
  return toApiDate(new Date(d.getFullYear(), 0, 1));
}

export interface StatementReportConfig<T> {
  title: string;
  path: string;
  schema: ZodType<T>;
  /** `asOf` = single as-of date; `range` = from/to (gated on a valid range). */
  mode: 'asOf' | 'range';
  /** The one per-report seam: shape the hierarchical statement rows. */
  buildRows: (data: T, t: Messages) => StatementRow[];
  /** Optional content rendered below the statement (e.g. a balanced badge). */
  footer?: (data: T, t: Messages) => ReactNode;
}

/** The shared shell for the hierarchical statement reports (balance sheet /
 *  income statement / cash flow): header + breadcrumb + date controls + query +
 *  StatementView. Each report supplies only its path/schema/mode/title/buildRows. */
export function StatementReportPage<T>({ config }: { config: StatementReportConfig<T> }) {
  const t = useT();
  const [asOf, setAsOf] = useState(() => toApiDate(new Date()));
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(() => toApiDate(new Date()));

  const isRange = config.mode === 'range';
  const params = isRange ? { from, to } : { asOf };
  const enabled = isRange ? isRangeValid(from, to) : true;
  const query = useReport(config.path, params, config.schema, enabled);

  return (
    <div>
      <PageHeader title={config.title} parent={{ to: '/reports', label: t.nav.reports }} />
      {isRange ? (
        <ReportDateControls mode="range" from={from} to={to} onRange={(f, tt) => { setFrom(f); setTo(tt); }} />
      ) : (
        <ReportDateControls mode="asOf" asOf={asOf} onAsOf={setAsOf} />
      )}
      <ReportContent query={query} loading={<SkeletonForm fields={5} />}>
        {(data) => {
          const statement = <StatementView rows={config.buildRows(data, t)} caption={config.title} />;
          return config.footer ? (
            <div className="space-y-3">
              {statement}
              {config.footer(data, t)}
            </div>
          ) : (
            statement
          );
        }}
      </ReportContent>
    </div>
  );
}
