type Member = { user_id: string; display_name: string };
type Expense = {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  paid_by: string;
  spent_on: string;
  splits: { user_id: string; share: number }[];
};

export const CATEGORIES = ["Rent", "Electricity", "Water", "Gas", "Internet", "Groceries", "Maintenance", "Household help", "Other"];

/**
 * Works without JS: both split modes are rendered; the radio picks which
 * inputs the server reads (`in_<id>` checkboxes or `share_<id>` amounts).
 */
export default function ExpenseForm({
  action,
  members,
  me,
  today,
  currency,
  expense,
}: {
  action: (formData: FormData) => Promise<void>;
  members: Member[];
  me: string;
  today: string;
  currency: string;
  expense?: Expense;
}) {
  const shareOf = new Map(expense?.splits.map((s) => [s.user_id, s.share]));
  const shares = expense?.splits.map((s) => s.share) ?? [];
  const isEqual = !expense || Math.max(...shares) - Math.min(...shares) <= 0.01;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <div className="sm:col-span-2">
        <label htmlFor="description" className="label">Description</label>
        <input id="description" name="description" defaultValue={expense?.description} placeholder="e.g. Groceries at DMart" required maxLength={120} className="input" />
      </div>
      <div>
        <label htmlFor="amount" className="label">Amount ({currency})</label>
        <input id="amount" name="amount" inputMode="decimal" defaultValue={expense?.amount.toFixed(2)} placeholder="0.00" required className="input" />
      </div>
      <div>
        <label htmlFor="paid_by" className="label">Paid by</label>
        <select id="paid_by" name="paid_by" defaultValue={expense?.paid_by ?? me} className="input">
          {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="spent_on" className="label">Date</label>
        <input id="spent_on" name="spent_on" type="date" defaultValue={expense?.spent_on ?? today} required className="input" />
      </div>
      <div>
        <label htmlFor="category" className="label">Category</label>
        <input id="category" name="category" list="expense-categories" defaultValue={expense?.category ?? ""} maxLength={60} className="input" />
        <datalist id="expense-categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
      </div>

      <fieldset className="sm:col-span-2">
        <legend className="label">Split</legend>
        <div className="mb-3 flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="split" value="equal" defaultChecked={isEqual} /> Equally between
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="split" value="exact" defaultChecked={!isEqual} /> Exact amounts
          </label>
        </div>
        <ul className="divide-y divide-border rounded-md border border-border">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <label className="flex flex-1 items-center gap-2">
                <input type="checkbox" name={`in_${m.user_id}`} defaultChecked={!expense || shareOf.has(m.user_id)} />
                {m.display_name}
              </label>
              <label className="sr-only" htmlFor={`share_${m.user_id}`}>Exact share for {m.display_name}</label>
              <input
                id={`share_${m.user_id}`}
                name={`share_${m.user_id}`}
                inputMode="decimal"
                placeholder="exact"
                defaultValue={isEqual ? "" : shareOf.get(m.user_id)?.toFixed(2)}
                className="input w-28 py-1 text-right"
              />
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-muted">Ticks are used for equal splits; amounts for exact splits (they must add up).</p>
      </fieldset>

      <div className="sm:col-span-2">
        <button className="btn">{expense ? "Save" : "Add expense"}</button>
      </div>
    </form>
  );
}
