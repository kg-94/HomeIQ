import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import Notice from "@/components/notice";
import { TagChips } from "@/components/tags";
import { getHouseholdContext } from "@/lib/household";
import { switchHousehold } from "../household/actions";
import { avatarUrl } from "@/lib/avatar";
import { deleteAccount, resetAvatar, updateAvatar, updateMyName } from "./actions";

export const metadata: Metadata = { title: "Account" };

const PROVIDER = { google: "Google", discord: "Discord" } as Record<string, string>;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const { supabase, user, memberships, active } = await getHouseholdContext();
  const [{ data: blockers }, { data: memberRows }] = await Promise.all([
    supabase.rpc("account_deletion_blockers"),
    supabase.from("household_members").select("household_id, user_id, is_offline"),
  ]);
  // Households that would be deleted with the account (no one else has an account there).
  const goesWithAccount = memberships.filter(
    (m) => !memberRows?.some((r) => r.household_id === m.household.id && r.user_id !== user.id && !r.is_offline),
  );
  const meta = user.user_metadata;
  const name: string = meta.full_name ?? meta.name ?? active.display_name;
  const avatar = avatarUrl(user);
  const hasCustomPhoto = Boolean(meta.custom_avatar_path);
  // app_metadata.provider is the *latest* sign-in method; prefer the linked Google/Discord identity.
  const linked: string[] = user.app_metadata.providers ?? [user.app_metadata.provider ?? ""];
  const provider = linked.map((p) => PROVIDER[p]).find(Boolean);
  const date = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: active.household.timezone }) : "—";

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>
      <Notice error={error} message={message} />

      <section className="card">
        <div className="flex items-center gap-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- provider-hosted avatar, tiny
          <img src={avatar} alt="" referrerPolicy="no-referrer" className="size-16 shrink-0 rounded-full bg-foreground/5 object-cover" />
        ) : (
          <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent/10 text-2xl font-semibold text-accent">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-medium">{name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
        </div>
        <form action={updateAvatar} className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
          <label htmlFor="photo" className="text-sm font-medium sm:w-32">Profile photo</label>
          <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="min-w-0 flex-1 text-sm" />
          <button className="btn-ghost shrink-0">Upload</button>
        </form>
        <p className="mt-1 text-xs text-muted">JPG, PNG or WebP, up to 5 MB. Shown to members of your households.</p>
        {hasCustomPhoto && (
          <form action={resetAvatar} className="mt-2">
            <button className="-my-2 py-2 text-sm text-muted hover:text-foreground hover:underline">
              Use my {provider ?? "sign-in"} photo instead
            </button>
          </form>
        )}
      </section>

      <section className="card">
        <h2 className="font-medium">Details</h2>
        <dl className="mt-3 divide-y divide-border text-sm">
          {[
            ["Signs in with", provider ?? "—"],
            ["Email", user.email ?? "—"],
            ["Member since", date(user.created_at)],
            ["Last sign-in", date(user.last_sign_in_at)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-muted">{k}</dt>
              <dd className="truncate text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">
          Name and email come from your {provider ?? "sign-in"} account; change them there and they update the next time you sign in.
        </p>
      </section>

      <section className="card">
        <h2 className="font-medium">Your households</h2>
        <ul className="mt-3 space-y-4">
          {memberships.map((m) => (
            <li key={m.household.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm">
                  <span className="font-medium">{m.household.icon ?? "🏠"} {m.household.name}</span>
                  <span className="ml-2 rounded bg-foreground/5 px-1.5 py-0.5 text-xs text-muted">{m.role}</span>
                </p>
                {m.household.id === active.household.id ? (
                  <span className="shrink-0 text-xs text-muted">Current</span>
                ) : (
                  <form action={switchHousehold}>
                    <input type="hidden" name="household_id" value={m.household.id} />
                    <button className="link -my-2 py-2 text-sm">Switch</button>
                  </form>
                )}
              </div>
              <TagChips tags={m.household.tags} className="mt-1" />
              <form action={updateMyName} className="mt-2 flex gap-2">
                <input type="hidden" name="household_id" value={m.household.id} />
                <label htmlFor={`name-${m.household.id}`} className="sr-only">Your name in {m.household.name}</label>
                <input id={`name-${m.household.id}`} name="display_name" defaultValue={m.display_name} required maxLength={80} className="input" />
                <button className="btn-ghost shrink-0">Save</button>
              </form>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">This is the name other members see in that household.</p>
        <Link href="/onboarding" className="btn-ghost mt-4 w-full sm:w-auto">+ Create another household</Link>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/household" className="btn-ghost">Household settings</Link>
        <form action={logout}>
          <button className="btn-ghost w-full">Log out</button>
        </form>
      </div>

      <section className="card border-danger/40">
        <h2 className="font-medium text-danger">Delete account</h2>
        {blockers?.length ? (
          <div className="mt-2 text-sm">
            <p className="text-muted">You&apos;re the only owner of households other people use. Make someone else owner first:</p>
            <ul className="mt-2 list-disc pl-5">
              {blockers.map((b) => (
                <li key={b.household_id}>
                  {b.name} &mdash; switch to it, then <Link href="/household" className="link">Household</Link> → Members → Make owner
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              Permanently deletes your account and your private income.
              {goesWithAccount.length > 0 && (
                <>
                  {" "}These households have no one else with an account and will be deleted with everything in them:{" "}
                  <strong className="text-foreground">{goesWithAccount.map((m) => m.household.name).join(", ")}</strong>.
                </>
              )}{" "}
              In households you share, your past expenses stay so others&apos; balances stay correct. This can&apos;t be undone.
            </p>
            <form action={deleteAccount} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label htmlFor="confirm" className="sr-only">Type DELETE to confirm</label>
              <input id="confirm" name="confirm" required autoComplete="off" placeholder="Type DELETE to confirm" className="input" />
              <button className="btn shrink-0 bg-danger text-white">Delete my account</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
