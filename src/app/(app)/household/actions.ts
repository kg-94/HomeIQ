"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getHouseholdContext, HOUSEHOLD_COOKIE } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";

const name = z.string().trim().min(1, "Name is required").max(80);
const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code");

async function setActive(hid: string) {
  (await cookies()).set(HOUSEHOLD_COOKIE, hid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

const back = (path: string, key: "error" | "message", text: string) =>
  redirect(`${path}?${key}=${encodeURIComponent(text)}`);

export async function createHousehold(formData: FormData) {
  const parsed = z
    .object({ household_name: name, member_name: name, household_currency: currency })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("/onboarding", "error", parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data: hid, error } = await supabase.rpc("create_household", parsed.data);
  if (error) return back("/onboarding", "error", error.message);

  await setActive(hid);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function switchHousehold(formData: FormData) {
  // Safe to trust: getHouseholdContext ignores a cookie the user isn't a member of.
  await setActive(String(formData.get("household_id")));
  revalidatePath("/", "layout");
  redirect("/");
}

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token"));
  const parsed = name.safeParse(formData.get("member_name"));
  if (!parsed.success) return back(`/invite/${token}`, "error", parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data: hid, error } = await supabase.rpc("accept_invite", {
    invite_token: token,
    member_name: parsed.data,
  });
  if (error) return back(`/invite/${token}`, "error", error.message);

  await setActive(hid);
  revalidatePath("/", "layout");
  redirect("/");
}

/** Invite by the email of the person's Google/Discord account. */
export async function createInvite(formData: FormData) {
  const parsed = z.string().trim().toLowerCase().email("Enter a valid email").safeParse(formData.get("email"));
  if (!parsed.success) return back("/household", "error", parsed.error.issues[0].message);

  const { supabase, active } = await getHouseholdContext();
  const { error } = await supabase
    .from("household_invites")
    .insert({ household_id: active.household.id, email: parsed.data });
  if (error) return back("/household", "error", error.message);

  revalidatePath("/household");
  back("/household", "message", `Invite created for ${parsed.data}. Copy the link below and send it to them.`);
}

export async function revokeInvite(formData: FormData) {
  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.from("household_invites").delete().eq("id", String(formData.get("id")));
  if (error) return back("/household", "error", error.message);
  revalidatePath("/household");
}

export async function renameHousehold(formData: FormData) {
  const parsed = z.object({ name, currency }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("/household", "error", parsed.error.issues[0].message);

  const { supabase, active } = await getHouseholdContext();
  const { error } = await supabase.from("households").update(parsed.data).eq("id", active.household.id);
  if (error) return back("/household", "error", error.message);
  revalidatePath("/", "layout");
  back("/household", "message", "Household updated");
}

/** Owner removes a member, or a member removes themselves (leave). */
export async function removeMember(formData: FormData) {
  const { supabase, user, active } = await getHouseholdContext();
  const userId = String(formData.get("user_id"));
  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("household_id", active.household.id)
    .eq("user_id", userId);
  if (error) return back("/household", "error", error.message);

  revalidatePath("/", "layout");
  if (userId === user.id) {
    (await cookies()).delete(HOUSEHOLD_COOKIE);
    redirect("/");
  }
}
