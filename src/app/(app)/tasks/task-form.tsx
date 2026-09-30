import { TagInput } from "@/components/tags";
type Member = { user_id: string; display_name: string };
type Item = { id: string; name: string };
type Task = {
  id: string;
  title: string;
  notes: string | null;
  tags?: string[];
  due_date: string;
  assignee_id: string | null;
  item_id: string | null;
  repeat_every: number | null;
  repeat_unit: string | null;
};

export default function TaskForm({
  action,
  members,
  items,
  defaultItemId,
  today,
  task,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  members: Member[];
  items: Item[];
  defaultItemId?: string;
  today: string;
  task?: Task;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {task && <input type="hidden" name="id" value={task.id} />}
      <div className="sm:col-span-2">
        <label htmlFor="title" className="label">Task</label>
        <input id="title" name="title" defaultValue={task?.title} placeholder="e.g. Clean AC filter" required maxLength={120} className="input" />
      </div>
      <div>
        <label htmlFor="due_date" className="label">Due</label>
        <input id="due_date" name="due_date" type="date" defaultValue={task?.due_date ?? today} required className="input" />
      </div>
      <div>
        <label htmlFor="assignee_id" className="label">Assigned to</label>
        <select id="assignee_id" name="assignee_id" defaultValue={task?.assignee_id ?? ""} className="input">
          <option value="">Anyone</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
          ))}
        </select>
      </div>
      {items.length > 0 && (
        <div className="sm:col-span-2">
          <label htmlFor="item_id" className="label">For item</label>
          <select id="item_id" name="item_id" defaultValue={task?.item_id ?? defaultItemId ?? ""} className="input">
            <option value="">—</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
      )}
      <fieldset className="sm:col-span-2">
        <legend className="label">Repeat every</legend>
        <div className="flex gap-2">
          <input
            name="repeat_every"
            type="number"
            min={0}
            max={999}
            defaultValue={task?.repeat_every ?? ""}
            placeholder="—"
            aria-label="Repeat interval"
            className="input w-24"
          />
          <select name="repeat_unit" defaultValue={task?.repeat_unit ?? "month"} aria-label="Repeat unit" className="input w-36">
            <option value="day">day(s)</option>
            <option value="week">week(s)</option>
            <option value="month">month(s)</option>
            <option value="year">year(s)</option>
          </select>
        </div>
        <p className="mt-1 text-xs text-muted">Leave blank for a one-off task.</p>
      </fieldset>
      <div className="sm:col-span-2">
        <label htmlFor="notes" className="label">Notes</label>
        <textarea id="notes" name="notes" defaultValue={task?.notes ?? ""} rows={2} maxLength={2000} className="input" />
      </div>
      <div className="sm:col-span-2">
        <TagInput defaultValue={task?.tags} />
      </div>
      <div className="sm:col-span-2">
        <button className="btn">{submitLabel}</button>
      </div>
    </form>
  );
}
