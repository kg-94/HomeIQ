import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import OAuthButtons from "@/components/oauth-buttons";
import PhoneInput from "@/components/phone-input";
import { signup } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next = "/" } = await searchParams;
  const loginHref = next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell title="Create your account" subtitle="Run your home together." error={error}>
      <OAuthButtons next={next} />
      <form action={signup} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="name" className="label">Your name</label>
          <input id="name" name="name" autoComplete="name" required maxLength={80} className="input" />
        </div>
        <PhoneInput />
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" />
          <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
        </div>
        <button className="btn w-full">Create account</button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account? <Link href={loginHref} className="link">Log in</Link>
      </p>
    </AuthShell>
  );
}
