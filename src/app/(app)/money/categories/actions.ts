"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getHouseholdContext } from "@/lib/household";

const back = (key: "error" | "message", text: string) => redirect(`/money/categories?${key}=${encodeURIComponent(text)}`);
const name = z.string().trim().min(1, "Enter a name").max(60, "Keep it under 60 characters");
const friendly = (message: string) =>
  /categories_unique_name|duplicate key/.test(message) ? "A category with that name already exists" : message;

export async function addCategory(formData: FormData) {
  const parsed = z.object({ kind: z.enum(["expense", "income"]), name }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("error", parsed.error.issues[0].message);

  const { supabase, active } = await getHouseholdContext();
  const { error } = await supabase.from("categories").insert({ ...parsed.data, household_id: active.household.id });
  if (error) return back("error", friendly(error.message));
  revalidatePath("/money", "layout");
  back("message", `Added “${parsed.data.name}”`);
}

/** Renames the category and every expense, bill and income that uses it. */
export async function renameCategory(formData: FormData) {
  const parsed = z.object({ id: z.guid(), name }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("error", parsed.error.issues[0].message);

  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.rpc("rename_category", { p_id: parsed.data.id, p_name: parsed.data.name });
  if (error) return back("error", friendly(error.message));
  revalidatePath("/", "layout");
  back("message", "Renamed everywhere it's used");
}

/** Deletes a category; its entries move to `move_to` or become uncategorised. */
export async function deleteCategory(formData: FormData) {
  const parsed = z
    .object({ id: z.guid(), move_to: z.union([z.literal(""), z.guid()]).transform((v) => v || null) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("error", parsed.error.issues[0].message);

  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.rpc("delete_category", { p_id: parsed.data.id, p_move_to: parsed.data.move_to! });
  if (error) return back("error", error.message);
  revalidatePath("/", "layout");
  back("message", parsed.data.move_to ? "Deleted and moved its entries" : "Deleted; its entries are now uncategorised");
}
