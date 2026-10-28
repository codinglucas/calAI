export const DEFAULT_SIGNED_IN_PATH = "/today";

/** Paths reachable without signing in. Everything else requires a session. */
const PUBLIC_PATH_PREFIXES = ["/login", "/signup", "/auth/"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Returns `next` only if it's a same-site path, so `?next=` can't be used to
 * redirect someone to another domain after login (e.g. `//evil.com`).
 */
export function safeNextPath(next: unknown): string {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return DEFAULT_SIGNED_IN_PATH;
  }
  return next;
}
