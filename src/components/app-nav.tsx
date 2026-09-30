"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 24px stroke icons (Lucide-style paths, inlined to avoid a dependency).
const ICONS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  tasks: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  items: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  docs: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6",
  money: "M3 7h18v12H3zM3 7l3-4h12l3 4M16 13h2",
};

// `label` fits the phone tab bar; `long` is used in the desktop top bar.
const NAV = [
  { href: "/", label: "Home", long: "Home", icon: ICONS.home },
  { href: "/tasks", label: "Tasks", long: "Tasks", icon: ICONS.tasks },
  { href: "/inventory", label: "Items", long: "Inventory", icon: ICONS.items },
  { href: "/documents", label: "Docs", long: "Documents", icon: ICONS.docs },
  { href: "/money", label: "Money", long: "Money", icon: ICONS.money },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

/** Top-bar links from sm up (same items as the phone tab bar). */
export function TopNav() {
  const pathname = usePathname();
  return (
    <>
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={isActive(pathname, n.href) ? "page" : undefined}
          className="text-muted hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
        >
          {n.long}
        </Link>
      ))}
    </>
  );
}

/** Fixed tab bar below sm; clears the iOS home indicator in standalone mode. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-medium text-accent" : "text-muted"}`}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d={n.icon} />
                </svg>
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
