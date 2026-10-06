export function formatRupiah(n: number | string): string {
  const num = Math.round(Number(n) || 0);
  return 'Rp ' + num.toLocaleString('id-ID');
}

export function formatNumber(n: number | string): string {
  const num = Math.round(Number(n) || 0);
  return num.toLocaleString('id-ID');
}

export function formatPercent(n: number | string): string {
  return (Number(n) || 0).toFixed(2) + '%';
}

export function formatDateShort(d: string): string {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
