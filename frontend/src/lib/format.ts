export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString('en-US');
}
