import type { Metadata } from "next";
import Link from "next/link";
import Notice from "@/components/notice";
import { todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { formatMoney, fromPaise, settleUp } from "@/lib/money";
import { deleteSettlement, recordSettlement } from "../actions";
import MoneyTabs from "../money-tabs";

export const metadata: Metadata = { title: "Splits" };

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function SplitsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const { supabase, user, active } = await getHouseholdContext();
  const hid = active.household.id;
  const { currency, timezone } = active.household;
  const today = todayIn(timezone);
  const fmt = (n: number) => formatMoney(n, currency);

  const [{ data: members }, { data: balances }, { data: expenses }, { data: settlements }] = await Promise.all([
    supabase.from("household_members").select("user_id, display_name, is_offline").eq("household_id", hid).order("created_at"),
    supabase.from("member_balances").select("user_id, balance").eq("household_id", hid),
    supabase
      .from("expenses")
      .select("id, description, amount, paid_by, spent_on, splits:expense_splits(user_id, share)")
      .eq("household_id", hid)
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("settlements")
      .select("id, from_user, to_user, amount, settled_on")
      .eq("household_id", hid)
      .order("settled_on", { ascending: false })
      .limit(20),
  ]);
  const nameOf = (id: string | null) => (id && members?.find((m) => m.user_id === id)?.display_name) || "Former member";
  const isMe = (id: string) => id === user.id;
  const who = (id: string) => (isMe(id) ? "You" : nameOf(id));

  const paise = Object.fromEntries((balances ?? []).map((b) => [b.user_id!, Math.round(Number(b.balance) * 100)]));
  const transfers = settleUp(paise);
  // Everyone in the household, plus anyone who left with a non-zero balance.
  const people = [
    ...(members ?? []).map((m) => m.user_id),
    ...Object.keys(paise).filter((id) => paise[id] !== 0 && !members?.some((m) => m.user_id === id)),
  ];
  // Shared = someone other than the payer carries part of it.
  const shared = (expenses ?? []).filter((e) => e.splits.some((s) => s.user_id !== e.paid_by && s.share > 0)).slice(0, 50);

  return (
    <div className="space-y-6">
      <MoneyTabs current="splits" />
      <Notice error={error} message={message} />

      <section className="card">
        <h2 className="font-medium">Balances</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {people.map((id) => {
            const p = paise[id] ?? 0;
            return (
              <li key={id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">
                  {nameOf(id)}
                  {isMe(id) && <span className="text-muted"> (you)</span>}
                </span>
                <span className={`shrink-0 tabular-nums ${p < 0 ? "text-danger" : p > 0 ? "text-accent" : "text-muted"}`}>
                  {p > 0 ? `gets back ${fmt(fromPaise(p))}` : p < 0 ? `owes ${fmt(fromPaise(-p))}` : "settled"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h2 className="font-medium">Settle up</h2>
        {transfers.length ? (
          <>
            <p className="mt-1 text-sm text-muted">The fewest payments that settle everyone.</p>
            <ul className="mt-3 divide-y divide-border text-sm">
              {transfers.map((t) => (
                <li key={`${t.from}-${t.to}`} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span>
                    <strong className="font-medium">{who(t.from)}</strong> {isMe(t.from) ? "pay" : "pays"}{" "}
                    <strong className="font-medium">{isMe(t.to) ? "you" : nameOf(t.to)}</strong>{" "}
                    <span className="tabular-nums">{fmt(fromPaise(t.paise))}</span>
                  </span>
                  <form action={recordSettlement}>
                    <input type="hidden" name="from_user" value={t.from} />
                    <input type="hidden" name="to_user" value={t.to} />
                    <input type="hidden" name="amount" value={fromPaise(t.paise).toFixed(2)} />
                    <input type="hidden" name="settled_on" value={today} />
                    <button className="btn-ghost">Mark paid</button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">Everyone is settled up.</p>
        )}

        {(members?.length ?? 0) > 1 && (
          <details className="mt-4 border-t border-border pt-3">
            <summary className="cursor-pointer text-sm font-medium">Record a payment</summary>
            <form action={recordSettlement} className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="from_user" className="label">Who paid</label>
                <select id="from_user" name="from_user" defaultValue={user.id} className="input">
                  {members?.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="to_user" className="label">To</label>
                <select id="to_user" name="to_user" defaultValue={members?.find((m) => m.user_id !== user.id)?.user_id} className="input">
                  {members?.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="amount" className="label">Amount ({currency})</label>
                <input id="amount" name="amount" inputMode="decimal" placeholder="0.00" required className="input" />
              </div>
              <div>
                <label htmlFor="settled_on" className="label">Date</label>
                <input id="settled_on" name="settled_on" type="date" defaultValue={today} required className="input" />
              </div>
              <div className="sm:col-span-2">
                <button className="btn">Record payment</button>
              </div>
            </form>
          </details>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Shared expenses</h2>
        {shared.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {shared.map((e) => (
              <li key={e.id}>
                <Link href={`/money/expenses/${e.id}`} className="block px-4 py-3 hover:bg-foreground/[0.03]">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">{e.description}</span>
                    <span className="shrink-0 tabular-nums">{fmt(e.amount)}</span>
                  </span>
                  <span className="block text-xs text-muted">
                    {who(e.paid_by)} paid · {shortDate(e.spent_on)}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {e.splits
                      .filter((s) => s.share > 0)
                      .map((s) => (
                        <span key={s.user_id} className="rounded bg-foreground/5 px-1.5 py-0.5 text-xs tabular-nums">
                          {who(s.user_id)} {fmt(s.share)}
                        </span>
                      ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No shared expenses yet. When adding an expense, tick the people to split it with.
          </p>
        )}
      </section>

      {settlements && settlements.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">Settle-up history</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
            {settlements.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  {who(s.from_user)} paid {isMe(s.to_user) ? "you" : nameOf(s.to_user)}
                  <span className="text-muted"> · {shortDate(s.settled_on)}</span>
                </span>
                <span className="tabular-nums">{fmt(s.amount)}</span>
                <form action={deleteSettlement}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="-my-2 py-2 text-xs text-danger hover:underline">Undo</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
