"use client";

import { usePathname } from "next/navigation";

/** MG-009: the Settings section a closed address belongs to, as the sentence's subject ("Locations are", "Branding is").
 * The longest matching path wins, so /app/settings/clocker/pins is "Clocker PINs", not "Clocker tablets". */
const SECTIONS: [path: string, subject: string][] = [
  ["/app/settings/clocker/photos", "Punch photos are"],
  ["/app/settings/clocker/pins", "Clocker PINs are"],
  ["/app/settings/clocker/matching", "Shift matching is"],
  ["/app/settings/clocker", "Clocker tablets are"],
  ["/app/settings/company-policies", "Company policies are"],
  ["/app/settings/workspace", "Company profile is"],
  ["/app/settings/branding", "Branding is"],
  ["/app/settings/features", "Features and team terms are"],
  ["/app/settings/positions", "Positions are"],
  ["/app/settings/breaks", "Break types are"],
  ["/app/settings/payroll", "Payroll settings are"],
];

/** The subject for a Settings address, or null on Settings itself (and on an address this list does not know). */
export function closedSettingsSubject(pathname: string | null, locations = "Locations") {
  const path = (pathname ?? "").replace(/\/+$/, "");
  if (path === "/app/settings/locations" || path.startsWith("/app/settings/locations/")) return `${locations} are`;
  return SECTIONS.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1] ?? null;
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
  const subject = closedSettingsSubject(usePathname(), locations);
  const who = owner ?? "an Owner";
  if (subject) return <>{`${subject} part of Settings, which only Owners can change. Ask ${who}.`}</>;
  return <>{rules ? `You can change scheduling rules. For anything else, ask ${who}.` : owner ? `${owner} can change a setting for you.` : "Ask an Owner if you need a change here."}</>;
}
