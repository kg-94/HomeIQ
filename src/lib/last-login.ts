// Remembers who last signed in on this device so /login can offer a one-tap
// "Continue as …" and skip provider prompts. Stays after logout on purpose;
// "Not you?" on /login clears it.

export const LAST_LOGIN_COOKIE = "last_login";
export const PROVIDERS = ["google", "discord"] as const;
export type Provider = (typeof PROVIDERS)[number];
export type LastLogin = { provider: Provider; name: string; email: string };

export const encodeLastLogin = (l: LastLogin) => Buffer.from(JSON.stringify(l)).toString("base64url");

export function decodeLastLogin(value: string | undefined): LastLogin | null {
  if (!value) return null;
  try {
    const l = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!PROVIDERS.includes(l.provider)) return null;
    return { provider: l.provider, name: String(l.name ?? "").slice(0, 80), email: String(l.email ?? "").slice(0, 200) };
  } catch {
    return null;
  }
}
