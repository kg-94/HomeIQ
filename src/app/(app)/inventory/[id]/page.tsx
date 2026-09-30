import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Notice from "@/components/notice";
import { expiryStatus, formatDue, repeatLabel, todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { formatMoney } from "@/lib/money";
import { FILE_KINDS, formatBytes } from "@/lib/storage";
import { deleteFile, deleteItem, updateItem, uploadItemFile } from "../actions";
import ItemForm from "../item-form";

export const metadata: Metadata = { title: "Item" };

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const { supabase, active } = await getHouseholdContext();
  const { currency, timezone } = active.household;
  const today = todayIn(timezone);

  const [{ data: item }, { data: files }, { data: tasks }] = await Promise.all([
    supabase.from("items").select("*").eq("id", id).eq("household_id", active.household.id).maybeSingle(),
    supabase.from("files").select("id, kind, name, mime, size, created_at").eq("item_id", id).order("created_at"),
    supabase
      .from("tasks")
      .select("id, title, due_date, repeat_every, repeat_unit")
      .eq("item_id", id)
      .is("completed_at", null)
      .order("due_date"),
  ]);
  if (!item) notFound();
  const warranty = expiryStatus(item.warranty_expires_on, today);
  const here = `/inventory/${id}`;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/inventory" className="-my-2 inline-block py-2 text-sm text-muted hover:text-foreground">← Inventory</Link>
      <div>
        <h1 className="text-2xl font-semibold">{item.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {[warranty?.label, item.price != null && formatMoney(item.price, currency)].filter(Boolean).join(" · ")}
        </p>
      </div>
      <Notice error={error} />

      <section className="card">
        <h2 className="font-medium">Files</h2>
        {files && files.length > 0 && (
          <ul className="mt-3 divide-y divide-border text-sm">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                <a href={`/files/${f.id}`} target="_blank" rel="noopener" className="link min-w-0 truncate">{f.name}</a>
                <span className="flex shrink-0 items-center gap-3 text-muted">
                  <span className="capitalize">{f.kind}</span>
                  <span>{formatBytes(f.size)}</span>
                  <a href={`/files/${f.id}?download=1`} className="hover:text-foreground">Download</a>
                  <form action={deleteFile}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="back_to" value={here} />
                    <button className="text-danger hover:underline">Delete</button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
        <form action={uploadItemFile} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="item_id" value={item.id} />
          <label htmlFor="kind" className="sr-only">File type</label>
          <select id="kind" name="kind" defaultValue="receipt" className="input w-auto capitalize">
            {FILE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <label htmlFor="file" className="sr-only">File</label>
          <input id="file" name="file" type="file" accept="application/pdf,image/*" required className="min-w-0 flex-1 text-sm" />
          <button className="btn-ghost">Upload</button>
        </form>
        <p className="mt-1 text-xs text-muted">PDF or image, up to 20 MB.</p>
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Maintenance</h2>
          <Link href={`/tasks?item=${item.id}`} className="link text-sm">Add task</Link>
        </div>
        {tasks?.length ? (
          <ul className="mt-3 divide-y divide-border text-sm">
            {tasks.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 py-2">
                <Link href={`/tasks/${t.id}`} className="truncate hover:underline">
                  {t.title}
                  {t.repeat_every && <span className="text-muted"> · {repeatLabel(t.repeat_every, t.repeat_unit)}</span>}
                </Link>
                <span className={t.due_date < today ? "text-danger" : "text-muted"}>{formatDue(t.due_date, today)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No maintenance scheduled.</p>
        )}
      </section>

      <section className="card">
        <h2 className="mb-4 font-medium">Details</h2>
        <ItemForm action={updateItem} item={item} currency={currency} submitLabel="Save" />
      </section>

      <form action={deleteItem}>
        <input type="hidden" name="id" value={item.id} />
        <button className="-my-2 py-2 text-sm text-danger hover:underline">Delete item and its files</button>
      </form>
    </div>
  );
}
