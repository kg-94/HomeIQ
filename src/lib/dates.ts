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

/** Days from `today` to `iso` (negative if past). */
export function daysUntil(iso: string, today: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/** Badge for anything that expires (warranties, policies, IDs); red for the last 30 days. */
export function expiryStatus(expires: string | null, today: string, noun = "Warranty") {
  if (!expires) return null;
  const days = daysUntil(expires, today);
  const say = (s: string) => (noun ? `${noun} ${s}` : s[0].toUpperCase() + s.slice(1));
  if (days < 0) return { tone: "muted", label: say("expired") } as const;
  if (days <= 30) return { tone: "danger", label: say(days === 0 ? "ends today" : `ends in ${days}d`) } as const;
  return { tone: "ok", label: say(`till ${formatDue(expires, today)}`) } as const;
}

export const EXPIRY_TONE = { ok: "text-muted", danger: "text-danger", muted: "text-muted line-through" } as const;
