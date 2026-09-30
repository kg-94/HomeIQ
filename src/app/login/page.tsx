import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import OAuthButtons from "@/components/oauth-buttons";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next = "/" } = await searchParams;

  return (
    <AuthShell
      title="Welcome to HomeIQ"
      subtitle="Log in or create your account with Google or Discord."
      error={error}
    >
      <OAuthButtons next={next} />
      <p className="mt-5 text-center text-xs text-muted">
        By continuing you agree to the <Link href="/terms" className="link">Terms of Service</Link> and{" "}
        <Link href="/privacy" className="link">Privacy Policy</Link>.
      </p>
    </AuthShell>
  );
}
