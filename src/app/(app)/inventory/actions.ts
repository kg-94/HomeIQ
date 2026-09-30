"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getHouseholdContext, safeNext } from "@/lib/household";
import { deleteFiles, FILE_KINDS, uploadFile } from "@/lib/storage";

const optional = (max: number) => z.string().trim().max(max).transform((v) => v || null);
const optionalDate = z.union([z.literal(""), z.iso.date()]).transform((v) => v || null);

const item = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  category: optional(60),
  location: optional(60),
  brand: optional(60),
  model: optional(60),
  serial_number: optional(100),
  purchased_on: optionalDate,
  warranty_expires_on: optionalDate,
  price: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().nonnegative("Price can't be negative").multipleOf(0.01, "Price has too many decimals").nullable()),
  notes: optional(2000),
});

const back = (path: string, error: string) => redirect(`${path}?error=${encodeURIComponent(error)}`);

export async function createItem(formData: FormData) {
  const parsed = item.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("/inventory", parsed.error.issues[0].message);

  const { supabase, active } = await getHouseholdContext();
  const { data, error } = await supabase
    .from("items")
    .insert({ ...parsed.data, household_id: active.household.id })
    .select("id")
    .single();
  if (error) return back("/inventory", error.message);

  // Optional receipt uploaded with the new item.
  const receipt = formData.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    const uploadError = await uploadFile(supabase, {
      householdId: active.household.id,
      file: receipt,
      kind: "receipt",
      itemId: data.id,
    });
    if (uploadError) return back(`/inventory/${data.id}`, `Item saved, but the receipt failed: ${uploadError}`);
  }

  revalidatePath("/", "layout");
  redirect(`/inventory/${data.id}`);
}

export async function updateItem(formData: FormData) {
  const id = String(formData.get("id"));
  const parsed = item.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back(`/inventory/${id}`, parsed.error.issues[0].message);

  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.from("items").update(parsed.data).eq("id", id);
  if (error) return back(`/inventory/${id}`, error.message);
  revalidatePath("/", "layout");
  redirect(`/inventory/${id}`);
}

export async function deleteItem(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await getHouseholdContext();

  const { data: files } = await supabase.from("files").select("id, storage_path").eq("item_id", id);
  const fileError = await deleteFiles(supabase, files ?? []);
  if (fileError) return back(`/inventory/${id}`, fileError);

  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) return back(`/inventory/${id}`, error.message);
  revalidatePath("/", "layout");
  redirect("/inventory");
}

export async function uploadItemFile(formData: FormData) {
  const itemId = String(formData.get("item_id"));
  const kind = z.enum(FILE_KINDS).safeParse(formData.get("kind"));
  const file = formData.get("file");
  if (!kind.success || !(file instanceof File)) return back(`/inventory/${itemId}`, "Choose a file");

  const { supabase, active } = await getHouseholdContext();
  const error = await uploadFile(supabase, { householdId: active.household.id, file, kind: kind.data, itemId });
  if (error) return back(`/inventory/${itemId}`, error);
  revalidatePath(`/inventory/${itemId}`);
}

export async function deleteFile(formData: FormData) {
  const id = String(formData.get("id"));
  const back_to = safeNext(formData.get("back_to"), "/inventory");
  const { supabase } = await getHouseholdContext();

  const { data: file } = await supabase.from("files").select("id, storage_path").eq("id", id).maybeSingle();
  const error = await deleteFiles(supabase, file ? [file] : []);
  if (error) return back(back_to, error);
  revalidatePath(back_to);
}
