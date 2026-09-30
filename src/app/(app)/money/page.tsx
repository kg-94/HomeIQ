import type { Metadata } from "next";
import Link from "next/link";
import Notice from "@/components/notice";
import { todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { formatMoney, fromPaise, settleUp } from "@/lib/money";
import { deleteSettlement, recordSettlement, saveExpense } from "./actions";
import ExpenseForm from "./expense-form";
import MoneyTabs from "./money-tabs";

export const metadata: Metadata = { title: "Money" };

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, user, active } = await getHouseholdContext();
  const hid = active.household.id;
  const { currency, timezone } = active.household;
  const today = todayIn(timezone);
  const fmt = (n: number) => formatMoney(n, currency);

  const [{ data: members }, { data: balances }, { data: expenses }, { data: settlements }] = await Promise.all([
    supabase.from("household_members").select("user_id, display_name").eq("household_id", hid).order("created_at"),
    supabase.from("member_balances").select("user_id, balance").eq("household_id", hid),
    supabase
      .from("expenses")
      .select("id, description, category, amount, paid_by, spent_on, bill_id")
      .eq("household_id", hid)
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("settlements")
      .select("id, from_user, to_user, amount, settled_on")
      .eq("household_id", hid)
      .order("settled_on", { ascending: false })
      .limit(10),
  ]);
  const nameOf = (id: string | null) => (id && members?.find((m) => m.user_id === id)?.display_name) || "Former member";

  const paise = Object.fromEntries((balances ?? []).map((b) => [b.user_id!, Math.round(Number(b.balance) * 100)]));
  const transfers = settleUp(paise);
  const mine = paise[user.id] ?? 0;

  return (
    <div className="space-y-6">
      <MoneyTabs current="overview" />
      <Notice error={error} />

      <section className="card">
        <h2 className="font-medium">Balances</h2>
        <p className={`mt-1 text-sm ${mine < 0 ? "text-danger" : "text-muted"}`}>
          {mine > 0 ? `You are owed ${fmt(fromPaise(mine))}.` : mine < 0 ? `You owe ${fmt(fromPaise(-mine))}.` : "You're all settled up."}
        </p>
        {transfers.length > 0 && (
          <ul className="mt-3 divide-y divide-border text-sm">
            {transfers.map((t) => (
              <li key={`${t.from}-${t.to}`} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span>
                  <strong className="font-medium">{nameOf(t.from)}</strong> pays <strong className="font-medium">{nameOf(t.to)}</strong>{" "}
                  {fmt(fromPaise(t.paise))}
                </span>
                <form action={recordSettlement}>
                  <input type="hidden" name="from_user" value={t.from} />
                  <input type="hidden" name="to_user" value={t.to} />
                  <input type="hidden" name="amount" value={fromPaise(t.paise).toFixed(2)} />
                  <input type="hidden" name="settled_on" value={today} />
                  <button className="btn-ghost">Mark paid</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="card" open={expenses?.length === 0}>
        <summary className="cursor-pointer font-medium marker:text-muted">Add an expense</summary>
        <div className="mt-4">
          <ExpenseForm action={saveExpense} members={members ?? []} me={user.id} today={today} currency={currency} />
        </div>
      </details>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Recent expenses</h2>
        {expenses?.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {expenses.map((e) => (
              <li key={e.id}>
                <Link href={`/money/expenses/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.03]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{e.description}</span>
                    <span className="block text-xs text-muted">
                      {[nameOf(e.paid_by) + " paid", e.category, e.bill_id && "Bill", new Date(`${e.spent_on}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{fmt(e.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No expenses yet.</p>
        )}
      </section>

      {settlements && settlements.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Recent settle-ups</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
            {settlements.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2">
                <span className="flex-1">
                  {nameOf(s.from_user)} paid {nameOf(s.to_user)}
                  <span className="text-muted"> · {new Date(`${s.settled_on}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
                </span>
                <span className="tabular-nums">{fmt(s.amount)}</span>
                <form action={deleteSettlement}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="text-xs text-danger hover:underline">Undo</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
