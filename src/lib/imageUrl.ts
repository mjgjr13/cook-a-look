const STORAGE_OBJECT = "/storage/v1/object/public/";
const STORAGE_RENDER = "/storage/v1/render/image/public/";

/**
 * For images in Supabase public storage, returns a resized/compressed URL via
 * Supabase image transformations (served as WebP when the browser supports it).
 * Advisor photos are uploaded at full camera size (up to ~2.5MB); this cuts
 * them to ~15-40KB. Other URLs are returned unchanged.
 *
 * Always crops to cover the given box, since width-only resizing keeps the
 * original height. Pair with an onError fallback to the original URL.
 */
export const optimizedImageUrl = (url: string | null | undefined, width: number, height: number, quality = 70) => {
  if (!url) return url ?? undefined;
  if (!url.includes(STORAGE_OBJECT) || url.includes("?")) return url;
  return `${url.replace(STORAGE_OBJECT, STORAGE_RENDER)}?width=${width}&height=${height}&resize=cover&quality=${quality}`;
};

/** onError handler: fall back to the original image once if the optimized one fails. */
export const fallbackToOriginal = (original: string | null | undefined) => (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  if (original && img.src !== original) img.src = original;
};
