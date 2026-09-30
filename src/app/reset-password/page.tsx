import type { Metadata } from "next";
import AuthShell from "@/components/auth-shell";
import { resetPassword } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell title="Choose a new password" error={error}>
      <form action={resetPassword} className="space-y-4">
        <div>
          <label htmlFor="password" className="label">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" />
        </div>
        <button className="btn w-full">Save password</button>
      </form>
    </AuthShell>
  );
}
