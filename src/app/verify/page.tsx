import type { Metadata } from "next";
import AuthShell from "@/components/auth-shell";
import { verifyPhone } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Enter code" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; phone?: string; next?: string }>;
}) {
  const { error, phone = "", next = "/" } = await searchParams;

  return (
    <AuthShell title="Enter your code" subtitle={`We sent a 6-digit code to ${phone}.`} error={error}>
      <form action={verifyPhone} className="space-y-4">
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="token" className="label">Code</label>
          <input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            className="input text-center font-mono text-lg tracking-[0.5em]"
          />
        </div>
        <button className="btn w-full">Verify</button>
      </form>
    </AuthShell>
  );
}
