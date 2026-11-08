export const usd = (n: number | null | undefined) =>
  n == null ? "n/a" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, notation: n >= 1e6 ? "compact" : "standard" }).format(n);

export const num = (n: number) => new Intl.NumberFormat("en-US").format(n);

export function ago(iso: string | null | undefined) {
  if (!iso) return "date unknown";
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
