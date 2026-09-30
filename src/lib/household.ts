import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const HOUSEHOLD_COOKIE = "hid";

export type Membership = {
  role: "owner" | "member";
  display_name: string;
  household: { id: string; name: string; currency: string; timezone: string; icon: string | null; tags: string[] };
};

/** "🏡 Green Park Flat"; households without an icon get 🏠. */
export const householdLabel = (h: { name: string; icon?: string | null }) => `${h.icon ?? "🏠"} ${h.name}`;

/** Only allow same-origin relative redirects (blocks `//evil.com`). */
export function safeNext(next: unknown, fallback = "/") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : fallback;
}

/**
 * The signed-in user's memberships and the active one (from the `hid` cookie,
 * falling back to the first). Redirects to /onboarding if they have none.
 */
export async function getHouseholdContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("household_members")
    .select("role, display_name, household:households!inner(id, name, currency, timezone, icon, tags)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw error;

  const memberships = data as unknown as Membership[];
  if (memberships.length === 0) redirect("/onboarding");

  const hid = (await cookies()).get(HOUSEHOLD_COOKIE)?.value;
  const active = memberships.find((m) => m.household.id === hid) ?? memberships[0];

  return { supabase, user, memberships, active };
}
