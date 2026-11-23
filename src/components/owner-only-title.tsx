"use client";

import { usePathname } from "next/navigation";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { OWNER_ONLY_COPY } from "./owner-only-copy";

/** Closed Settings pages that name themselves on the band. Final verification F (F09) names Shift matching, as every
 * page closed for company-wide access names itself (Christmas bonus hours, Employee profile). The other Settings pages
 * keep "Settings" until the Settings layout passes their names (Locations needs the company's own word, which only the
 * layout reads): see the F09 note for the Settings package. */
const NAMED: [path: string, name: "shiftMatching"][] = [["/app/settings/clocker/matching", "shiftMatching"]];

/** The band title of a closed Settings page. The Settings layout that draws the notice cannot see the address, so the
 * name is read in the browser's router, as the notice's sentence is (ClosedSettingsLine); rendered on the server too. */
export function ClosedSettingsTitle() {
  const path = (usePathname() ?? "").replace(/\/+$/, ""), t = OWNER_ONLY_COPY[usePortalLang()];
  const named = NAMED.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1];
  return <>{named ? t[named] : t.settings}</>;
}
