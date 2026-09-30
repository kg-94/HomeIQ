// Small helpers for the home-page charts. Amounts are summed in paise to avoid float drift.

/** The last `n` month keys ("YYYY-MM"), oldest first, ending with `today`'s month. */
export function monthKeys(today: string, n: number): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

/** First day of the oldest of the last `n` months. */
export const monthsStart = (today: string, n: number) => `${monthKeys(today, n)[0]}-01`;

/** Sum `amount` per month key; months with no rows are 0. */
export function sumByMonth<T extends { amount: number }>(rows: T[], dateOf: (r: T) => string, keys: string[]): number[] {
  const paise = new Map(keys.map((k) => [k, 0]));
  for (const r of rows) {
    const k = dateOf(r).slice(0, 7);
    if (paise.has(k)) paise.set(k, paise.get(k)! + Math.round(r.amount * 100));
  }
  return keys.map((k) => paise.get(k)! / 100);
}

/** A clean axis: step rounded up to a round number × 10^k (so the top is close to `max`), split into `count` ticks. */
export function niceScale(max: number, count = 4): { max: number; ticks: number[] } {
  if (max <= 0) return { max: 1, ticks: [0] };
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((s) => s * pow).find((s) => s >= raw)!;
  return { max: step * count, ticks: Array.from({ length: count + 1 }, (_, i) => step * i) };
}

/** Totals per category, largest first; the tail past `top` folds into "Other". */
export function byCategory(rows: { amount: number; category: string | null }[], top = 5) {
  const paise = new Map<string, number>();
  for (const r of rows) {
    const k = r.category?.trim() || "Uncategorised";
    paise.set(k, (paise.get(k) ?? 0) + Math.round(r.amount * 100));
  }
  const sorted = [...paise].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, top);
  const rest = sorted.slice(top).reduce((a, [, v]) => a + v, 0);
  if (rest > 0) head.push(["Other", rest]);
  return head.map(([name, v]) => ({ name, amount: v / 100 }));
}

export const monthLabel = (key: string) =>
  new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
