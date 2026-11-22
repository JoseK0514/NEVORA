"use client";

import { useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";
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
/* Phase 8 (Nov 17, 2026): the placeholders follow the frame fixes. A strip under a title with no sub-line ends its band at
 * 264 under a back link (Notifications, Time off requests, Shift requests, Clocker PINs) and at 270 on Updates, which has
 * no back row from 768px and lifts its list; Time exports and Payroll settings lift their first card like Payroll; Paid
 * time export has no step line, so its band is the short one. */
const MANAGEMENT: Entry[] = [
  ["/app/inbox", { title: "Things to do", strip: true, band: "strip", frame: "rail", cards: [{ rows: 4, avatar: true }, { rows: 3, avatar: true }] }],
  ["/app/schedule/templates", { ...form, title: "Week templates", cards: [{ rows: 3 }] }],
  ["/app/schedule/settings", { ...detail, title: "Scheduling rules", cards: [{ head: true, lines: 4 }] }],
  // Add shift, Edit shift and Build and publish: the title at 88 (no back row), band 196.
  ["/app/schedule/new", { ...titled, title: "Add shift" }],
  ["/app/schedule/edit", { ...titled, title: "Edit shift" }],
  ["/app/schedule/publish", { ...titled, title: "Build and publish" }],
  ["/app/schedule/copy-receipt", { ...form, cards: [{ head: true, stats: 3 }, { head: true, rows: 3 }] }],
  [/^\/app\/schedule\/.+/, form],
  ["/app/schedule", { title: "Schedule", sub: true, strip: true, action: true, band: "strip", frame: "wide", cards: [{ head: true, rows: 6, avatar: true }] }],
  ["/app/timecards/corrections", { ...detail, title: "Time corrections", cards: [{ rows: 4, avatar: true }] }],
  ["/app/timecards", { title: "Timecards", sub: true, strip: true, band: "strip", frame: "wide", cards: [{ head: true, rows: 6, avatar: true }] }],
  // Time exports and Payroll settings carry the Payroll tabs: title at 88, band 296, cards 24px under it.
  // U01: the two step-by-step pages are forms in the sheet frame (back row, band 196, one card).
  // Paid time export carries a line under its title, so its band ends at 224 (measured Nov 17: the placeholder ended at 196).
  ["/app/payroll-export/paid-time", { ...form, title: "Paid time export", cards: [{ head: true, lines: 2 }, { rows: 4 }] }],
  ["/app/payroll/import", { ...form, title: "Import pay", cards: [{ head: true, lines: 3 }, { rows: 2 }] }],
  ["/app/payroll-export", { title: "Time exports", sub: true, strip: true, band: "strip", frame: "read", cards: [{ head: true, lines: 3 }, { rows: 3 }] }],
  [/^\/app\/payroll\/.+/, { back: true, band: "short", frame: "read", lift: false, cards: [{ head: true, lines: 3 }, { rows: 3 }] }],
  // Payroll: a title, its scope line and the tabs, on the strip rung (the frequency line is hidden from 768px).
  ["/app/payroll", { title: "Payroll", sub: true, strip: true, band: "strip", frame: "rail-desktop", cards: [{ head: true, rows: 3 }, { rail: true, head: true, lines: 3 }] }],
  ["/app/employees/new", { ...detail, cards: [{ head: true, lines: 4 }] }],
  ["/app/employees/import", form],
  // Scheduling restrictions (U02): back row, title and the person's name (band 224), then the week card and one more.
  // PTO screens: one person's time off balance (balances, then the history).
  [/^\/app\/employees\/[^/]+\/time-off$/, { ...detail, title: "Time off balance", cards: [{ head: true, rows: 2 }, { head: true, rows: 3 }] }],
  // SCRUM-214: one person's pay rates (rates now, then the history).
  [/^\/app\/employees\/[^/]+\/pay$/, { ...detail, title: "Pay rate", cards: [{ head: true, rows: 3 }, { head: true, rows: 2 }] }],
  [/^\/app\/employees\/[^/]+\/restrictions$/, { ...detail, title: "When they can be scheduled", cards: [{ head: true, rows: 7 }, { head: true, lines: 2 }] }],
  // One person's Clocker PIN (Phase 6): back row, the title and the person's name (band 224), one form card.
  [/^\/app\/employees\/[^/]+\/clocker-pin$/, { ...detail, title: "Clocker PIN", cards: [{ head: true, lines: 4 }] }],
  [/^\/app\/employees\/.+/, detail],
  // Team: Home's two columns from 1024px (People, then the Team tools rail), one column on tablets.
  ["/app/employees", { sub: true, strip: true, action: true, band: "strip", frame: "rail-desktop", cards: [{ rows: 8, avatar: true }, { rail: true, rows: 5 }] }],
  // Christmas bonus hours (opened from Insights): back row, title and the bonus year line with the year pill, then the
  // three cards the page has (Review 30, D20): the note and the two dates, the four counts, then people (no avatars).
  ["/app/reports/christmas-bonus", { ...detail, action: true, title: "Christmas bonus hours", cards: [{ lines: 3, rows: 2 }, { head: true, stats: 4 }, { head: true, rows: 5 }] }],
  ["/app/reports", { title: "Insights", band: "short", frame: "wide", lift: false, cards: [{ head: true, stats: 3 }, { head: true, lines: 3 }] }],
  ["/app/updates/compose", titled],
  [/^\/app\/updates\/.+/, form],
  ["/app/updates", { title: "Updates", strip: true, action: true, band: "strip", frame: "read", cards: [{ rows: 3 }] }],
  ["/app/notifications", { title: "Notifications", strip: true, band: "strip", frame: "read", cards: [{ rows: 4 }] }],
  ["/app/requests", { back: true, strip: true, band: "strip", frame: "read", lift: false, cards: [{ rows: 4, avatar: true }] }],
  ["/app/exchange", { back: true, strip: true, band: "strip", frame: "read", lift: false, cards: [{ rows: 4, avatar: true }] }],
  ["/app/availability", { back: true, strip: true, band: "strip", frame: "read", lift: false, cards: [{ rows: 5, avatar: true }] }],
  ["/app/settings/payroll", { title: "Payroll settings", sub: true, strip: true, band: "strip", frame: "read", cards: [{ head: true, lines: 4 }] }],
  // The Owner's Clocker settings (Phase 6). Tablets: a title and one line (band 224), the tablets card with a lead slot per
  // row. PINs: search and tabs on the band (296), people rows. Photos: one card of switch rows. Review: photo rows.
  ["/app/settings/clocker/photos/review", { ...detail, title: "Photo review", cards: [{ head: true, rows: 4 }] }],
  ["/app/settings/clocker/photos", { ...detail, title: "Punch photos", cards: [{ lines: 2, rows: 5 }] }],
  // Shift matching: one card with the grace field, its help and a note.
  ["/app/settings/clocker/matching", { ...detail, title: "Shift matching", cards: [{ lines: 3 }] }],
  // PTO screens: Settings › Time off policies (the policies card with its rows).
  ["/app/settings/time-off", { ...detail, title: "Time off policies", cards: [{ head: true, rows: 2 }] }],
  ["/app/settings/clocker/pins", { title: "Clocker PINs", back: true, strip: true, band: 264, frame: "read", lift: false, cards: [{ head: true, rows: 6, avatar: true }] }],
  ["/app/settings/clocker", { ...detail, title: "Clocker tablets", cards: [{ head: true, rows: 2, avatar: true }] }],
  [/^\/app\/settings\/.+/, form],
  ["/app/settings", { title: "Settings", band: "short", frame: "pair", lift: false, cards: [{ rows: 3 }, { rows: 4 }] }],
  ["/app/account-recovery", detail],
  // Clocker recovery (Phase 6): back row, title and one line (band 224); help requests, the code form, the Timecards row.
  ["/app/clocker-recovery", { ...detail, title: "Clocker recovery", cards: [{ head: true, rows: 2, avatar: true }, { head: true, lines: 3 }, { rows: 1, avatar: true }] }],
  ["/app/more", { title: "More", band: "short", frame: "read", lift: false, cards: [{ rows: 5 }] }],
  ["/app/help", { title: "Help", band: "short", frame: "read", lift: false, cards: [{ rows: 6 }] }],
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
  // Scheduling restrictions (U02): the Employee's own agreement, opened from Availability.
  ["/app/availability/agreement", { title: "Agreed times", back: true, sub: true, band: "sub", frame: "read", lift: false, cards: [{ head: true, rows: 7 }, { head: true, lines: 2 }] }],
  ["/app/availability", { title: "Availability", back: true, sub: true, band: "sub", frame: "wide", lift: false, cards: [{ rows: 7 }] }],
  // Notifications and Updates are sidebar pages: title at 88, a strip, band 296, the first card lifted 52px over it.
  ["/app/notifications", { title: "Notifications", strip: true, band: "strip", frame: "read", cards: [{ rows: 5 }] }],
  [/^\/app\/updates\/.+/, detail],
  ["/app/updates", { title: "Updates", strip: true, action: true, band: "strip", frame: "read", cards: [{ rows: 3 }] }],
  ["/app/profile/calendar", { band: "short", frame: "pair", lift: false, cards: [{ rows: 3 }, { rows: 3 }] }],
  [/^\/app\/profile\/.+/, detail],
  ["/app/profile", { band: "short", frame: "read", lift: false, cards: [{ rows: 2, avatar: true }, { rows: 4 }] }],
  ["/app/account/delete", { ...detail, cards: [{ head: true, lines: 4 }] }],
  // More: the profile tile on the band, then "Your work" (four rows) and "Help and legal" (two), each row with a lead circle.
  ["/app/more", { title: "More", back: true, strip: true, band: "strip", frame: "pair", lift: false, cards: [{ head: true, rows: 4, avatar: true }, { head: true, rows: 2, avatar: true }] }],
  ["/app/help", { title: "Help", band: "short", frame: "pair", lift: false, cards: [{ rows: 6 }, { rows: 4 }] }],
];
const employeeHome: BLoadingShape = { sub: true, strip: "figures", frame: "rail", cards: [{ head: true, lines: 3 }, { rail: true, head: true, rows: 2 }, { head: true, rows: 3 }] };

/** The whole table, for the test that renders every entry (b-loading-motion.test.tsx). */
export const B_LOADING_TABLE: { management: Entry[]; employee: Entry[] } = { management: MANAGEMENT, employee: EMPLOYEE };

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
  // Phase 7 (package C): the hand-over. When the page replaces this placeholder, <html> carries data-c-arrived for a
  // moment: a screen that appears in that moment skips the usual rise and only its cards' contents fade in over
  // --b-dur-hover (b-shimmer.css; nothing with reduced motion). Before the moment ends, the screens that arrived are
  // marked data-b-arrived, and the mark stays for as long as they live: a rule that stopped matching would start the rise
  // late. A tab tap (CorpSkeleton) and the access check both leave through here, and a second placeholder that follows the
  // first is marked too, so it does not rise again.
  useLayoutEffect(() => () => {
    const root = document.documentElement;
    root.setAttribute("data-c-arrived", "");
    window.setTimeout(() => { for (const screen of document.querySelectorAll("main.page-frame .b-screen")) screen.setAttribute("data-b-arrived", ""); }, 150);
    window.setTimeout(() => root.removeAttribute("data-c-arrived"), 250);
  }, []);
  const path = pathname || here;
  if (!path) return <BLoadingScreen title={title} />;
  const management = loadingShape(path, false), employee = loadingShape(path, true);
  return <>
    <BLoadingScreen {...management} title={title ?? management.title} shell="management" route={path} />
    <BLoadingScreen {...employee} title={title ?? employee.title} shell="employee" route={path} />
  </>;
}
