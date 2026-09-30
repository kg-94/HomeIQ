// Tags are short lowercase labels, entered comma-separated. The DB caps the
// count; this is where they're normalised.

export const MAX_TAGS = 10;

/** "Kitchen, car ,kitchen,, Tax 2026" -> ["kitchen", "car", "tax 2026"] */
export function parseTags(input: unknown): string[] {
  const tags = String(input ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 30))
    .filter(Boolean);
  return [...new Set(tags)].slice(0, MAX_TAGS);
}

/** Every distinct tag across rows, alphabetical (for filter chips). */
export const allTags = (rows: { tags: string[] }[] | null | undefined) =>
  [...new Set((rows ?? []).flatMap((r) => r.tags))].sort();

/** A household icon must be an emoji (or short emoji sequence). */
export function parseIcon(input: unknown): string | null {
  const s = String(input ?? "").trim();
  if (!s) return null;
  return s.length <= 16 && /^\p{Extended_Pictographic}/u.test(s) ? s : null;
}
