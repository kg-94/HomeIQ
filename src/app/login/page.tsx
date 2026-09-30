import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import OAuthButtons from "@/components/oauth-buttons";
import PhoneInput from "@/components/phone-input";
import { login } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next = "/" } = await searchParams;
  const signupHref = next === "/" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your household." error={error}>
      <OAuthButtons next={next} />
      <form action={login} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <PhoneInput />
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="label">Password</label>
            <Link href="/forgot-password" className="link text-xs">Forgot?</Link>
          </div>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        <button className="btn w-full">Log in</button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        New here? <Link href={signupHref} className="link">Create an account</Link>
      </p>
    </AuthShell>
  );
}
