import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Notice from "@/components/notice";
import { todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { deleteTask, updateTask } from "../actions";
import TaskForm from "../task-form";

export const metadata: Metadata = { title: "Edit task" };

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const { supabase, active } = await getHouseholdContext();
  const hid = active.household.id;

  const [{ data: task }, { data: members }, { data: history }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, notes, due_date, assignee_id, repeat_every, repeat_unit, completed_at")
      .eq("id", id)
      .eq("household_id", hid)
      .maybeSingle(),
    supabase.from("household_members").select("user_id, display_name").eq("household_id", hid).order("created_at"),
    supabase
      .from("task_completions")
      .select("id, due_date, completed_at, completed_by")
      .eq("task_id", id)
      .order("completed_at", { ascending: false })
      .limit(20),
  ]);
  if (!task) notFound();
  const nameOf = new Map(members?.map((m) => [m.user_id, m.display_name]));

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/tasks" className="text-sm text-muted hover:text-foreground">← Tasks</Link>
      <h1 className="text-2xl font-semibold">{task.title}</h1>
      <Notice error={error} />
      {task.completed_at && (
        <Notice message={`Done on ${new Date(task.completed_at).toLocaleDateString("en-IN")}.`} />
      )}

      <section className="card">
        <TaskForm action={updateTask} members={members ?? []} today={todayIn(active.household.timezone)} task={task} submitLabel="Save" />
      </section>

      <section className="card">
        <h2 className="font-medium">History</h2>
        {history?.length ? (
          <ul className="mt-3 divide-y divide-border text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between py-2">
                <span>{(h.completed_by && nameOf.get(h.completed_by)) ?? "Former member"}</span>
                <span className="text-muted">
                  {new Date(h.completed_at).toLocaleDateString("en-IN", { timeZone: active.household.timezone })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Not done yet.</p>
        )}
      </section>

      <form action={deleteTask}>
        <input type="hidden" name="id" value={task.id} />
        <button className="text-sm text-danger hover:underline">Delete task</button>
      </form>
    </div>
  );
}
