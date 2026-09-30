import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

// Mirrors the household-files bucket config in the inventory migration.
export const BUCKET = "household-files";
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
export const FILE_KINDS = ["receipt", "manual", "photo", "document"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

// Documents-vault categories; keys mirror the files.category check constraint.
export const DOC_CATEGORIES = {
  insurance: "Insurance",
  property: "Property",
  identity: "ID & personal",
  vehicle: "Vehicle",
  tax: "Tax & finance",
  medical: "Medical",
  contract: "Contracts & rentals",
  other: "Other",
} as const;
export type DocCategory = keyof typeof DOC_CATEGORIES;

type Client = SupabaseClient<Database>;

/**
 * Uploads to "<household>/<file id>" and records the row. Returns an error
 * message, or null on success. Storage RLS re-checks membership.
 */
export async function uploadFile(
  supabase: Client,
  opts: {
    householdId: string;
    file: File;
    kind: FileKind;
    itemId?: string | null;
    name?: string | null;
    category?: DocCategory | null;
    expiresOn?: string | null;
  },
): Promise<string | null> {
  const { householdId, file, kind, itemId = null, category = null, expiresOn = null } = opts;
  if (!file || file.size === 0) return "Choose a file";
  if (file.size > MAX_FILE_BYTES) return "Files can be up to 20 MB";
  if (!ALLOWED_MIME.includes(file.type)) return "Upload a PDF or an image (JPG, PNG, WebP, HEIC)";

  const id = crypto.randomUUID();
  const storage_path = `${householdId}/${id}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storage_path, file, { contentType: file.type });
  if (uploadError) return uploadError.message;

  const { error } = await supabase.from("files").insert({
    id,
    household_id: householdId,
    item_id: itemId,
    kind,
    name: (opts.name || file.name).slice(0, 200) || "file",
    mime: file.type,
    size: file.size,
    storage_path,
    category,
    expires_on: expiresOn,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([storage_path]);
    return error.message;
  }
  return null;
}

/** Removes objects first (SQL can't), then rows. */
export async function deleteFiles(supabase: Client, files: { id: string; storage_path: string }[]) {
  if (files.length === 0) return null;
  const { error } = await supabase.storage.from(BUCKET).remove(files.map((f) => f.storage_path));
  if (error) return error.message;
  const { error: rowError } = await supabase.from("files").delete().in("id", files.map((f) => f.id));
  return rowError?.message ?? null;
}

export const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
