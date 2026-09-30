// Sign-in providers (Supabase OAuth). One place for the list, labels and wording.

/**
 * Facebook login ships switched off: flip to true once the Meta app is Live and
 * the Facebook provider is enabled in Supabase. Until then the button is hidden,
 * the server refuses it, and the policies don't mention Facebook.
 */
export const FACEBOOK_LOGIN = false;

export const PROVIDERS = ["google", "discord", "facebook"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABEL: Record<Provider, string> = { google: "Google", discord: "Discord", facebook: "Facebook" };

export const ENABLED_PROVIDERS = PROVIDERS.filter((p) => p !== "facebook" || FACEBOOK_LOGIN) as [Provider, ...Provider[]];

/** "Google or Discord" / "Google, Discord or Facebook" for UI and policy text. */
export function providerList(): string {
  const names = ENABLED_PROVIDERS.map((p) => PROVIDER_LABEL[p]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : names[0];
}
