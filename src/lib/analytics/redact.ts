import type { BeforeSendEvent } from "@vercel/analytics/next";

/** Public pages whose visits may be counted. Everything else, including the
 * signed-in portal (`/app`), the kiosk (`/clocker`), APIs and previews, is
 * never reported. An allowlist keeps a new private route out of analytics by
 * default instead of relying on someone remembering to exclude it. */
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/activate",
  "/forgot-access",
  "/reset-access",
  "/welcome",
  "/privacy",
  "/terms",
  "/support",
  "/account-deletion",
  "/access-help",
]);
const HELP_TOPIC = /^\/access-help\/[a-z0-9-]{1,64}$/;

/** Reduce a page-view URL to a countable public path, or `null` to drop it.
 *
 * Query strings and fragments are always removed: activation, reset and
 * return-to links can carry one-time codes or internal destinations. Paths
 * outside the public allowlist return `null`, so employee IDs, location IDs and
 * other workspace identifiers in portal URLs never leave the browser. Invalid
 * URLs are dropped rather than reported. */
export function publicAnalyticsUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const path = parsed.pathname.length > 1 ? parsed.pathname.replace(/\/+$/, "") : parsed.pathname;
  if (!PUBLIC_PATHS.has(path) && !HELP_TOPIC.test(path)) return null;
  return parsed.origin + path;
}

/** `beforeSend` hook for Vercel Web Analytics: counts only public page views,
 * and drops custom events, which NEVORA does not send. */
export function redactAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  if (event.type !== "pageview") return null;
  const url = publicAnalyticsUrl(event.url);
  return url ? { ...event, url } : null;
}
