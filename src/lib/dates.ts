// Due dates are plain "YYYY-MM-DD" strings (Postgres `date`); "today" depends
// on the household's timezone, not the server's (Workers run in UTC).

export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now); // en-CA = YYYY-MM-DD
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type DueGroup = "overdue" | "week" | "later";

export function dueGroup(due: string, today: string): DueGroup {
  if (due < today) return "overdue";
  return due <= addDays(today, 6) ? "week" : "later";
}

export function formatDue(due: string, today: string): string {
  if (due === today) return "Today";
  if (due === addDays(today, 1)) return "Tomorrow";
  if (due === addDays(today, -1)) return "Yesterday";
  return new Date(`${due}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: dueGroup(due, today) === "week" ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: due.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
    timeZone: "UTC",
  });
}

export const repeatLabel = (every: number | null, unit: string | null) =>
  every ? (every === 1 ? `Every ${unit}` : `Every ${every} ${unit}s`) : null;
