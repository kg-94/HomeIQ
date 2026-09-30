import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

export type CategoryKind = "expense" | "income";

/** The household's category names for a picker: alphabetical, "Other" last. */
export async function categoryNames(supabase: SupabaseClient<Database>, householdId: string, kind: CategoryKind) {
  const { data } = await supabase.from("categories").select("name").eq("household_id", householdId).eq("kind", kind);
  return (data ?? [])
    .map((c) => c.name)
    .sort((a, b) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));
}
