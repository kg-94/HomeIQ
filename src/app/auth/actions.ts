"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { HOUSEHOLD_COOKIE, safeNext } from "@/lib/household";
import { decodeLastLogin, LAST_LOGIN_COOKIE } from "@/lib/last-login";
import { ENABLED_PROVIDERS } from "@/lib/providers";
import { createClient } from "@/lib/supabase/server";

// OAuth only (see lib/providers): the first login creates the account.
export async function oauth(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const provider = z.enum(ENABLED_PROVIDERS).parse(formData.get("provider"));
  const origin = (await headers()).get("origin") ?? "";

  // Returning user on this device: skip Discord's approval screen and
  // pre-select their Google account. consent=1 means the skip just failed.
  const last = decodeLastLogin((await cookies()).get(LAST_LOGIN_COOKIE)?.value);
  const queryParams: Record<string, string> = {};
  if (last?.provider === provider) {
    if (provider === "discord" && formData.get("consent") !== "1") queryParams.prompt = "none";
    if (provider === "google" && last.email) queryParams.login_hint = last.email;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/confirm?${new URLSearchParams({ next })}`, queryParams },
  });
  if (error) redirect(`/login?${new URLSearchParams({ error: error.message, next })}`);
  redirect(data.url);
}

/** "Not you?" on /login: forget the remembered account on this device. */
export async function forgetDevice() {
  (await cookies()).delete(LAST_LOGIN_COOKIE);
  redirect("/login");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(HOUSEHOLD_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login");
}
