import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Notice from "@/components/notice";
import { todayIn } from "@/lib/dates";
import { categoryNames } from "@/lib/categories";
import { getHouseholdContext } from "@/lib/household";
import { deleteExpense, saveExpense } from "../../actions";
import ExpenseForm from "../../expense-form";

export const metadata: Metadata = { title: "Edit expense" };

export default async function ExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const { supabase, user, active } = await getHouseholdContext();
  const categories = await categoryNames(supabase, active.household.id, "expense");
  const hid = active.household.id;

  const [{ data: expense }, { data: members }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, description, category, amount, paid_by, spent_on, splits:expense_splits(user_id, share)")
      .eq("id", id)
      .eq("household_id", hid)
      .maybeSingle(),
    supabase.from("household_members").select("user_id, display_name").eq("household_id", hid).order("created_at"),
  ]);
  if (!expense) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/money" className="-my-2 inline-block py-2 text-sm text-muted hover:text-foreground">← Money</Link>
      <h1 className="text-2xl font-semibold">{expense.description}</h1>
      <Notice error={error} />
      <section className="card">
        <ExpenseForm categories={categories}
          action={saveExpense}
          members={members ?? []}
          me={user.id}
          today={todayIn(active.household.timezone)}
          currency={active.household.currency}
          expense={expense}
        />
      </section>
      <form action={deleteExpense}>
        <input type="hidden" name="id" value={expense.id} />
        <button className="-my-2 py-2 text-sm text-danger hover:underline">Delete expense</button>
      </form>
    </div>
  );
}
