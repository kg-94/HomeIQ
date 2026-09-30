"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getHouseholdContext, HOUSEHOLD_COOKIE } from "@/lib/household";
import { LAST_LOGIN_COOKIE } from "@/lib/last-login";
import { removeHouseholdFiles } from "@/lib/storage";

const back = (key: "error" | "message", text: string) => redirect(`/account?${key}=${encodeURIComponent(text)}`);

/** Your display name in one household (RLS + column grant allow only your own row / this column). */
export async function updateMyName(formData: FormData) {
  const parsed = z
    .object({ household_id: z.guid(), display_name: z.string().trim().min(1, "Name is required").max(80) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("error", parsed.error.issues[0].message);

  const { supabase, user } = await getHouseholdContext();
  const { error } = await supabase
    .from("household_members")
    .update({ display_name: parsed.data.display_name })
    .eq("household_id", parsed.data.household_id)
    .eq("user_id", user.id);
  if (error) return back("error", error.message);
  revalidatePath("/", "layout");
  back("message", "Name updated");
}

/**
 * Deletes the signed-in account. Blocked while they're the only owner of a
 * household other account holders share. Households where they're the only
 * account holder are deleted too (files first; SQL can't remove them).
 */
export async function deleteAccount(formData: FormData) {
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") return back("error", "Type DELETE to confirm");

  const { supabase, user } = await getHouseholdContext();
  const { data: blockers } = await supabase.rpc("account_deletion_blockers");
  if (blockers?.length)
    return back("error", `Transfer ownership of ${blockers.map((b) => `"${b.name}"`).join(", ")} first`);

  const { data: rows } = await supabase.from("household_members").select("household_id, user_id, is_offline");
  const mine = new Set(rows?.filter((r) => r.user_id === user.id).map((r) => r.household_id));
  const soleHouseholds = [...mine].filter(
    (hid) => !rows?.some((r) => r.household_id === hid && r.user_id !== user.id && !r.is_offline),
  );
  for (const hid of soleHouseholds) {
    const fileError = await removeHouseholdFiles(supabase, hid);
    if (fileError) return back("error", fileError);
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return back("error", error.message);

  await supabase.auth.signOut().catch(() => {});
  const jar = await cookies();
  jar.delete(HOUSEHOLD_COOKIE);
  jar.delete(LAST_LOGIN_COOKIE);
  redirect("/login?message=Your account has been deleted");
}
