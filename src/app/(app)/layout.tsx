import Link from "next/link";
import { BottomNav, TopNav } from "@/components/app-nav";
import AppVersion from "@/components/app-version";
import HouseholdSwitcher from "@/components/household-switcher";
import { logout } from "@/app/auth/actions";
import { avatarUrl } from "@/lib/avatar";
import { getHouseholdContext } from "@/lib/household";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, memberships, active } = await getHouseholdContext();
  const avatar = avatarUrl(user);
  const initial = ((user.user_metadata.full_name as string | undefined) ?? active.display_name).charAt(0).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link href="/" className="-my-3 py-3 font-semibold tracking-tight">
            Home<span className="text-accent">IQ</span>
          </Link>
          <div className="min-w-0 flex-1 sm:flex-none">
            <HouseholdSwitcher
              households={memberships.map((m) => m.household)}
              activeId={active.household.id}
            />
          </div>
          <nav className="ml-auto hidden items-center gap-4 text-sm sm:flex">
            <TopNav />
            <Link href="/household" className="text-muted hover:text-foreground">Household</Link>
            <Link href="/account" className="text-muted hover:text-foreground">Account</Link>
            <form action={logout}>
              <button className="text-muted hover:text-foreground">Log out</button>
            </form>
          </nav>
          {/* Phones: account page (log out, household settings) behind your photo. */}
          <Link href="/account" aria-label="Account" className="-mr-2 flex size-11 items-center justify-center sm:hidden">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- provider-hosted avatar, tiny
              <img src={avatar} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full bg-foreground/5 object-cover ring-1 ring-border" />
            ) : (
              <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                {initial}
              </span>
            )}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-8 sm:pt-8">{children}</main>
      <div className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
        <AppVersion />
      </div>
      <BottomNav />
    </>
  );
}
