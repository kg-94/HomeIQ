import { z } from "zod";

// App-side money is integer paise (1/100 of the unit) to avoid float drift;
// the DB stores numeric(12,2). Convert at the edges with toPaise / fromPaise.

export const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);

/** "1,234.5" -> 123450; null if not a non-negative amount with at most 2 decimals. */
export function toPaise(input: string): number | null {
  const s = input.replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(paise) && paise <= 9_999_999_999_99 ? paise : null;
}

export const fromPaise = (paise: number) => paise / 100;

/** Form field -> positive integer paise ("1,234.50" -> 123450). */
export const amountPaise = z
  .string()
  .transform((v) => toPaise(v) ?? -1)
  .pipe(z.number().int().positive("Enter a valid amount"));

/** Equal shares that sum exactly to `paise`; the first members absorb the remainder. */
export function splitEqually(paise: number, n: number): number[] {
  const base = Math.floor(paise / n);
  return Array.from({ length: n }, (_, i) => base + (i < paise % n ? 1 : 0));
}

export type Transfer = { from: string; to: string; paise: number };

/**
 * Turns balances (paise; positive = is owed) into a short list of payments
 * that settles everyone: largest debtor pays largest creditor, repeat.
 */
export function settleUp(balances: Record<string, number>): Transfer[] {
  const creditors = Object.entries(balances).filter(([, b]) => b > 0).map(([id, b]) => ({ id, b }));
  const debtors = Object.entries(balances).filter(([, b]) => b < 0).map(([id, b]) => ({ id, b: -b }));
  const transfers: Transfer[] = [];
  while (creditors.length && debtors.length) {
    creditors.sort((x, y) => y.b - x.b);
    debtors.sort((x, y) => y.b - x.b);
    const c = creditors[0], d = debtors[0];
    const paise = Math.min(c.b, d.b);
    transfers.push({ from: d.id, to: c.id, paise });
    c.b -= paise;
    d.b -= paise;
    if (c.b === 0) creditors.shift();
    if (d.b === 0) debtors.shift();
  }
  return transfers;
}
