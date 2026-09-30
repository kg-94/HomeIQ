import type { Metadata } from "next";
import Notice from "@/components/notice";
import { getHouseholdContext } from "@/lib/household";
import MoneyTabs from "../money-tabs";
import { addCategory, deleteCategory, renameCategory } from "./actions";

export const metadata: Metadata = { title: "Categories" };

const KINDS = [
  { kind: "expense", title: "Expense categories", hint: "Used by expenses and bills." },
  { kind: "income", title: "Income categories", hint: "Used by income and recurring income." },
] as const;

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const { supabase, active } = await getHouseholdContext();
  const hid = active.household.id;

  const [{ data: categories }, { data: expenses }, { data: bills }, { data: incomes }, { data: sources }] = await Promise.all([
    supabase.from("categories").select("id, kind, name").eq("household_id", hid).order("name"),
    supabase.from("expenses").select("category").eq("household_id", hid).not("category", "is", null),
    supabase.from("bills").select("category").eq("household_id", hid).not("category", "is", null),
    supabase.from("incomes").select("category").eq("household_id", hid).not("category", "is", null),
    supabase.from("income_sources").select("category").eq("household_id", hid).not("category", "is", null),
  ]);
  // Usage counts (income counts only include income you can see).
  const uses = new Map<string, number>();
  const count = (kind: string, rows: { category: string | null }[] | null) =>
    rows?.forEach((r) => uses.set(`${kind}:${r.category!.toLowerCase()}`, (uses.get(`${kind}:${r.category!.toLowerCase()}`) ?? 0) + 1));
  count("expense", expenses); count("expense", bills); count("income", incomes); count("income", sources);

  return (
    <div className="space-y-6">
      <MoneyTabs current="categories" />
      <Notice error={error} message={message} />

      {KINDS.map(({ kind, title, hint }) => {
        const list = categories?.filter((c) => c.kind === kind) ?? [];
        return (
          <section key={kind} className="card">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-1 text-sm text-muted">{hint} Renaming updates every entry that uses it.</p>

            <ul className="mt-4 divide-y divide-border">
              {list.map((c) => {
                const n = uses.get(`${kind}:${c.name.toLowerCase()}`) ?? 0;
                return (
                  <li key={c.id} className="py-3">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                        <span className="min-w-0 truncate">{c.name}</span>
                        <span className="flex shrink-0 items-center gap-3 text-xs text-muted">
                          {n > 0 ? `${n} ${n === 1 ? "entry" : "entries"}` : "unused"}
                          <span className="link group-open:hidden">Edit</span>
                          <span className="link hidden group-open:inline">Close</span>
                        </span>
                      </summary>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <form action={renameCategory} className="flex gap-2">
                          <input type="hidden" name="id" value={c.id} />
                          <label htmlFor={`rename-${c.id}`} className="sr-only">New name for {c.name}</label>
                          <input id={`rename-${c.id}`} name="name" defaultValue={c.name} required maxLength={60} className="input" />
                          <button className="btn-ghost shrink-0">Rename</button>
                        </form>
                        <form action={deleteCategory} className="flex gap-2">
                          <input type="hidden" name="id" value={c.id} />
                          <label htmlFor={`move-${c.id}`} className="sr-only">Move its entries to</label>
                          <select id={`move-${c.id}`} name="move_to" defaultValue="" className="input min-w-0">
                            <option value="">{n > 0 ? "Leave entries uncategorised" : "—"}</option>
                            {list.filter((o) => o.id !== c.id).map((o) => (
                              <option key={o.id} value={o.id}>Move entries to {o.name}</option>
                            ))}
                          </select>
                          <button className="btn-ghost shrink-0 text-danger">Delete</button>
                        </form>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>

            <form action={addCategory} className="mt-3 flex gap-2">
              <input type="hidden" name="kind" value={kind} />
              <label htmlFor={`add-${kind}`} className="sr-only">New {kind} category</label>
              <input id={`add-${kind}`} name="name" placeholder={kind === "expense" ? "e.g. Pets" : "e.g. Bonus"} required maxLength={60} className="input" />
              <button className="btn shrink-0">Add</button>
            </form>
          </section>
        );
      })}
    </div>
  );
}
