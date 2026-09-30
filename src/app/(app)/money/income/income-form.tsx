import CategorySelect from "@/components/category-select";
import { TagInput } from "@/components/tags";

type Member = { user_id: string; display_name: string };
type Values = {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  received_by: string;
  date: string;
  is_private: boolean;
  tags?: string[];
  repeat_every?: number | null;
  repeat_unit?: string | null;
};

/**
 * `repeat`: "optional" on the add form (blank = one-off), "required" when
 * editing a recurring source, absent when editing a logged entry.
 */
export default function IncomeForm({
  action,
  members,
  me,
  today,
  currency,
  categories,
  values,
  repeat,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  members: Member[];
  categories: string[];
  me: string;
  today: string;
  currency: string;
  values?: Values;
  repeat?: "optional" | "required";
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {values && <input type="hidden" name="id" value={values.id} />}
      <div className="sm:col-span-2">
        <label htmlFor="description" className="label">Description</label>
        <input id="description" name="description" defaultValue={values?.description} placeholder="e.g. Salary, Rent from tenant" required maxLength={120} className="input" />
      </div>
      <div>
        <label htmlFor="amount" className="label">Amount ({currency})</label>
        <input id="amount" name="amount" inputMode="decimal" defaultValue={values?.amount.toFixed(2)} placeholder="0.00" required className="input" />
      </div>
      <div>
        <label htmlFor="received_by" className="label">Received by</label>
        <select id="received_by" name="received_by" defaultValue={values?.received_by ?? me} className="input">
          {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="date" className="label">{repeat ? "Next expected on" : "Received on"}</label>
        <input id="date" name="date" type="date" defaultValue={values?.date ?? today} required className="input" />
      </div>
      <CategorySelect options={categories} defaultValue={values?.category} />
      {repeat && (
        <fieldset className="sm:col-span-2">
          <legend className="label">Repeat every</legend>
          <div className="flex gap-2">
            <input
              name="repeat_every"
              type="number"
              min={repeat === "required" ? 1 : 0}
              max={999}
              required={repeat === "required"}
              defaultValue={values?.repeat_every ?? ""}
              placeholder="—"
              aria-label="Repeat interval"
              className="input w-24"
            />
            <select name="repeat_unit" defaultValue={values?.repeat_unit ?? "month"} aria-label="Repeat unit" className="input w-36">
              <option value="day">day(s)</option>
              <option value="week">week(s)</option>
              <option value="month">month(s)</option>
              <option value="year">year(s)</option>
            </select>
          </div>
          {repeat === "optional" && (
            <p className="mt-1 text-xs text-muted">
              Leave blank to log it now. Set it (e.g. 1 month) for salary or rent, then tap Received each time it arrives.
            </p>
          )}
        </fieldset>
      )}
      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="is_private" defaultChecked={values?.is_private} className="mt-1" />
        <span>
          Only visible to me
          <span className="block text-xs text-muted">Hidden from other members and their totals. Only for income you received.</span>
        </span>
      </label>
      <div className="sm:col-span-2">
        <TagInput defaultValue={values?.tags} />
      </div>
      <div className="sm:col-span-2">
        <button className="btn">{submitLabel}</button>
      </div>
    </form>
  );
}
