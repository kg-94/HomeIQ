import type { Metadata } from "next";
import AuthShell from "@/components/auth-shell";
import { acceptInvite } from "@/app/(app)/household/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Join household" };

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ token }, { error }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthShell
      title="You've been invited"
      subtitle={`Join a household on HomeIQ as ${user?.email || `+${user?.phone}`}.`}
      error={error}
    >
      <form action={acceptInvite} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <label htmlFor="member_name" className="label">Your name in this household</label>
          <input id="member_name" name="member_name" defaultValue={user?.user_metadata.full_name ?? ""} required maxLength={80} className="input" />
        </div>
        <button className="btn w-full">Join household</button>
      </form>
    </AuthShell>
  );
}
