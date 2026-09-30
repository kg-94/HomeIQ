import type { Metadata } from "next";
import Link from "next/link";
import Notice from "@/components/notice";
import { TagChips, TagFilter } from "@/components/tags";
import { dueGroup, formatDue, repeatLabel, todayIn } from "@/lib/dates";
import { categoryNames } from "@/lib/categories";
import { getHouseholdContext } from "@/lib/household";
import { allTags } from "@/lib/tags";
import { formatMoney } from "@/lib/money";
import MoneyTabs from "../money-tabs";
import { addIncome, receiveIncome } from "./actions";
import IncomeForm from "./income-form";

export const metadata: Metadata = { title: "Income" };

const LockIcon = () => (
  <svg aria-label="Private" role="img" viewBox="0 0 24 24" className="inline size-3.5 align-[-2px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; error?: string }>;
}) {
  const { tag, error } = await searchParams;
  const { supabase, user, active } = await getHouseholdContext();
  const categories = await categoryNames(supabase, active.household.id, "income");
  const hid = active.household.id;
  const { currency, timezone } = active.household;
  const today = todayIn(timezone);
  const monthStart = `${today.slice(0, 7)}-01`;
  const fmt = (n: number) => formatMoney(n, currency);

  // RLS returns shared income plus only *my* private income, so totals are per viewer.
  const [{ data: members }, { data: sources }, { data: incomes }, { data: monthIncome }, { data: monthExpenses }] = await Promise.all([
    supabase.from("household_members").select("user_id, display_name").eq("household_id", hid).order("created_at"),
    supabase
      .from("income_sources")
      .select("id, name, amount, next_date, repeat_every, repeat_unit, received_by, is_private")
      .eq("household_id", hid)
      .order("next_date"),
    supabase
      .from("incomes")
      .select("id, description, category, amount, received_by, received_on, is_private, tags")
      .contains("tags", tag ? [tag] : [])
      .eq("household_id", hid)
      .order("received_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("incomes").select("amount").eq("household_id", hid).gte("received_on", monthStart),
    supabase.from("expenses").select("amount").eq("household_id", hid).gte("spent_on", monthStart),
  ]);
  const nameOf = (id: string) => members?.find((m) => m.user_id === id)?.display_name ?? "Former member";
  const sum = (rows: { amount: number }[] | null) => (rows ?? []).reduce((a, r) => a + Math.round(r.amount * 100), 0) / 100;
  const incomeTotal = sum(monthIncome);
  const expenseTotal = sum(monthExpenses);
  const net = incomeTotal - expenseTotal;
  const monthName = new Date(`${monthStart}T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", timeZone: "UTC" });

  const { data: tagRows } = await supabase.from("incomes").select("tags").eq("household_id", active.household.id);

  return (
    <div className="space-y-6">
      <MoneyTabs current="income" />
      <Notice error={error} />
      <TagFilter tags={allTags(tagRows)} current={tag} href={(t) => (t ? `/money/income?tag=${encodeURIComponent(t)}` : "/money/income")} />

      <section className="card">
        <h2 className="font-medium">{monthName} so far</h2>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-xs text-muted">Income</dt>
            <dd className="mt-1 font-medium tabular-nums">{fmt(incomeTotal)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Household spend</dt>
            <dd className="mt-1 font-medium tabular-nums">{fmt(expenseTotal)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Net</dt>
            <dd className={`mt-1 font-medium tabular-nums ${net < 0 ? "text-danger" : "text-accent"}`}>{fmt(net)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">Income you can see (shared, plus your private income) minus all household expenses this month.</p>
      </section>

      {sources && sources.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Recurring</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {sources.map((s) => {
              const due = dueGroup(s.next_date, today) !== "later";
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Link href={`/money/income/sources/${s.id}`} className="min-w-0 flex-1">
                    <span className="block truncate">
                      {s.name} {s.is_private && <LockIcon />}
                    </span>
                    <span className="block text-xs text-muted">
                      {[nameOf(s.received_by), repeatLabel(s.repeat_every, s.repeat_unit)].join(" · ")}
                    </span>
                  </Link>
                  <span className={`text-sm ${due ? "text-foreground" : "text-muted"}`}>{formatDue(s.next_date, today)}</span>
                  <form action={receiveIncome} className="flex w-full items-center gap-2 sm:w-auto">
                    <input type="hidden" name="source" value={s.id} />
                    <label className="sr-only" htmlFor={`amount-${s.id}`}>Amount received</label>
                    <input id={`amount-${s.id}`} name="amount" inputMode="decimal" defaultValue={s.amount.toFixed(2)} className="input min-w-0 flex-1 py-1 text-right tabular-nums sm:w-32 sm:flex-none" />
                    <button className="btn-ghost shrink-0">Received</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <details className="card" open={!sources?.length && !incomes?.length}>
        <summary className="cursor-pointer font-medium marker:text-muted">Add income</summary>
        <div className="mt-4">
          <IncomeForm categories={categories} action={addIncome} members={members ?? []} me={user.id} today={today} currency={currency} repeat="optional" submitLabel="Add income" />
        </div>
      </details>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Recent income</h2>
        {incomes?.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {incomes.map((i) => (
              <li key={i.id}>
                <Link href={`/money/income/${i.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.03]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      {i.description} {i.is_private && <LockIcon />}
                    </span>
                    <span className="block text-xs text-muted">
                      {[nameOf(i.received_by), i.category, new Date(`${i.received_on}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <TagChips tags={i.tags} className="mt-1" />
                  </span>
                  <span className="shrink-0 tabular-nums text-accent">+{fmt(i.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No income logged yet.</p>
        )}
      </section>
    </div>
  );
}
