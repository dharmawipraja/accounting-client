/** CSV export helpers. Amounts are written as their raw 4dp API strings so a
 *  spreadsheet reads them as numbers; a UTF-8 BOM keeps Excel happy with the
 *  Indonesian labels. Delimiter is ';' — Indonesian-locale Excel uses ',' as
 *  the DECIMAL symbol and ';' as the list separator, so a comma-delimited file
 *  double-clicked open would land entirely in one column. */

export type CsvCell = string | number | null | undefined;

/** A plain (possibly negative) number, which must stay numeric for the spreadsheet. */
const NUMERIC = /^-?\d+(\.\d+)?$/;
/** Leading chars a spreadsheet may execute as a formula (Excel/Sheets/LibreOffice). */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

function escapeCell(value: CsvCell): string {
  let s = value == null ? '' : String(value);
  // CSV formula-injection guard: a leading = + - @ tab or CR can run as a formula
  // when the file is opened. Prefix a quote on non-numeric text so a partner name
  // or description can't smuggle one; genuine numbers (incl. -1500.00) are left as-is.
  if (s !== '' && FORMULA_TRIGGER.test(s) && !NUMERIC.test(s)) {
    s = `'${s}`;
  }
  return /[";,\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const DELIMITER = ';';

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(DELIMITER)).join('\r\n');
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
