"use client";

import { usePathname } from "next/navigation";
import { usePortalLang, type PortalLang } from "@/lib/i18n/portal-lang";
import { SETTINGS_COPY } from "./settings-copy";

/** MG-009: the Settings section a closed address belongs to, as the sentence's subject ("Locations are", "Branding is").
 * The longest matching path wins, so /app/settings/clocker/pins is "Clocker PINs", not "Clocker tablets". The words are
 * in SETTINGS_COPY.subjects, in English and Spanish. */
const SECTIONS = ["/app/settings/clocker/photos", "/app/settings/clocker/pins", "/app/settings/clocker/matching", "/app/settings/clocker",
  "/app/settings/company-policies", "/app/settings/workspace", "/app/settings/branding", "/app/settings/features",
  "/app/settings/positions", "/app/settings/breaks", "/app/settings/payroll"];

/** The subject for a Settings address, or null on Settings itself (and on an address this list does not know). */
export function closedSettingsSubject(pathname: string | null, locations?: string, lang: PortalLang = "en") {
  const path = (pathname ?? "").replace(/\/+$/, ""), t = SETTINGS_COPY[lang];
  if (path === "/app/settings/locations" || path.startsWith("/app/settings/locations/")) return t.locationsAre(locations ?? (lang === "es" ? "Localidades" : "Locations"));
  const prefix = SECTIONS.find(prefix => path === prefix || path.startsWith(`${prefix}/`));
  return prefix ? t.subjects[prefix] : null;
}

/** Review Nov 11 (MG-002, MG-009): the sentence on Settings when it is closed to a Manager. On Settings itself it says
 * what the Manager can change and who to ask for the rest; on a page under it, it names that page. The layout cannot see
 * the address, so this reads it in the browser's router (the same words are rendered on the server). */
export function ClosedSettingsLine({ owner, rules, locations }: {
  /** "Jose Natal", or "Jose Natal or Ana Colon"; null when no Owner's name could be read. */
  owner: string | null;
  /** This Manager can open Scheduling rules. */
  rules: boolean;
  /** The company's word for its locations ("Stores"). */
  locations?: string;
}) {
  const lang = usePortalLang(), t = SETTINGS_COPY[lang];
  const subject = closedSettingsSubject(usePathname(), locations, lang);
  if (subject) return <>{t.closedSubject(subject, owner)}</>;
  return <>{rules ? t.closedRules(owner) : owner ? t.closedOwner(owner) : t.askAnOwner}</>;
}
