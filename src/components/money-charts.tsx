import { niceScale } from "@/lib/chart";
import { formatMoney } from "@/lib/money";

type Month = { key: string; label: string; income: number; spend: number };

// Home page is a glance: whole rupees. Exact values live in tooltips, the table and /money.
const whole = (n: number, currency: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

const compact = (n: number, currency: string) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", style: "currency", currency, maximumFractionDigits: 1 }).format(n);

function Legend() {
  return (
    <ul className="flex gap-4 text-xs text-muted">
      <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-income" />Income</li>
      <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-spend" />Spending</li>
    </ul>
  );
}

/**
 * Paired columns per month (HTML, so text stays crisp at phone widths).
 * Hover/tap a month for exact values; the table under "Show as table" has them all.
 */
export function IncomeSpendChart({ months, currency }: { months: Month[]; currency: string }) {
  const { max, ticks } = niceScale(Math.max(...months.flatMap((m) => [m.income, m.spend])));
  const pct = (v: number) => `${(v / max) * 100}%`;
  const fmt = (n: number) => formatMoney(n, currency);

  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <figcaption className="font-medium">Income vs spending</figcaption>
        <Legend />
      </div>
      <div className="flex gap-2">
        {/* y-axis labels */}
        <div className="relative h-44 w-12 shrink-0 text-right text-[11px] tabular-nums text-muted" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: pct(t) }}>
              {compact(t, currency)}
            </span>
          ))}
        </div>
        <div className="relative h-44 flex-1">
          {/* hairline grid; the baseline is one step stronger */}
          {ticks.map((t) => (
            <div key={t} className={`absolute inset-x-0 h-px ${t === 0 ? "bg-muted/40" : "bg-border"}`} style={{ bottom: pct(t) }} aria-hidden />
          ))}
          <ol className="relative grid h-full" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
            {months.map((m) => (
              <li
                key={m.key}
                // the whole column is the hover target, wider than the bars
                title={`${m.label}: income ${fmt(m.income)} · spending ${fmt(m.spend)}`}
                aria-label={`${m.label}: income ${fmt(m.income)}, spending ${fmt(m.spend)}`}
                className="group flex h-full items-end justify-center gap-[2px] rounded-t hover:bg-foreground/[0.03]"
              >
                {(["income", "spend"] as const).map((s) => (
                  <span
                    key={s}
                    className={`w-[min(24px,40%)] rounded-t ${s === "income" ? "bg-income" : "bg-spend"}`}
                    style={{ height: m[s] > 0 ? `max(2px, ${pct(m[s])})` : 0 }}
                  />
                ))}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <ol className="mt-1.5 ml-14 grid text-center text-[11px] text-muted" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }} aria-hidden>
        {months.map((m) => <li key={m.key}>{m.label}</li>)}
      </ol>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-muted">Show as table</summary>
        <table className="mt-2 w-full text-right tabular-nums">
          <thead className="text-xs text-muted">
            <tr><th className="text-left font-normal">Month</th><th className="font-normal">Income</th><th className="font-normal">Spending</th><th className="font-normal">Net</th></tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key} className="border-t border-border">
                <td className="py-1 text-left">{m.label}</td>
                <td>{fmt(m.income)}</td>
                <td>{fmt(m.spend)}</td>
                <td className={m.income - m.spend < 0 ? "text-danger" : ""}>{fmt(m.income - m.spend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** This month's spending by category: one series, sorted, value at each bar's tip. */
export function CategoryBars({ rows, currency }: { rows: { name: string; amount: number }[]; currency: string }) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <figure>
      <figcaption className="mb-3 font-medium">Spending by category</figcaption>
      {rows.length ? (
        <ul className="space-y-2.5 text-sm">
          {rows.map((r) => (
            <li key={r.name} className="grid grid-cols-[minmax(0,7rem)_1fr] items-center gap-3">
              <span className="truncate text-muted">{r.name}</span>
              <span className="flex items-center gap-2">
                <span className="h-3 rounded-r bg-spend" style={{ width: `max(2px, ${(r.amount / max) * 75}%)` }} />
                <span className="shrink-0 tabular-nums" title={formatMoney(r.amount, currency)}>{whole(r.amount, currency)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No spending recorded this month.</p>
      )}
    </figure>
  );
}

/** Stat tiles: label, value; net carries direction in text, not colour alone. */
export function MonthTiles({ income, spend, currency }: { income: number; spend: number; currency: string }) {
  const net = income - spend;
  const tiles = [
    { label: "Income", value: whole(income, currency), swatch: "bg-income" },
    { label: "Spending", value: whole(spend, currency), swatch: "bg-spend" },
    { label: net < 0 ? "Overspent" : "Saved", value: whole(Math.abs(net), currency), swatch: "" },
  ];
  return (
    <dl className="grid grid-cols-3 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="card p-3 sm:p-4">
          <dt className="flex items-center gap-1.5 text-xs text-muted">
            {t.swatch && <span className={`size-2 rounded-full ${t.swatch}`} />}
            {t.label}
          </dt>
          <dd className={`mt-1 truncate text-[15px] font-semibold sm:text-lg ${t.label === "Overspent" ? "text-danger" : ""}`}>{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}
