/** CSV export helpers. Amounts are written as their raw 4dp API strings so a
 *  spreadsheet reads them as numbers; a UTF-8 BOM keeps Excel happy with the
 *  Indonesian labels. */

export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

/** Build a CSV and trigger a browser download. No-op-safe outside a DOM. */
export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]): void {
  const csv = '﻿' + toCsv(headers, rows); // BOM so Excel decodes UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
