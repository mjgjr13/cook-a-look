/**
 * Returns an absolute http(s) URL for user-entered links (portfolio, social),
 * or null if the value isn't a safe web link. Blocks javascript:, data:, and
 * other schemes that would run code when clicked (stored XSS, audit SEC-03).
 * Bare domains like "example.com/me" are treated as https.
 */
export const safeExternalUrl = (value: string | null | undefined): string | null => {
  const raw = value?.trim();
  if (!raw) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};
