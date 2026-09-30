import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import OAuthButtons from "@/components/oauth-buttons";
import { forgetDevice } from "@/app/auth/actions";
import { decodeLastLogin, LAST_LOGIN_COOKIE } from "@/lib/last-login";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string; consent?: string }>;
}) {
  const { error, message, next = "/", consent } = await searchParams;
  const last = decodeLastLogin((await cookies()).get(LAST_LOGIN_COOKIE)?.value);
  const firstName = last?.name.split(" ")[0];

  return (
    <AuthShell
      title={last ? `Welcome back${firstName ? `, ${firstName}` : ""}` : "Welcome to HomeIQ"}
      subtitle={last ? (last.email ? `Continue as ${last.email}` : undefined) : "Log in or create your account with Google or Discord."}
      error={error}
      message={message}
    >
      <OAuthButtons next={next} primary={last?.provider} consent={consent === "1"} />
      {last && (
        <form action={forgetDevice} className="mt-4 text-center">
          <button className="-my-2 py-2 text-sm text-muted hover:text-foreground hover:underline">
            Not you? Use a different account
          </button>
        </form>
      )}
      <p className="mt-5 text-center text-xs text-muted">
        By continuing you agree to the <Link href="/terms" className="link">Terms of Service</Link> and{" "}
        <Link href="/privacy" className="link">Privacy Policy</Link>.
      </p>
    </AuthShell>
  );
}
