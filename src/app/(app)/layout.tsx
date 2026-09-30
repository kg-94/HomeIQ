import Link from "next/link";
import { BottomNav, TopNav } from "@/components/app-nav";
import AppVersion from "@/components/app-version";
import HouseholdSwitcher from "@/components/household-switcher";
import { logout } from "@/app/auth/actions";
import { getHouseholdContext } from "@/lib/household";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { memberships, active } = await getHouseholdContext();

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
          {/* Phones: account page (log out, household settings) behind one icon. */}
          <Link href="/account" aria-label="Account" className="-mr-2 flex size-11 items-center justify-center text-muted sm:hidden">
            <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
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
