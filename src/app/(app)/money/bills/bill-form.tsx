import CategorySelect from "@/components/category-select";

type Bill = {
  id: string;
  name: string;
  payee: string | null;
  category: string | null;
  amount: number;
  due_date: string;
  repeat_every: number | null;
  repeat_unit: string | null;
  autopay: boolean;
  notes: string | null;
};

export default function BillForm({
  action,
  today,
  currency,
  categories,
  bill,
}: {
  action: (formData: FormData) => Promise<void>;
  today: string;
  currency: string;
  categories: string[];
  bill?: Bill;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {bill && <input type="hidden" name="id" value={bill.id} />}
      <div>
        <label htmlFor="name" className="label">Bill</label>
        <input id="name" name="name" defaultValue={bill?.name} placeholder="e.g. Electricity" required maxLength={120} className="input" />
      </div>
      <div>
        <label htmlFor="payee" className="label">Payee</label>
        <input id="payee" name="payee" defaultValue={bill?.payee ?? ""} placeholder="e.g. BESCOM" maxLength={120} className="input" />
      </div>
      <div>
        <label htmlFor="amount" className="label">Usual amount ({currency})</label>
        <input id="amount" name="amount" inputMode="decimal" defaultValue={bill?.amount.toFixed(2)} placeholder="0.00" required className="input" />
      </div>
      <div>
        <label htmlFor="due_date" className="label">Next due</label>
        <input id="due_date" name="due_date" type="date" defaultValue={bill?.due_date ?? today} required className="input" />
      </div>
      <CategorySelect options={categories} defaultValue={bill?.category} />
      <fieldset>
        <legend className="label">Repeat every</legend>
        <div className="flex gap-2">
          <input name="repeat_every" type="number" min={0} max={999} defaultValue={bill ? (bill.repeat_every ?? "") : 1} placeholder="—" aria-label="Repeat interval" className="input w-20" />
          <select name="repeat_unit" defaultValue={bill?.repeat_unit ?? "month"} aria-label="Repeat unit" className="input">
            <option value="day">day(s)</option>
            <option value="week">week(s)</option>
            <option value="month">month(s)</option>
            <option value="year">year(s)</option>
          </select>
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="autopay" defaultChecked={bill?.autopay} /> Paid automatically (autopay / standing instruction)
      </label>
      <div className="sm:col-span-2">
        <label htmlFor="notes" className="label">Notes</label>
        <textarea id="notes" name="notes" defaultValue={bill?.notes ?? ""} rows={2} maxLength={2000} placeholder="Consumer number, login hint…" className="input" />
      </div>
      <div className="sm:col-span-2">
        <button className="btn">{bill ? "Save" : "Add bill"}</button>
      </div>
    </form>
  );
}
