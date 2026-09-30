import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Notice from "@/components/notice";
import { todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { formatMoney } from "@/lib/money";
import { deleteBill, saveBill } from "../../actions";
import BillForm from "../bill-form";

export const metadata: Metadata = { title: "Edit bill" };

export default async function BillPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const { supabase, active } = await getHouseholdContext();
  const hid = active.household.id;
  const { currency, timezone } = active.household;

  const [{ data: bill }, { data: payments }] = await Promise.all([
    supabase.from("bills").select("*").eq("id", id).eq("household_id", hid).maybeSingle(),
    supabase
      .from("expenses")
      .select("id, amount, spent_on")
      .eq("bill_id", id)
      .order("spent_on", { ascending: false })
      .limit(24),
  ]);
  if (!bill) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/money/bills" className="-my-2 inline-block py-2 text-sm text-muted hover:text-foreground">← Bills</Link>
      <h1 className="text-2xl font-semibold">{bill.name}</h1>
      <Notice error={error} />
      {bill.paid_at && <Notice message={`Paid on ${new Date(bill.paid_at).toLocaleDateString("en-IN", { timeZone: timezone })}.`} />}

      <section className="card">
        <BillForm action={saveBill} today={todayIn(timezone)} currency={currency} bill={bill} />
      </section>

      <section className="card">
        <h2 className="font-medium">Payments</h2>
        {payments?.length ? (
          <ul className="mt-3 divide-y divide-border text-sm">
            {payments.map((p) => (
              <li key={p.id}>
                <Link href={`/money/expenses/${p.id}`} className="flex justify-between py-2 hover:underline">
                  <span>{new Date(`${p.spent_on}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</span>
                  <span className="tabular-nums">{formatMoney(p.amount, currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No payments recorded yet.</p>
        )}
      </section>

      <form action={deleteBill}>
        <input type="hidden" name="id" value={bill.id} />
        <button className="-my-2 py-2 text-sm text-danger hover:underline">Delete bill (past payments stay in expenses)</button>
      </form>
    </div>
  );
}
