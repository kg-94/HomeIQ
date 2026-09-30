import type { Metadata } from "next";
import Link from "next/link";
import Notice from "@/components/notice";
import { expiryStatus, EXPIRY_TONE, todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { createItem } from "./actions";
import ItemForm from "./item-form";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const { error, q = "" } = await searchParams;
  const { supabase, active } = await getHouseholdContext();
  const today = todayIn(active.household.timezone);

  let query = supabase
    .from("items")
    .select("id, name, category, location, brand, warranty_expires_on, files(count)")
    .eq("household_id", active.household.id)
    .order("name");
  // Drop LIKE wildcards and PostgREST or()/quoting syntax from user input.
  const term = q.trim().replace(/[%_*,()"\\]/g, " ");
  if (term) query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%,category.ilike.%${term}%,location.ilike.%${term}%`);
  const { data: items } = await query;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <form className="flex gap-2" role="search">
          <label htmlFor="q" className="sr-only">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search items" className="input w-56" />
        </form>
      </div>
      <Notice error={error} />

      <details className="card" open={!q && items?.length === 0}>
        <summary className="cursor-pointer font-medium marker:text-muted">Add an item</summary>
        <div className="mt-4">
          <ItemForm action={createItem} currency={active.household.currency} submitLabel="Add item" />
        </div>
      </details>

      {items?.length === 0 ? (
        <p className="text-sm text-muted">{q ? `Nothing matches “${q}”.` : "Add appliances and gadgets to track warranties and manuals."}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {items?.map((item) => {
            const warranty = expiryStatus(item.warranty_expires_on, today);
            const fileCount = item.files[0]?.count ?? 0;
            return (
              <li key={item.id}>
                <Link href={`/inventory/${item.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.03]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {[item.category, item.brand, item.location, fileCount && `${fileCount} file${fileCount > 1 ? "s" : ""}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {warranty && <span className={`shrink-0 text-sm ${EXPIRY_TONE[warranty.tone]}`}>{warranty.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
