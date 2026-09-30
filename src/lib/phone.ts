/**
 * Normalises user input to E.164 ("+919876543210"), or null if invalid.
 * A bare 10-digit number (optionally with a leading 0) is assumed Indian.
 */
export function toE164(input: string, defaultCountry = "91"): string | null {
  const s = input.replace(/[\s\-().]/g, "").replace(/^00/, "+");
  const e164 = s.startsWith("+")
    ? s
    : /^0?\d{10}$/.test(s)
      ? `+${defaultCountry}${s.slice(-10)}`
      : `+${s}`;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

/** "+919876543210" -> "919876543210", the form auth.users.phone and the JWT use. */
export const toStoredPhone = (e164: string) => e164.slice(1);
