import type { Metadata } from "next";
import Link from "next/link";
import Notice from "@/components/notice";
import { TagChips, TagFilter } from "@/components/tags";
import { expiryStatus, EXPIRY_TONE, todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { allTags } from "@/lib/tags";
import { DOC_CATEGORIES, formatBytes, type DocCategory } from "@/lib/storage";
import { uploadDocument } from "./actions";
import DocumentFields from "./document-fields";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; error?: string; q?: string; c?: string }>;
}) {
  const { tag, error, q = "", c } = await searchParams;
  const category = c && c in DOC_CATEGORIES ? (c as DocCategory) : undefined;
  const { supabase, active } = await getHouseholdContext();
  const today = todayIn(active.household.timezone);

  let query = supabase
    .from("files")
    .select("id, name, category, expires_on, size, created_at, tags")
    .contains("tags", tag ? [tag] : [])
    .eq("household_id", active.household.id)
    .eq("kind", "document")
    .is("item_id", null)
    .order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  // Drop LIKE wildcards from user input.
  const term = q.trim().replace(/[%_*\\]/g, " ");
  if (term) query = query.ilike("name", `%${term}%`);
  const { data: docs } = await query;

  const chip = (key: DocCategory | undefined, label: string) => {
    const params = new URLSearchParams({ ...(key && { c: key }), ...(q && { q }) });
    const on = key === category;
    return (
      <Link
        key={key ?? "all"}
        href={`/documents${params.size ? `?${params}` : ""}`}
        className={`rounded-full border px-3 py-2 text-sm sm:py-1 ${on ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"}`}
      >
        {label}
      </Link>
    );
  };

  const { data: tagRows } = await supabase.from("files").select("tags").eq("household_id", active.household.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <form className="w-full sm:w-auto" role="search">
          {category && <input type="hidden" name="c" value={category} />}
          <label htmlFor="q" className="sr-only">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search documents" className="input w-full sm:w-56" />
        </form>
      </div>
      <Notice error={error} />
      <TagFilter tags={allTags(tagRows)} current={tag} href={(t) => (t ? `/documents?tag=${encodeURIComponent(t)}` : "/documents")} />

      <details className="card" open={!q && !category && docs?.length === 0}>
        <summary className="cursor-pointer font-medium marker:text-muted">Upload a document</summary>
        <form action={uploadDocument} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="file" className="label">File</label>
            <input id="file" name="file" type="file" accept="application/pdf,image/*" required className="text-sm" />
            <p className="mt-1 text-xs text-muted">PDF or image, up to 20 MB.</p>
          </div>
          <DocumentFields category={category} namePlaceholder="Defaults to the file name" />
          <div className="sm:col-span-2">
            <button className="btn">Upload</button>
          </div>
        </form>
      </details>

      <nav className="flex flex-wrap gap-2" aria-label="Categories">
        {chip(undefined, "All")}
        {Object.entries(DOC_CATEGORIES).map(([key, label]) => chip(key as DocCategory, label))}
      </nav>

      {docs?.length === 0 ? (
        <p className="text-sm text-muted">
          {q || category ? "No documents match." : "Keep insurance policies, IDs, the lease and tax papers in one place."}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {docs?.map((d) => {
            const expiry = expiryStatus(d.expires_on, today, "");
            return (
              <li key={d.id}>
                <Link href={`/documents/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.03]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{d.name}</span>
                    <span className="block text-xs text-muted">
                      {DOC_CATEGORIES[d.category as DocCategory] ?? "Other"} · {formatBytes(d.size)}
                    </span>
                    <TagChips tags={d.tags} className="mt-1" />
                  </span>
                  {expiry && <span className={`shrink-0 text-sm ${EXPIRY_TONE[expiry.tone]}`}>{expiry.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
