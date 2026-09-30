import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Notice from "@/components/notice";
import { todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { deleteIncome, updateIncome } from "../actions";
import IncomeForm from "../income-form";

export const metadata: Metadata = { title: "Edit income" };

export default async function IncomeEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const { supabase, user, active } = await getHouseholdContext();
  const hid = active.household.id;
  const [{ data: income }, { data: members }] = await Promise.all([
    supabase
      .from("incomes")
      .select("id, description, category, amount, received_by, received_on, is_private")
      .eq("id", id)
      .eq("household_id", hid)
      .maybeSingle(),
    supabase.from("household_members").select("user_id, display_name").eq("household_id", hid).order("created_at"),
  ]);
  if (!income) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/money/income" className="-my-2 inline-block py-2 text-sm text-muted hover:text-foreground">← Income</Link>
      <h1 className="text-2xl font-semibold">{income.description}</h1>
      <Notice error={error} />
      <section className="card">
        <IncomeForm
          action={updateIncome}
          members={members ?? []}
          me={user.id}
          today={todayIn(active.household.timezone)}
          currency={active.household.currency}
          values={{ ...income, date: income.received_on }}
          submitLabel="Save"
        />
      </section>
      <form action={deleteIncome}>
        <input type="hidden" name="id" value={income.id} />
        <button className="-my-2 py-2 text-sm text-danger hover:underline">Delete income</button>
      </form>
    </div>
  );
}
