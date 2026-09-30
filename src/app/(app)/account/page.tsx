import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { CONTACT_EMAIL } from "@/components/legal-page";
import Notice from "@/components/notice";
import { getHouseholdContext } from "@/lib/household";
import { switchHousehold } from "../household/actions";
import { updateMyName } from "./actions";

export const metadata: Metadata = { title: "Account" };

const PROVIDER = { google: "Google", discord: "Discord" } as Record<string, string>;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const { user, memberships, active } = await getHouseholdContext();
  const meta = user.user_metadata;
  const name: string = meta.full_name ?? meta.name ?? active.display_name;
  const avatar: string | undefined = meta.avatar_url ?? meta.picture;
  // app_metadata.provider is the *latest* sign-in method; prefer the linked Google/Discord identity.
  const linked: string[] = user.app_metadata.providers ?? [user.app_metadata.provider ?? ""];
  const provider = linked.map((p) => PROVIDER[p]).find(Boolean);
  const date = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: active.household.timezone }) : "—";

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>
      <Notice error={error} message={message} />

      <section className="card flex items-center gap-4">
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
          Name, email and photo come from your {provider ?? "sign-in"} account; change them there and they update the next time you sign in.
        </p>
      </section>

      <section className="card">
        <h2 className="font-medium">Your households</h2>
        <ul className="mt-3 space-y-4">
          {memberships.map((m) => (
            <li key={m.household.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm">
                  <span className="font-medium">{m.household.name}</span>
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

      <p className="text-xs text-muted">
        To delete your account, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=Delete my HomeIQ account`} className="link">{CONTACT_EMAIL}</a> from{" "}
        {user.email}. See the <Link href="/privacy" className="link">Privacy Policy</Link>.
      </p>
    </div>
  );
}
