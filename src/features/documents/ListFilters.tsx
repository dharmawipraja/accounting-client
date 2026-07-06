import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PartnerSelect } from '@/features/partners/PartnerSelect';
import { useT } from '@/lib/i18n/useT';
import type { FilterConfig } from './useDocumentListController';

/** Renders the list-page filter controls for each FilterConfig kind:
 *  button groups (status/direction), a partner combobox, and a from/to date range. */
export function ListFilters({
  filters,
  values,
  onChange,
}: {
  filters: readonly FilterConfig[];
  values: Record<string, string>;
  onChange: (param: string, value: string) => void;
}) {
  const t = useT();
  return (
    <>
      {filters.map((f, i) => {
        if (f.kind === 'partner') {
          return (
            <div key={f.param} className="w-56 space-y-1">
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <PartnerSelect
                value={values[f.param] || undefined}
                onChange={(id) => onChange(f.param, id)}
                filter={f.partnerFilter}
                aria-label={f.label}
                placeholder={t.common.allPartners}
              />
            </div>
          );
        }
        if (f.kind === 'dateRange') {
          return (
            <div key={f.fromParam} className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor={f.fromParam} className="text-xs text-muted-foreground">{f.label ?? t.reports.from}</Label>
                <Input id={f.fromParam} type="date" className="w-40" aria-label={f.label ?? t.reports.from} value={values[f.fromParam] ?? ''} onChange={(e) => onChange(f.fromParam, e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={f.toParam} className="text-xs text-muted-foreground">{t.reports.to}</Label>
                <Input id={f.toParam} type="date" className="w-40" aria-label={t.reports.to} value={values[f.toParam] ?? ''} onChange={(e) => onChange(f.toParam, e.target.value)} />
              </div>
            </div>
          );
        }
        return (
          <div key={f.param ?? i} className="flex gap-1">
            {f.options.map((o) => (
              <Button
                key={o.value}
                size="sm"
                variant={values[f.param] === o.value ? 'default' : 'outline'}
                onClick={() => onChange(f.param, o.value)}
              >
                {o.label}
              </Button>
            ))}
          </div>
        );
      })}
    </>
  );
}
