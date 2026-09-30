import Link from "next/link";
import { addDays, formatDue, todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";

const upcoming = ["Inventory & warranties", "Bills & expenses", "Documents"];

export default async function HomePage() {
  const { supabase, active } = await getHouseholdContext();
  const today = todayIn(active.household.timezone);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, due_date")
    .eq("household_id", active.household.id)
    .is("completed_at", null)
    .lte("due_date", addDays(today, 6))
    .order("due_date");
  const overdue = tasks?.filter((t) => t.due_date < today).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hi, {active.display_name}</h1>
        <p className="mt-1 text-muted">{active.household.name}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/tasks" className="card block hover:border-accent">
          <h2 className="font-medium">Maintenance &amp; tasks</h2>
          <p className="mt-1 text-sm text-muted">
            {tasks?.length ? (
              <>
                {overdue > 0 && <span className="text-danger">{overdue} overdue · </span>}
                {tasks.length - overdue} due this week
              </>
            ) : (
              "Nothing due this week."
            )}
          </p>
          {tasks && tasks.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {tasks.slice(0, 3).map((t) => (
                <li key={t.id} className="flex justify-between gap-3">
                  <span className="truncate">{t.title}</span>
                  <span className={t.due_date < today ? "text-danger" : "text-muted"}>{formatDue(t.due_date, today)}</span>
                </li>
              ))}
            </ul>
          )}
        </Link>
        {upcoming.map((title) => (
          <div key={title} className="card">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-1 text-sm text-muted">Coming soon.</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">
        Invite the rest of your household from <Link href="/household" className="link">Household settings</Link>.
      </p>
    </div>
  );
}
