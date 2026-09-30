"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { HOUSEHOLD_COOKIE, safeNext } from "@/lib/household";
import { toE164 } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

const fail = (path: string, error: string, params: Record<string, string> = {}) =>
  redirect(`${path}?${new URLSearchParams({ error, ...params })}`);

async function origin() {
  return (await headers()).get("origin") ?? "";
}

const phone = z
  .string()
  .transform((v) => toE164(v) ?? "")
  .pipe(z.string().min(1, "Enter a valid mobile number"));
const password = z.string().min(8, "Password must be at least 8 characters");

export async function login(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const parsed = z
    .object({ phone, password: z.string().min(1, "Enter your password") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("/login", parsed.error.issues[0].message, { next });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail("/login", error.message, { next });

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const parsed = z
    .object({ name: z.string().trim().min(1, "Enter your name").max(80), phone, password })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("/signup", parsed.error.issues[0].message, { next });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    phone: parsed.data.phone,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.name } },
  });
  if (error?.code === "user_already_exists" || error?.code === "phone_exists")
    return fail("/login", "That number already has an account. Log in instead.", { next });
  if (error) return fail("/signup", error.message, { next });

  // No session means "Confirm phone" is on in Supabase: an OTP was sent.
  if (!data.session) redirect(`/verify?${new URLSearchParams({ phone: parsed.data.phone, next })}`);
  revalidatePath("/", "layout");
  redirect(next);
}

export async function verifyPhone(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const parsed = z
    .object({ phone, token: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") })
    .safeParse(Object.fromEntries(formData));
  const params = { phone: String(formData.get("phone")), next };
  if (!parsed.success) return fail("/verify", parsed.error.issues[0].message, params);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ ...parsed.data, type: "sms" });
  if (error) return fail("/verify", error.message, params);

  revalidatePath("/", "layout");
  redirect(next);
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = phone.safeParse(formData.get("phone"));
  if (!parsed.success) return fail("/forgot-password", parsed.error.issues[0].message);

  const supabase = await createClient();
  // Result deliberately ignored: same response whether or not the account exists.
  await supabase.auth.signInWithOtp({ phone: parsed.data, options: { shouldCreateUser: false } });
  redirect(`/verify?${new URLSearchParams({ phone: parsed.data, next: "/reset-password" })}`);
}

export async function resetPassword(formData: FormData) {
  const parsed = password.safeParse(formData.get("password"));
  if (!parsed.success) return fail("/reset-password", parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return fail("/reset-password", error.message);
  redirect("/");
}

export async function oauth(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const provider = z.enum(["google", "discord"]).parse(formData.get("provider"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await origin()}/auth/confirm?${new URLSearchParams({ next })}` },
  });
  if (error) return fail("/login", error.message, { next });
  redirect(data.url);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(HOUSEHOLD_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login");
}
