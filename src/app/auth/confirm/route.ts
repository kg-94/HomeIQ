import { type EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { safeNext } from "@/lib/household";
import { encodeLastLogin, LAST_LOGIN_COOKIE, PROVIDERS, type Provider } from "@/lib/last-login";
import { createClient } from "@/lib/supabase/server";

// OAuth callback (Google/Discord) and landing page for any Supabase auth link.
// Handles both the default PKCE link (?code=) and token_hash templates.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  // Provider refused (e.g. Discord with prompt=none after the user revoked the
  // app): send them back with consent=1 so the next attempt shows the approval screen.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    redirect(`/login?${new URLSearchParams({ error: `Sign-in wasn't completed: ${providerError}. Please try again.`, consent: "1", next })}`);
  }

  const supabase = await createClient();
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const provider = data.user.app_metadata.provider as Provider;
      if (PROVIDERS.includes(provider)) {
        (await cookies()).set(
          LAST_LOGIN_COOKIE,
          encodeLastLogin({
            provider,
            name: data.user.user_metadata.full_name ?? data.user.user_metadata.name ?? "",
            email: data.user.email ?? "",
          }),
          { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 },
        );
      }
      redirect(next);
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
  }

  redirect("/login?error=That link is invalid or has expired");
}
