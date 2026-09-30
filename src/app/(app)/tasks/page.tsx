import type { Metadata } from "next";
import Link from "next/link";
import Notice from "@/components/notice";
import { dueGroup, formatDue, repeatLabel, todayIn, type DueGroup } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { completeTask, createTask } from "./actions";
import TaskForm from "./task-form";

export const metadata: Metadata = { title: "Tasks" };

const GROUPS: { key: DueGroup; title: string }[] = [
  { key: "overdue", title: "Overdue" },
  { key: "week", title: "Next 7 days" },
  { key: "later", title: "Later" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mine?: string }>;
}) {
  const { error, mine } = await searchParams;
  const { supabase, user, active } = await getHouseholdContext();
  const hid = active.household.id;
  const today = todayIn(active.household.timezone);

  let query = supabase
    .from("tasks")
    .select("id, title, due_date, repeat_every, repeat_unit, assignee_id")
    .eq("household_id", hid)
    .is("completed_at", null)
    .order("due_date");
  if (mine) query = query.eq("assignee_id", user.id);

  const [{ data: tasks }, { data: members }] = await Promise.all([
    query,
    supabase.from("household_members").select("user_id, display_name").eq("household_id", hid).order("created_at"),
  ]);
  const nameOf = new Map(members?.map((m) => [m.user_id, m.display_name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <nav className="flex gap-1 rounded-md border border-border bg-surface p-1 text-sm">
          <Link href="/tasks" className={`rounded px-3 py-1 ${!mine ? "bg-foreground/10 font-medium" : "text-muted"}`}>Everyone</Link>
          <Link href="/tasks?mine=1" className={`rounded px-3 py-1 ${mine ? "bg-foreground/10 font-medium" : "text-muted"}`}>Mine</Link>
        </nav>
      </div>
      <Notice error={error} />

      <details className="card group" open={tasks?.length === 0}>
        <summary className="cursor-pointer font-medium marker:text-muted">Add a task</summary>
        <div className="mt-4">
          <TaskForm action={createTask} members={members ?? []} today={today} submitLabel="Add task" />
        </div>
      </details>

      {tasks?.length === 0 && (
        <p className="text-sm text-muted">{mine ? "Nothing assigned to you." : "No open tasks. Nice."}</p>
      )}

      {GROUPS.map(({ key, title }) => {
        const group = tasks?.filter((t) => dueGroup(t.due_date, today) === key) ?? [];
        if (group.length === 0) return null;
        return (
          <section key={key}>
            <h2 className={`mb-2 text-sm font-medium ${key === "overdue" ? "text-danger" : "text-muted"}`}>
              {title} · {group.length}
            </h2>
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {group.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <form action={completeTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      aria-label={`Mark "${t.title}" done`}
                      title="Mark done"
                      className="flex size-5 items-center justify-center rounded-full border-2 border-border hover:border-accent hover:bg-accent/10"
                    />
                  </form>
                  <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1">
                    <span className="block truncate">{t.title}</span>
                    <span className="block text-xs text-muted">
                      {[repeatLabel(t.repeat_every, t.repeat_unit), t.assignee_id && nameOf.get(t.assignee_id)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </Link>
                  <span className={`shrink-0 text-sm ${key === "overdue" ? "text-danger" : "text-muted"}`}>
                    {formatDue(t.due_date, today)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
