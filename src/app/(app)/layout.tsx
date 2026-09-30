import Link from "next/link";
import HouseholdSwitcher from "@/components/household-switcher";
import { logout } from "@/app/auth/actions";
import { getHouseholdContext } from "@/lib/household";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { memberships, active } = await getHouseholdContext();

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            Home<span className="text-accent">IQ</span>
          </Link>
          <HouseholdSwitcher
            households={memberships.map((m) => m.household)}
            activeId={active.household.id}
          />
          <nav className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/tasks" className="text-muted hover:text-foreground">Tasks</Link>
            <Link href="/inventory" className="text-muted hover:text-foreground">Inventory</Link>
            <Link href="/household" className="text-muted hover:text-foreground">Household</Link>
            <form action={logout}>
              <button className="text-muted hover:text-foreground">Log out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
