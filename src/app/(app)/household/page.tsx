import type { Metadata } from "next";
import CopyLink from "@/components/copy-link";
import Notice from "@/components/notice";
import { TagChips, TagInput } from "@/components/tags";
import { getHouseholdContext } from "@/lib/household";
import { addOfflineMember, createInvite, deleteHousehold, removeMember, renameHousehold, revokeInvite, transferOwnership } from "./actions";

export const metadata: Metadata = { title: "Household" };

const ICONS = ["🏠", "🏡", "🏢", "🏘️", "🏚️", "🏰", "🛖", "🌳", "🏖️", "🏔️", "🚐", "❤️"];

export default async function HouseholdPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const { supabase, user, active } = await getHouseholdContext();
  const hid = active.household.id;
  const isOwner = active.role === "owner";

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("household_members").select("user_id, role, display_name, is_offline").eq("household_id", hid).order("created_at"),
    isOwner
      ? supabase
          .from("household_invites")
          .select("id, email, token, expires_at, member_id")
          .eq("household_id", hid)
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  // The last owner can't leave; if no one else has an account they can delete
  // instead (offline members are removed with the household).
  const isSoleOwner = isOwner && !members?.some((m) => m.user_id !== user.id && !m.is_offline);
  const nameOf = (id: string | null) => members?.find((m) => m.user_id === id)?.display_name;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          <span aria-hidden>{active.household.icon ?? "🏠"}</span> {active.household.name}
        </h1>
        <TagChips tags={active.household.tags} className="mt-2" />
      </div>
      <Notice error={error} message={message} />

      {isOwner && (
        <section className="card">
          <h2 className="font-medium">Details</h2>
          <form action={renameHousehold} className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1">
                <label htmlFor="name" className="label">Name</label>
                <input id="name" name="name" defaultValue={active.household.name} required maxLength={80} className="input" />
              </div>
              <div className="w-24">
                <label htmlFor="currency" className="label">Currency</label>
                <input id="currency" name="currency" defaultValue={active.household.currency} required maxLength={3} className="input uppercase" />
              </div>
            </div>
            <fieldset>
              <legend className="label">Icon</legend>
              <div className="flex flex-wrap gap-1.5">
                {ICONS.map((i) => (
                  <label key={i} className="cursor-pointer">
                    <input type="radio" name="icon" value={i} defaultChecked={(active.household.icon ?? "🏠") === i} className="peer sr-only" />
                    <span className="flex size-11 items-center justify-center rounded-md border border-border text-2xl peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">
                      {i}
                    </span>
                  </label>
                ))}
              </div>
              <label htmlFor="icon_custom" className="mt-2 block text-xs text-muted">Or type any emoji</label>
              <input
                id="icon_custom"
                name="icon_custom"
                defaultValue={active.household.icon && !ICONS.includes(active.household.icon) ? active.household.icon : ""}
                placeholder="🐶"
                maxLength={16}
                className="input w-24 text-center text-xl"
              />
            </fieldset>
            <TagInput defaultValue={active.household.tags} placeholder="e.g. rental, parents, weekend home" />
            <button className="btn">Save</button>
          </form>
        </section>
      )}

      <section className="card">
        <h2 className="font-medium">Members</h2>
        <ul className="mt-3 divide-y divide-border">
          {members?.map((m) => {
            const isMe = m.user_id === user.id;
            return (
              <li key={m.user_id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    {m.display_name}
                    {isMe && <span className="text-muted"> (you)</span>}
                    <span className="ml-2 rounded bg-foreground/5 px-1.5 py-0.5 text-xs text-muted">
                      {m.is_offline ? "no account" : m.role}
                    </span>
                  </span>
                  {(isMe || isOwner) && !(isMe && isSoleOwner) && (
                    <form action={removeMember}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <button className="-my-2 py-2 text-sm text-danger hover:underline">{isMe ? "Leave" : "Remove"}</button>
                    </form>
                  )}
                </div>
                {isOwner && !isMe && !m.is_offline && m.role !== "owner" && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-muted">Make owner</summary>
                    <form action={transferOwnership} className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <span>{m.display_name} becomes the owner and you become a member.</span>
                      <button className="btn-ghost">Transfer ownership</button>
                    </form>
                  </details>
                )}
                {isOwner && m.is_offline && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-muted">Link to an account</summary>
                    <p className="mt-2 text-xs text-muted">
                      Invite them by the email of their Google or Discord account. When they accept, they take over{" "}
                      {m.display_name}&apos;s tasks, expenses, balance and income.
                    </p>
                    <form action={createInvite} className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input type="hidden" name="member_id" value={m.user_id} />
                      <label htmlFor={`link-${m.user_id}`} className="sr-only">Their email</label>
                      <input id={`link-${m.user_id}`} name="email" type="email" placeholder="name@gmail.com" required className="input" />
                      <button className="btn-ghost shrink-0">Create invite</button>
                    </form>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
        {isOwner && (
          <form action={addOfflineMember} className="mt-4 border-t border-border pt-4">
            <label htmlFor="display_name" className="label">Add someone without an account</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="display_name" name="display_name" placeholder="e.g. Maa, Rohan, Sunita (help)" required maxLength={80} className="input" />
              <button className="btn-ghost shrink-0">Add member</button>
            </div>
            <p className="mt-1 text-xs text-muted">
              For family or help who won&apos;t log in. You can assign them tasks and include them in expenses, and link
              them to an account later.
            </p>
          </form>
        )}
      </section>

      {isOwner && (
        <section className="card">
          <h2 className="font-medium">Invite someone</h2>
          <p className="mt-1 text-sm text-muted">
            Enter the email of their Google or Discord account. Only that account can use the
            link, and it expires after 7 days.
          </p>
          <form action={createInvite} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="email" className="sr-only">Email</label>
            <input id="email" name="email" type="email" placeholder="name@gmail.com" required className="input" />
            <button className="btn shrink-0">Create invite</button>
          </form>

          {invites && invites.length > 0 && (
            <ul className="mt-4 divide-y divide-border">
              {invites.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <span className="truncate">
                    {inv.email}
                    {inv.member_id && nameOf(inv.member_id) && <span className="text-muted"> · as {nameOf(inv.member_id)}</span>}
                    <span className="block text-xs text-muted">
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <CopyLink path={`/invite/${inv.token}`} />
                    <form action={revokeInvite}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button className="-my-2 py-2 text-sm text-danger hover:underline">Revoke</button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isSoleOwner && (
        <section className="card border-danger/40">
          <h2 className="font-medium text-danger">Delete household</h2>
          <p className="mt-1 text-sm text-muted">
            You&apos;re the only member with an account, so you can&apos;t leave &mdash; but you can delete it. This permanently removes
            its tasks, items, documents and files, bills and expenses. It can&apos;t be undone.
          </p>
          <form action={deleteHousehold} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="confirm" className="sr-only">Type the household name to confirm</label>
            <input
              id="confirm"
              name="confirm"
              required
              autoComplete="off"
              placeholder={`Type "${active.household.name}" to confirm`}
              className="input"
            />
            <button className="btn shrink-0 bg-danger text-white">Delete household</button>
          </form>
        </section>
      )}
    </div>
  );
}
