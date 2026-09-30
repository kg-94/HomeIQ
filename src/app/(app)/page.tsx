import Link from "next/link";
import { addDays, formatDue, todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";

const upcoming = ["Bills & expenses"];

export default async function HomePage() {
  const { supabase, active } = await getHouseholdContext();
  const today = todayIn(active.household.timezone);

  const hid = active.household.id;
  const [{ data: tasks }, { count: itemCount }, { data: expiring }, { count: docCount }, { data: expiringDocs }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_date")
      .eq("household_id", hid)
      .is("completed_at", null)
      .lte("due_date", addDays(today, 6))
      .order("due_date"),
    supabase.from("items").select("*", { count: "exact", head: true }).eq("household_id", hid),
    supabase
      .from("items")
      .select("id, name, warranty_expires_on")
      .eq("household_id", hid)
      .gte("warranty_expires_on", today)
      .lte("warranty_expires_on", addDays(today, 30))
      .order("warranty_expires_on"),
    supabase.from("files").select("*", { count: "exact", head: true }).eq("household_id", hid).eq("kind", "document"),
    supabase
      .from("files")
      .select("id, name, expires_on")
      .eq("household_id", hid)
      .eq("kind", "document")
      .gte("expires_on", today)
      .lte("expires_on", addDays(today, 30))
      .order("expires_on"),
  ]);
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
        <Link href="/inventory" className="card block hover:border-accent">
          <h2 className="font-medium">Inventory &amp; warranties</h2>
          <p className="mt-1 text-sm text-muted">
            {itemCount ? `${itemCount} item${itemCount > 1 ? "s" : ""}` : "Track appliances, receipts and manuals."}
            {expiring?.length ? <span className="text-danger"> · {expiring.length} warranty ending soon</span> : null}
          </p>
          {expiring && expiring.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {expiring.slice(0, 3).map((i) => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span className="truncate">{i.name}</span>
                  <span className="text-danger">{formatDue(i.warranty_expires_on!, today)}</span>
                </li>
              ))}
            </ul>
          )}
        </Link>
        <Link href="/documents" className="card block hover:border-accent">
          <h2 className="font-medium">Documents</h2>
          <p className="mt-1 text-sm text-muted">
            {docCount ? `${docCount} document${docCount > 1 ? "s" : ""}` : "Insurance, IDs, lease and tax papers."}
            {expiringDocs?.length ? <span className="text-danger"> · {expiringDocs.length} expiring soon</span> : null}
          </p>
          {expiringDocs && expiringDocs.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {expiringDocs.slice(0, 3).map((d) => (
                <li key={d.id} className="flex justify-between gap-3">
                  <span className="truncate">{d.name}</span>
                  <span className="text-danger">{formatDue(d.expires_on!, today)}</span>
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
