import type { Metadata } from "next";
import Link from "next/link";
import Notice from "@/components/notice";
import { dueGroup, formatDue, repeatLabel, todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { payBill, saveBill } from "../actions";
import MoneyTabs from "../money-tabs";
import BillForm from "./bill-form";

export const metadata: Metadata = { title: "Bills" };

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, user, active } = await getHouseholdContext();
  const hid = active.household.id;
  const { currency, timezone } = active.household;
  const today = todayIn(timezone);

  const [{ data: bills }, { data: members }] = await Promise.all([
    supabase
      .from("bills")
      .select("id, name, payee, amount, due_date, repeat_every, repeat_unit, autopay")
      .eq("household_id", hid)
      .is("paid_at", null)
      .order("due_date"),
    supabase.from("household_members").select("user_id, display_name").eq("household_id", hid).order("created_at"),
  ]);

  return (
    <div className="space-y-6">
      <MoneyTabs current="bills" />
      <Notice error={error} />

      <details className="card" open={bills?.length === 0}>
        <summary className="cursor-pointer font-medium marker:text-muted">Add a bill</summary>
        <div className="mt-4">
          <BillForm action={saveBill} today={today} currency={currency} />
        </div>
      </details>

      {bills?.length ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {bills.map((b) => {
            const overdue = dueGroup(b.due_date, today) === "overdue";
            return (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Link href={`/money/bills/${b.id}`} className="min-w-0 flex-1">
                  <span className="block truncate">{b.name}</span>
                  <span className="block text-xs text-muted">
                    {[b.payee, repeatLabel(b.repeat_every, b.repeat_unit), b.autopay && "Autopay"].filter(Boolean).join(" · ")}
                  </span>
                </Link>
                <span className={`text-sm ${overdue ? "text-danger" : "text-muted"}`}>{formatDue(b.due_date, today)}</span>
                <form action={payBill} className="flex w-full items-center gap-2 sm:w-auto">
                  <input type="hidden" name="bill" value={b.id} />
                  <label className="sr-only" htmlFor={`amount-${b.id}`}>Amount paid</label>
                  <input id={`amount-${b.id}`} name="amount" inputMode="decimal" defaultValue={b.amount.toFixed(2)} className="input w-28 shrink-0 py-1 text-right tabular-nums" />
                  <label className="sr-only" htmlFor={`paid_by-${b.id}`}>Paid by</label>
                  <select id={`paid_by-${b.id}`} name="paid_by" defaultValue={user.id} className="input min-w-0 flex-1 py-1 sm:w-auto sm:flex-none">
                    {members?.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
                  </select>
                  <button className="btn-ghost">Paid</button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">Add rent, electricity, internet and other regular bills to see what&apos;s due.</p>
      )}
      <p className="text-xs text-muted">
        Marking a bill paid adds it to expenses, split equally between everyone. You can change the split there.
      </p>
    </div>
  );
}
