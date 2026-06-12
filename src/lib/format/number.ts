const intFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
export function formatInt(n: number): string {
  return intFmt.format(n);
}
