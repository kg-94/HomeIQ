import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Notice from "@/components/notice";
import { todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { formatMoney } from "@/lib/money";
import { deleteSource, updateSource } from "../../actions";
import IncomeForm from "../../income-form";

export const metadata: Metadata = { title: "Recurring income" };

export default async function IncomeSourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const { supabase, user, active } = await getHouseholdContext();
  const hid = active.household.id;
  const { currency, timezone } = active.household;
  const [{ data: source }, { data: members }, { data: received }] = await Promise.all([
    supabase.from("income_sources").select("*").eq("id", id).eq("household_id", hid).maybeSingle(),
    supabase.from("household_members").select("user_id, display_name").eq("household_id", hid).order("created_at"),
    supabase
      .from("incomes")
      .select("id, amount, received_on")
      .eq("source_id", id)
      .order("received_on", { ascending: false })
      .limit(24),
  ]);
  if (!source) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/money/income" className="-my-2 inline-block py-2 text-sm text-muted hover:text-foreground">← Income</Link>
      <h1 className="text-2xl font-semibold">{source.name}</h1>
      <Notice error={error} />
      <section className="card">
        <IncomeForm
          action={updateSource}
          members={members ?? []}
          me={user.id}
          today={todayIn(timezone)}
          currency={currency}
          values={{ ...source, description: source.name, date: source.next_date }}
          repeat="required"
          submitLabel="Save"
        />
      </section>
      <section className="card">
        <h2 className="font-medium">Received</h2>
        {received?.length ? (
          <ul className="mt-3 divide-y divide-border text-sm">
            {received.map((r) => (
              <li key={r.id}>
                <Link href={`/money/income/${r.id}`} className="flex justify-between py-2 hover:underline">
                  <span>{new Date(`${r.received_on}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</span>
                  <span className="tabular-nums">{formatMoney(r.amount, currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Nothing received yet.</p>
        )}
      </section>
      <form action={deleteSource}>
        <input type="hidden" name="id" value={source.id} />
        <button className="-my-2 py-2 text-sm text-danger hover:underline">Stop tracking (past income stays)</button>
      </form>
    </div>
  );
}
