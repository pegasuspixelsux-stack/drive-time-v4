// Single source of truth for hosts allowed to serve `next/image` images.
// next.config.ts turns this into `images.remotePatterns`; anywhere a
// user-supplied image URL is accepted (e.g. the inventory Add/Edit form)
// should validate against this same list before it's ever persisted, since
// next/image throws at render time for a host that isn't allow-listed here.
export const ALLOWED_IMAGE_HOSTS = [
  "images.unsplash.com",
  "firebasestorage.googleapis.com",
] as const;

export type AllowedImageHost = (typeof ALLOWED_IMAGE_HOSTS)[number];

/**
 * Returns true when `url` is a syntactically valid absolute URL whose
 * hostname is in ALLOWED_IMAGE_HOSTS.
 */
export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(parsed.hostname);
  } catch {
    return false;
  }
}
