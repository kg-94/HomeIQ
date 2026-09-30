import type { Metadata } from "next";
import AuthShell from "@/components/auth-shell";
import { createHousehold } from "@/app/(app)/household/actions";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set up your household" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthShell
      title="Set up your household"
      subtitle="You can invite everyone else next. Got an invite link? Open it instead."
      error={error}
    >
      <form action={createHousehold} className="space-y-4">
        <div>
          <label htmlFor="household_name" className="label">Household name</label>
          <input id="household_name" name="household_name" placeholder="e.g. Green Park flat" required maxLength={80} className="input" />
        </div>
        <div>
          <label htmlFor="member_name" className="label">Your name</label>
          <input id="member_name" name="member_name" defaultValue={user?.user_metadata.full_name ?? ""} required maxLength={80} className="input" />
        </div>
        <div>
          <label htmlFor="household_currency" className="label">Currency</label>
          <input id="household_currency" name="household_currency" defaultValue="INR" required maxLength={3} className="input uppercase" />
        </div>
        <button className="btn w-full">Create household</button>
      </form>
      <form action={logout} className="mt-5 text-center">
        <button className="text-sm text-muted hover:underline">Log out</button>
      </form>
    </AuthShell>
  );
}
