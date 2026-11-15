"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { BLoadingScreen, type BLoadingShape } from "./b-kit";

/* Phase 2 (package D): which frame a page's loading placeholder keeps. One table for every role, read by the route's
 * loading.tsx (CorpSkeleton) and by the access check (ScopedReadFrame), so a tab tap and the check that follows look the
 * same. Each entry is the page's frame on tablets and desktop: where its band ends (b-tokens.css: short 196, sub 224,
 * strip 296), whether it has a back link, a sub-line, a strip or a band action, how wide its content is, whether its
 * first card overlaps the band, and the cards it opens with. A main tab without `band` keeps its own loaded height
 * (b-foundation.css, --b-ph-band). A title is written only where the page's title is a fixed word; otherwise the title
 * the page showed last time is used (kept in memory by CorpMotion), or a bar. Presentation only: nothing is read. */
type Entry = [string | RegExp, BLoadingShape];
const form: BLoadingShape = { back: true, band: "short", frame: "read", lift: false, cards: [{ head: true, lines: 4 }] };
const detail: BLoadingShape = { back: true, sub: true, band: "sub", frame: "read", lift: false, cards: [{ head: true, lines: 3 }, { rows: 3 }] };
const fallback: BLoadingShape = { band: "short", frame: "read", lift: false, cards: [{ head: true, lines: 3 }, { rows: 3 }] };

/* Follow-up (Nov 15): the frames below are the settled ones from packages A (Owner, Manager) and B (Employee, Lead):
 * title top 88 without a back row and 130 with one, the band rung, the content width and whether the first card lifts. */
const titled: BLoadingShape = { band: "short", frame: "read", lift: false, cards: [{ head: true, lines: 4 }] };
const MANAGEMENT: Entry[] = [
  ["/app/inbox", { title: "Things to do", strip: true, band: "strip", frame: "rail", cards: [{ rows: 4, avatar: true }, { rows: 3, avatar: true }] }],
  ["/app/schedule/templates", { ...form, title: "Week templates", cards: [{ rows: 3 }] }],
  ["/app/schedule/settings", { ...detail, title: "Scheduling rules", cards: [{ head: true, lines: 4 }] }],
  // Add shift, Edit shift and Build and publish: the title at 88 (no back row), band 196.
  ["/app/schedule/new", { ...titled, title: "Add shift" }],
  ["/app/schedule/edit", { ...titled, title: "Edit shift" }],
  ["/app/schedule/publish", { ...titled, title: "Build and publish" }],
  ["/app/schedule/copy-receipt", { ...form, title: "Copy week" }],
  [/^\/app\/schedule\/.+/, form],
  ["/app/schedule", { title: "Schedule", sub: true, strip: true, action: true, band: "strip", frame: "wide", cards: [{ head: true, rows: 6, avatar: true }] }],
  ["/app/timecards/corrections", { ...detail, title: "Time corrections", cards: [{ rows: 4, avatar: true }] }],
  ["/app/timecards", { title: "Timecards", sub: true, strip: true, band: "strip", frame: "wide", cards: [{ head: true, rows: 6, avatar: true }] }],
  // Time exports and Payroll settings carry the Payroll tabs: title at 88, band 296, cards 24px under it.
  ["/app/payroll-export", { title: "Time exports", sub: true, strip: true, band: "strip", frame: "read", lift: false, cards: [{ head: true, lines: 3 }, { rows: 3 }] }],
  [/^\/app\/payroll\/.+/, { back: true, band: "short", frame: "read", lift: false, cards: [{ head: true, lines: 3 }, { rows: 3 }] }],
  // Payroll: a title, its scope line and the tabs, on the strip rung (the frequency line is hidden from 768px).
  ["/app/payroll", { title: "Payroll", sub: true, strip: true, band: "strip", frame: "read", cards: [{ head: true, lines: 3 }, { rows: 3 }] }],
  ["/app/employees/new", { ...detail, cards: [{ head: true, lines: 4 }] }],
  ["/app/employees/import", form],
  [/^\/app\/employees\/.+/, detail],
  // Team: Home's two columns from 1024px (People, then the Team tools rail), one column on tablets.
  ["/app/employees", { sub: true, strip: true, action: true, band: "strip", frame: "rail-desktop", cards: [{ rows: 8, avatar: true }, { rail: true, rows: 5 }] }],
  ["/app/reports", { title: "Insights", band: "short", frame: "wide", lift: false, cards: [{ head: true, stats: 3 }, { head: true, lines: 3 }] }],
  ["/app/updates/compose", titled],
  [/^\/app\/updates\/.+/, form],
  ["/app/updates", { title: "Updates", back: true, strip: true, action: true, band: "strip", frame: "read", lift: false, cards: [{ rows: 3 }] }],
  ["/app/notifications", { title: "Notifications", back: true, strip: true, band: "strip", frame: "read", lift: false, cards: [{ rows: 4 }] }],
  ["/app/requests", { back: true, strip: true, band: "strip", frame: "read", lift: false, cards: [{ rows: 4, avatar: true }] }],
  ["/app/exchange", { back: true, strip: true, band: "strip", frame: "read", lift: false, cards: [{ rows: 4, avatar: true }] }],
  ["/app/availability", { back: true, strip: true, band: "strip", frame: "read", lift: false, cards: [{ rows: 5, avatar: true }] }],
  ["/app/settings/payroll", { title: "Payroll settings", sub: true, strip: true, band: "strip", frame: "read", lift: false, cards: [{ head: true, lines: 4 }] }],
  [/^\/app\/settings\/.+/, form],
  ["/app/settings", { title: "Settings", band: "short", frame: "pair", lift: false, cards: [{ rows: 3 }, { rows: 4 }] }],
  ["/app/account-recovery", detail],
  ["/app/more", { title: "More", back: true, band: "short", frame: "read", lift: false, cards: [{ rows: 5 }] }],
  ["/app/help", { title: "Help", back: true, band: "short", frame: "read", lift: false, cards: [{ rows: 6 }] }],
  ["/app/my-pay", { back: true, band: "short", frame: "read", lift: false, cards: [{ head: true, lines: 3 }, { head: true, rows: 2 }] }],
  ["/app/profile", { band: "short", frame: "read", lift: false, cards: [{ rows: 2, avatar: true }, { rows: 4 }] }],
  ["/app/restricted", { ...fallback, back: true }],
];
const managementHome: BLoadingShape = { sub: true, strip: "figures", frame: "rail", cards: [{ head: true, rows: 5, avatar: true }, { rail: true, head: true, lines: 3 }, { rail: true, head: true, stats: 3 }] };

