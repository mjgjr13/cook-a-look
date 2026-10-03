/**
 * Only allow same-site relative paths as post-auth redirect targets
 * (prevents open redirects like ?redirect=//evil.com or https://evil.com).
 */
export const getSafeRedirect = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
};
