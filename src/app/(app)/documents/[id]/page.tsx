import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Notice from "@/components/notice";
import { expiryStatus, EXPIRY_TONE, todayIn } from "@/lib/dates";
import { getHouseholdContext } from "@/lib/household";
import { DOC_CATEGORIES, formatBytes, type DocCategory } from "@/lib/storage";
import { deleteDocument, updateDocument } from "../actions";
import DocumentFields from "../document-fields";

export const metadata: Metadata = { title: "Document" };

// Browsers can't render HEIC, so those get a download link only.
const PREVIEWABLE_IMAGES = ["image/jpeg", "image/png", "image/webp"];

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const { supabase, active } = await getHouseholdContext();
  const { data: doc } = await supabase
    .from("files")
    .select("id, name, mime, size, category, expires_on, created_at")
    .eq("id", id)
    .eq("household_id", active.household.id)
    .eq("kind", "document")
    .maybeSingle();
  if (!doc) notFound();

  const today = todayIn(active.household.timezone);
  const expiry = expiryStatus(doc.expires_on, today, "");
  const src = `/files/${doc.id}`;

  return (
    <div className="space-y-6">
      <Link href="/documents" className="text-sm text-muted hover:text-foreground">← Documents</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{doc.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {DOC_CATEGORIES[doc.category as DocCategory] ?? "Other"} · {formatBytes(doc.size)}
            {expiry && <span className={EXPIRY_TONE[expiry.tone]}> · {expiry.label}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={src} target="_blank" rel="noopener" className="btn-ghost">Open</a>
          <a href={`${src}?download=1`} className="btn-ghost">Download</a>
        </div>
      </div>
      <Notice error={error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {doc.mime === "application/pdf" ? (
            <iframe src={src} title={doc.name} className="h-[75vh] w-full" />
          ) : PREVIEWABLE_IMAGES.includes(doc.mime) ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, nothing to optimise
            <img src={src} alt={doc.name} className="mx-auto max-h-[75vh] object-contain" />
          ) : (
            <p className="p-6 text-sm text-muted">No preview for this file type. Use Download.</p>
          )}
        </div>

        <aside className="space-y-4">
          <form action={updateDocument} className="card grid gap-4">
            <input type="hidden" name="id" value={doc.id} />
            <DocumentFields name={doc.name} category={doc.category} expiresOn={doc.expires_on} />
            <button className="btn">Save</button>
          </form>
          <form action={deleteDocument}>
            <input type="hidden" name="id" value={doc.id} />
            <button className="text-sm text-danger hover:underline">Delete document</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
