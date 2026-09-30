import type { Metadata } from "next";
import CopyLink from "@/components/copy-link";
import Notice from "@/components/notice";
import { logout } from "@/app/auth/actions";
import { getHouseholdContext } from "@/lib/household";
import { createInvite, removeMember, renameHousehold, revokeInvite } from "./actions";

export const metadata: Metadata = { title: "Household" };

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
    supabase.from("household_members").select("user_id, role, display_name").eq("household_id", hid).order("created_at"),
    isOwner
      ? supabase
          .from("household_invites")
          .select("id, email, token, expires_at")
          .eq("household_id", hid)
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Household</h1>
      <Notice error={error} message={message} />

      {isOwner && (
        <section className="card">
          <h2 className="font-medium">Details</h2>
          <form action={renameHousehold} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1">
              <label htmlFor="name" className="label">Name</label>
              <input id="name" name="name" defaultValue={active.household.name} required maxLength={80} className="input" />
            </div>
            <div className="w-24">
              <label htmlFor="currency" className="label">Currency</label>
              <input id="currency" name="currency" defaultValue={active.household.currency} required maxLength={3} className="input uppercase" />
            </div>
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
              <li key={m.user_id} className="flex items-center justify-between py-3">
                <span>
                  {m.display_name}
                  {isMe && <span className="text-muted"> (you)</span>}
                  <span className="ml-2 rounded bg-foreground/5 px-1.5 py-0.5 text-xs text-muted">{m.role}</span>
                </span>
                {(isMe || isOwner) && (
                  <form action={removeMember}>
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <button className="-my-2 py-2 text-sm text-danger hover:underline">{isMe ? "Leave" : "Remove"}</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
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

      <form action={logout} className="sm:hidden">
        <button className="btn-ghost w-full">Log out</button>
      </form>
    </div>
  );
}
