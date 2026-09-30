"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getHouseholdContext } from "@/lib/household";

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
