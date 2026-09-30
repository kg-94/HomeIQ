import Link from "next/link";

export default function MoneyTabs({ current }: { current: "overview" | "bills" | "income" | "categories" }) {
  const tab = (key: typeof current, href: string, label: string) => (
    <Link href={href} className={`rounded px-3 py-2 sm:py-1 ${current === key ? "bg-foreground/10 font-medium" : "text-muted"}`}>
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">Money</h1>
      <nav className="flex gap-1 rounded-md border border-border bg-surface p-1 text-sm">
        {tab("overview", "/money", "Expenses")}
        {tab("bills", "/money/bills", "Bills")}
        {tab("income", "/money/income", "Income")}
        {tab("categories", "/money/categories", "Categories")}
      </nav>
    </div>
  );
}
