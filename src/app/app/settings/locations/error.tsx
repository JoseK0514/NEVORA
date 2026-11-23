"use client";

import { BRouteError } from "@/components/owner-b/b-route-error";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { SETTINGS_COPY } from "../settings-copy";

/** Locations couldn't be read: say so, offer one retry, and a way back. Nothing was changed.
 * Phase 2 (package D): the one Direction B route error screen; the words and both actions are unchanged. */
export default function LocationsError({ reset, retry }: { error?: Error & { digest?: string }; reset: () => void; retry?: () => void }) {
  // Final fixes S2 (G85, J5): the error page carries the page's own name, and no line explaining what the page is for.
  const lang = usePortalLang(), t = SETTINGS_COPY[lang];
  return <BRouteError title={lang === "es" ? "Localidades" : "Locations"}
    spoken={t.locationsErrorSpoken}
    cardTitle={t.locationsErrorTitle} line={t.locationsErrorLine}
    onRetry={() => (retry ?? reset)()} away={{ href: "/app/settings", label: t.backToSettings }} />;
}
