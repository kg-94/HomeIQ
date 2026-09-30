import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import PhoneInput from "@/components/phone-input";
import { requestPasswordReset } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell title="Reset your password" subtitle="We'll text you a code." error={error}>
      <form action={requestPasswordReset} className="space-y-4">
        <PhoneInput />
        <button className="btn w-full">Send code</button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Signed up with Google or Discord? Use that button on the{" "}
        <Link href="/login" className="link">log in</Link> page instead.
      </p>
    </AuthShell>
  );
}
