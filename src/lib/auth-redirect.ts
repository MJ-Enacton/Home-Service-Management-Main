export function getSafeNext(value: string | null): string | null {
  if (!value) return null;
  try {
    // Must be internal path, not protocol-relative // or absolute URL
    if (!value.startsWith("/") || value.startsWith("//")) return null;
    const url = new URL(value, "http://localhost");
    if (url.pathname !== value && url.pathname + url.search !== value) {
      // Handles cases like /services/123?x=1 — allow pathname+search only
      // If parsing changes it, reject.
      if (url.search && !value.includes("?")) return null;
    }
    // Block //evil and javascript:
    if (value.includes(":") && !value.startsWith("/services/") && !value.startsWith("/allservices") && !value.startsWith("/my-bookings")) {
      // allow only known internal prefixes to avoid open redirect via /:something
      // But simpler: reject any : in path (except our ids are uuid without :)
      if (value.includes(":")) return null;
    }
    return value;
  } catch {
    return null;
  }
}