/* Employee and Lead. Home, Time, Pay and Requests keep the shell's own height (363; package B sets --b-ph-band for them in
 * employee-b-desktop.css), so they carry no `band` here. */
const EMPLOYEE: Entry[] = [
  ["/app/schedule", { title: "Schedule", sub: true, strip: true, band: "strip", frame: "wide", cards: [{ head: true, rows: 5 }] }],
  ["/app/my-time", { title: "Time", sub: true, strip: "figures", action: true, frame: "rail", cards: [{ head: true, lines: 2 }, { rail: true, head: true, lines: 3 }, { head: true, rows: 5 }] }],
  ["/app/timecards", { title: "Time", sub: true, strip: "figures", frame: "rail", cards: [{ head: true, lines: 2 }, { head: true, rows: 5 }] }],
  ["/app/my-pay", { title: "Pay", strip: "figures", action: true, frame: "rail", cards: [{ head: true, lines: 3 }, { rail: true, head: true, lines: 2 }, { head: true, rows: 3 }] }],
  ["/app/requests/hub", { title: "Requests", sub: true, strip: "figures", frame: "wide", cards: [{ rows: 3 }, { rows: 3 }] }],
  ["/app/requests", { title: "Time off", back: true, strip: true, band: "strip", frame: "read", lift: false, cards: [{ rows: 3 }] }],
  // Swap shift, Offer for cover and Can't work are forms: back row, band 196.
  [/^\/app\/exchange\/.+/, form],
  ["/app/exchange", { title: "Pick up and swap", back: true, strip: true, band: "strip", frame: "pair", lift: false, cards: [{ rows: 3 }, { rows: 3 }] }],
  ["/app/availability", { title: "Availability", back: true, sub: true, band: "sub", frame: "wide", lift: false, cards: [{ rows: 7 }] }],
  // Notifications and Updates are sidebar pages: title at 88, a strip, band 296, the first card lifted 52px over it.
  ["/app/notifications", { title: "Notifications", strip: true, band: "strip", frame: "read", cards: [{ rows: 5 }] }],
  [/^\/app\/updates\/.+/, detail],
  ["/app/updates", { title: "Updates", strip: true, action: true, band: "strip", frame: "read", cards: [{ rows: 3 }] }],
  ["/app/profile/calendar", { band: "short", frame: "pair", lift: false, cards: [{ rows: 3 }, { rows: 3 }] }],
  [/^\/app\/profile\/.+/, detail],
  ["/app/profile", { band: "short", frame: "read", lift: false, cards: [{ rows: 2, avatar: true }, { rows: 4 }] }],
  ["/app/account/delete", { ...detail, cards: [{ head: true, lines: 4 }] }],
  ["/app/more", { title: "More", back: true, strip: true, band: "strip", frame: "pair", lift: false, cards: [{ rows: 4 }, { rows: 4 }] }],
  ["/app/help", { title: "Help", band: "short", frame: "pair", lift: false, cards: [{ rows: 6 }, { rows: 4 }] }],
];
const employeeHome: BLoadingShape = { sub: true, strip: "figures", frame: "rail", cards: [{ head: true, lines: 3 }, { rail: true, head: true, rows: 2 }, { head: true, rows: 3 }] };

/** The frame a page's placeholder keeps, by address and by whose shell it is. */
export function loadingShape(pathname: string, employee: boolean): BLoadingShape {
  if (pathname === "/app" || pathname === "/app/") return employee ? employeeHome : managementHome;
  const found = (employee ? EMPLOYEE : MANAGEMENT).find(([match]) => typeof match === "string" ? pathname === match || pathname.startsWith(`${match}/`) : match.test(pathname));
  return found ? found[1] : employee ? { ...fallback, back: true } : fallback;
}

const never = () => () => {};
const address = () => window.location.pathname;

/** The placeholder for the page at `pathname` (a loading.tsx passes the address being opened; the access check reads the
 * address bar). Both shells' frames are drawn and the shell shows its own (owner-b.css, data-b-shell), so the server's
 * first paint is already the right one. `title` is the title that page showed last time, when known. */
export function BRouteLoading({ pathname, title }: { pathname?: string; title?: ReactNode }) {
  const here = useSyncExternalStore(never, address, () => null);
  const path = pathname || here;
  if (!path) return <BLoadingScreen title={title} />;
  const management = loadingShape(path, false), employee = loadingShape(path, true);
  return <>
    <BLoadingScreen {...management} title={title ?? management.title} shell="management" />
    <BLoadingScreen {...employee} title={title ?? employee.title} shell="employee" />
  </>;
}
