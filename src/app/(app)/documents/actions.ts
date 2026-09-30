"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getHouseholdContext } from "@/lib/household";
import { parseTags } from "@/lib/tags";
import { DOC_CATEGORIES, deleteFiles, uploadFile, type DocCategory } from "@/lib/storage";

const meta = z.object({
  name: z.string().trim().max(200).transform((v) => v || null),
  category: z.enum(Object.keys(DOC_CATEGORIES) as [DocCategory, ...DocCategory[]]),
  expires_on: z.union([z.literal(""), z.iso.date()]).transform((v) => v || null),
  tags: z.unknown().transform(parseTags),
});

const back = (path: string, error: string) => redirect(`${path}?error=${encodeURIComponent(error)}`);

export async function uploadDocument(formData: FormData) {
  const parsed = meta.safeParse(Object.fromEntries(formData));
  const file = formData.get("file");
  if (!parsed.success) return back("/documents", parsed.error.issues[0].message);
  if (!(file instanceof File)) return back("/documents", "Choose a file");

  const { supabase, active } = await getHouseholdContext();
  const error = await uploadFile(supabase, {
    householdId: active.household.id,
    file,
    kind: "document",
    name: parsed.data.name,
    category: parsed.data.category,
    expiresOn: parsed.data.expires_on,
    tags: parsed.data.tags,
  });
  if (error) return back("/documents", error);
  revalidatePath("/", "layout");
  redirect(`/documents?c=${parsed.data.category}`);
}

export async function updateDocument(formData: FormData) {
  const id = String(formData.get("id"));
  const parsed = meta.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back(`/documents/${id}`, parsed.error.issues[0].message);

  const { supabase } = await getHouseholdContext();
  const { name, ...rest } = parsed.data;
  const { error } = await supabase
    .from("files")
    .update({ ...rest, ...(name && { name }) })
    .eq("id", id);
  if (error) return back(`/documents/${id}`, error.message);
  revalidatePath("/", "layout");
  redirect(`/documents/${id}`);
}

export async function deleteDocument(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await getHouseholdContext();
  const { data: file } = await supabase.from("files").select("id, storage_path").eq("id", id).maybeSingle();
  const error = await deleteFiles(supabase, file ? [file] : []);
  if (error) return back(`/documents/${id}`, error);
  revalidatePath("/", "layout");
  redirect("/documents");
}
