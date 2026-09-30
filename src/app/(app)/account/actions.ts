"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getHouseholdContext, HOUSEHOLD_COOKIE } from "@/lib/household";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, AVATAR_TYPES } from "@/lib/avatar";
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

  // Uploaded profile photos (the DB can't remove storage objects).
  const { data: avatars } = await supabase.storage.from(AVATAR_BUCKET).list(user.id);
  if (avatars?.length) await supabase.storage.from(AVATAR_BUCKET).remove(avatars.map((o) => `${user.id}/${o.name}`));

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return back("error", error.message);

  await supabase.auth.signOut().catch(() => {});
  const jar = await cookies();
  jar.delete(HOUSEHOLD_COOKIE);
  jar.delete(LAST_LOGIN_COOKIE);
  redirect("/login?message=Your account has been deleted");
}

/** Upload a profile photo; replaces (and deletes) the previous upload. */
export async function updateAvatar(formData: FormData) {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return back("error", "Choose a photo");
  if (!AVATAR_TYPES.includes(file.type)) return back("error", "Use a JPG, PNG or WebP image");
  if (file.size > AVATAR_MAX_BYTES) return back("error", "Photos can be up to 5 MB");

  const { supabase, user } = await getHouseholdContext();
  const previous = user.user_metadata.custom_avatar_path as string | undefined;
  const path = `${user.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (uploadError) return back("error", uploadError.message);

  const { error } = await supabase.auth.updateUser({ data: { custom_avatar_path: path } });
  if (error) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    return back("error", error.message);
  }
  if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
  revalidatePath("/", "layout");
  back("message", "Photo updated");
}

/** Go back to the Google/Discord photo. */
export async function resetAvatar() {
  const { supabase, user } = await getHouseholdContext();
  const previous = user.user_metadata.custom_avatar_path as string | undefined;
  const { error } = await supabase.auth.updateUser({ data: { custom_avatar_path: null } });
  if (error) return back("error", error.message);
  if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
  revalidatePath("/", "layout");
  back("message", "Using your sign-in photo again");
}
