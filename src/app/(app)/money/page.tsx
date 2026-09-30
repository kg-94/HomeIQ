import type { Metadata } from "next";
import Link from "next/link";
import Notice from "@/components/notice";
import { todayIn } from "@/lib/dates";
import { categoryNames } from "@/lib/categories";
import { getHouseholdContext } from "@/lib/household";
import { formatMoney, fromPaise } from "@/lib/money";
import { saveExpense } from "./actions";
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
  const categories = await categoryNames(supabase, active.household.id, "expense");
  const hid = active.household.id;
  const { currency, timezone } = active.household;
  const today = todayIn(timezone);
  const fmt = (n: number) => formatMoney(n, currency);

  const [{ data: members }, { data: myBalance }, { data: expenses }] = await Promise.all([
    supabase.from("household_members").select("user_id, display_name").eq("household_id", hid).order("created_at"),
    supabase.from("member_balances").select("balance").eq("household_id", hid).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("expenses")
      .select("id, description, category, amount, paid_by, spent_on, bill_id")
      .eq("household_id", hid)
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const nameOf = (id: string | null) => (id && members?.find((m) => m.user_id === id)?.display_name) || "Former member";

  const mine = Math.round(Number(myBalance?.balance ?? 0) * 100);

  return (
    <div className="space-y-6">
      <MoneyTabs current="overview" />
      <Notice error={error} />

      <Link href="/money/splits" className="card flex items-center justify-between gap-3 hover:border-accent">
        <span className={`text-sm ${mine < 0 ? "text-danger" : ""}`}>
          {mine > 0 ? `You are owed ${fmt(fromPaise(mine))}` : mine < 0 ? `You owe ${fmt(fromPaise(-mine))}` : "You're all settled up"}
        </span>
        <span className="link shrink-0 text-sm">See splits &amp; settle →</span>
      </Link>

      <details className="card" open={expenses?.length === 0}>
        <summary className="cursor-pointer font-medium marker:text-muted">Add an expense</summary>
        <div className="mt-4">
          <ExpenseForm categories={categories} action={saveExpense} members={members ?? []} me={user.id} today={today} currency={currency} />
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

    </div>
  );
}
