"use client";

import { Analytics } from "@vercel/analytics/next";
import { redactAnalyticsEvent } from "@/lib/analytics/redact";

/** Cookieless Vercel Web Analytics for public pages only. Rendered by the root
 * layout solely when `NEVORA_WEB_ANALYTICS_ENABLED` is exactly "true"; the
 * script and its beacons are same-origin (`/_vercel/insights/*`), so the
 * existing `script-src`/`connect-src 'self'` policy needs no new origin. */
export function WebAnalytics() {
  return <Analytics beforeSend={redactAnalyticsEvent} />;
}
