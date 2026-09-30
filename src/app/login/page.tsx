import type { Metadata } from "next";
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
    </AuthShell>
  );
}
