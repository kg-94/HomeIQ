import type { User } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** Uploaded photo first (user_metadata.custom_avatar_path), then Google/Discord's. */
export function avatarUrl(user: User): string | undefined {
  const custom = user.user_metadata.custom_avatar_path as string | undefined;
  if (custom) return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${custom}`;
  return user.user_metadata.avatar_url ?? user.user_metadata.picture;
}
