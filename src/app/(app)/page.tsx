import Link from "next/link";
import { CategoryBars, IncomeSpendChart, MonthTiles } from "@/components/money-charts";
import { byCategory, monthKeys, monthLabel, monthsStart, sumByMonth } from "@/lib/chart";
import { addDays, formatDue, todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { formatMoney } from "@/lib/money";

export default async function HomePage() {
  const { supabase, user, active } = await getHouseholdContext();
  const today = todayIn(active.household.timezone);

  const hid = active.household.id;
  const [
    { data: tasks },
    { count: itemCount },
    { data: expiring },
    { count: docCount },
    { data: expiringDocs },
    { data: bills },
    { data: myBalance },
    { data: incomes },
    { data: expenses },
  ] = await Promise.all([
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
    supabase
      .from("bills")
      .select("id, name, amount, due_date")
      .eq("household_id", hid)
      .is("paid_at", null)
      .lte("due_date", addDays(today, 6))
      .order("due_date"),
    supabase.from("member_balances").select("balance").eq("household_id", hid).eq("user_id", user.id).maybeSingle(),
    // Charts: last 6 months. RLS returns shared income plus only my private income.
    supabase.from("incomes").select("amount, received_on").eq("household_id", hid).gte("received_on", monthsStart(today, 6)),
    supabase.from("expenses").select("amount, spent_on, category").eq("household_id", hid).gte("spent_on", monthsStart(today, 6)),
  ]);
  const balance = Number(myBalance?.balance ?? 0);
  const fmt = (n: number) => formatMoney(n, active.household.currency);
  const overdue = tasks?.filter((t) => t.due_date < today).length ?? 0;

  const keys = monthKeys(today, 6);
  const incomeByMonth = sumByMonth(incomes ?? [], (r) => r.received_on, keys);
  const spendByMonth = sumByMonth(expenses ?? [], (r) => r.spent_on, keys);
  const months = keys.map((key, i) => ({ key, label: monthLabel(key), income: incomeByMonth[i], spend: spendByMonth[i] }));
  const thisMonth = months[months.length - 1];
  const categories = byCategory((expenses ?? []).filter((e) => e.spent_on.startsWith(thisMonth.key)));
  const hasMoney = (incomes?.length ?? 0) + (expenses?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hi, {active.display_name}</h1>
        <p className="mt-1 text-muted">{active.household.name}</p>
      </div>
      {hasMoney && (
        <section aria-label={`${thisMonth.label} so far`} className="space-y-2">
          <h2 className="text-sm font-medium text-muted">{new Date(`${thisMonth.key}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", timeZone: "UTC" })} so far</h2>
          <MonthTiles income={thisMonth.income} spend={thisMonth.spend} currency={active.household.currency} />
        </section>
      )}
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
        <Link href="/money" className="card block hover:border-accent">
          <h2 className="font-medium">Bills &amp; expenses</h2>
          <p className={`mt-1 text-sm ${balance < 0 ? "text-danger" : "text-muted"}`}>
            {balance > 0 ? `You are owed ${fmt(balance)}` : balance < 0 ? `You owe ${fmt(-balance)}` : "All settled up"}
            {bills?.length ? ` · ${bills.length} bill${bills.length > 1 ? "s" : ""} due this week` : ""}
          </p>
          {bills && bills.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {bills.slice(0, 3).map((b) => (
                <li key={b.id} className="flex justify-between gap-3">
                  <span className="truncate">{b.name} · {fmt(b.amount)}</span>
                  <span className={b.due_date < today ? "text-danger" : "text-muted"}>{formatDue(b.due_date, today)}</span>
                </li>
              ))}
            </ul>
          )}
        </Link>
      </div>
      {hasMoney ? (
        <section className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <div className="card">
            <IncomeSpendChart months={months} currency={active.household.currency} />
          </div>
          <div className="card">
            <CategoryBars rows={categories} currency={active.household.currency} />
          </div>
        </section>
      ) : (
        <p className="card text-sm text-muted">
          Add <Link href="/money" className="link">expenses</Link> and <Link href="/money/income" className="link">income</Link> to see
          monthly charts here.
        </p>
      )}
      <p className="text-sm text-muted">
        Invite the rest of your household from <Link href="/household" className="link">Household settings</Link>.
      </p>
    </div>
  );
}
