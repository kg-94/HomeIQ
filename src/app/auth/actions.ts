"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { HOUSEHOLD_COOKIE, safeNext } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";

// Google / Discord only: the first OAuth login creates the account.
export async function oauth(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const provider = z.enum(["google", "discord"]).parse(formData.get("provider"));
  const origin = (await headers()).get("origin") ?? "";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/confirm?${new URLSearchParams({ next })}` },
  });
  if (error) redirect(`/login?${new URLSearchParams({ error: error.message, next })}`);
  redirect(data.url);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(HOUSEHOLD_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login");
}
