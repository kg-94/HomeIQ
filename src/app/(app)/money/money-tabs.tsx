import Link from "next/link";

type Tab = "overview" | "splits" | "bills" | "income" | "categories";

export default function MoneyTabs({ current }: { current: Tab }) {
  const tab = (key: Tab, href: string, label: string) => (
    <Link
      href={href}
      aria-current={current === key ? "page" : undefined}
      className={`shrink-0 rounded px-2 py-2 sm:px-3 sm:py-1 ${current === key ? "bg-foreground/10 font-medium" : "text-muted"}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">Money</h1>
      {/* Five tabs: tighter on phones, and scrolls sideways rather than widening the page if it must. */}
      <nav className="flex max-w-full gap-0.5 overflow-x-auto rounded-md border border-border bg-surface p-1 text-sm sm:gap-1">
        {tab("overview", "/money", "Expenses")}
        {tab("splits", "/money/splits", "Splits")}
        {tab("bills", "/money/bills", "Bills")}
        {tab("income", "/money/income", "Income")}
        {tab("categories", "/money/categories", "Categories")}
      </nav>
    </div>
  );
}
