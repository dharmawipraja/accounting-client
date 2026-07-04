import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/useT';
import { downloadCsv, type CsvCell } from '@/lib/export/csv';

/** Downloads the given table as a CSV. Disabled when there are no rows so an
 *  empty report can't produce an empty file. */
export function ExportCsvButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: CsvCell[][];
}) {
  const t = useT();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, headers, rows)}
    >
      <Download className="size-4" /> {t.common.exportCsv}
    </Button>
  );
}
