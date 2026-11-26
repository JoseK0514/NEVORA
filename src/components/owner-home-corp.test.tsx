import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from '@rstest/core';
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor } from "@/lib/time-clock";
import type { ActionItem } from "@/lib/action-center/project";
import { needsYou } from "@/lib/action-center/needs-you";
import {reviewFacts} from '@/lib/action-center/review-facts';
import { onlyB, withoutB } from "./owner-b/test-support";

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
// The kit's "Couldn't load · Try again" refreshes the page through the router when no retry is given.
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }), usePathname: () => "/app" }));
const { HomeB } = await import("./owner-b/home-b");
const { OwnerHomeCorp } = await import("./owner-home-corp");

const shift = (id: string, status: TodayShift["status"]): TodayShift => ({
  id, employeeId: id, employeeName: `Person ${id}`, locationId: "main", locationName: "Condado", positionName: "Barista",
  startAt: "2026-10-30T13:00:00Z", endAt: "2026-10-30T21:00:00Z", status, firstClockInAt: null, late: false,
});
const today = (shifts: TodayShift[]): Today => ({ state: "ready", observedAt: "2026-10-30T15:00:00Z", validForMs: 60_000, timeZone: "America/Puerto_Rico", today: "2026-10-30",
  counts: { scheduled: shifts.length, clockedIn: 0, late: 0, notClockedIn: 0 }, shifts, missed: [] });
const monitor = (ids: string[]): ClockMonitor => ({ state: "ready", observedAt: "2026-10-30T15:00:00Z", timeZone: "America/Puerto_Rico", validForMs: 60_000,
  employees: ids.map(id => ({ timeEntryId: `t-${id}`, employeeId: id, employeeName: `Person ${id}`, locationId: "main", locationName: "Condado", deviceId: "d1", clockInAt: "2026-10-30T13:02:00Z", state: "ON_FLOOR", elapsedMinutes: 0, breakElapsedMinutes: null, positionName: null, scheduleMatch: "MATCHED" })) });
const item = (id: string, type: string, priority: "URGENT" | "REVIEW", category: ActionItem["category"], extra: Partial<ActionItem> = {}) =>
  ({ id, type, priority, category, title: `${type} title`, detail: `${type} detail`, href: `/app/go/${id}`, ...typedReview(type, extra), ...extra }) as ActionItem;
/** Phase 4 (U03): every timecard the server sends carries typed review facts (its own period, and whether this person
 * may review it). A fixture without them would be an older payload, which is never counted. */
const typedReview = (type: string, extra: Partial<ActionItem>) => {
  if (type !== "TIMECARD" || extra.review) return {};
  const url = new URL(extra.href ?? "/app/timecards", "https://nevora.invalid");
  return { review: reviewFacts(false, false, "TIMECARD", { startDate: url.searchParams.get("start") ?? "2026-10-19", endDate: url.searchParams.get("end") ?? "2026-10-25" }) };
};

const items = [
  item("gap1", "COVERAGE_GAP", "URGENT", "scheduling", { title: "Position not covered at Condado", detail: "2026-10-30 · 1:00 PM–3:00 PM · Barista: 1 open", dateTime: "2026-10-30T13:00", href: "/app/schedule/coverage?shift=gap1" }),
  item("off1", "TIME_OFF", "REVIEW", "requests"),
  item("swap1", "EXCHANGE", "REVIEW", "requests"),
  item("swap2", "EXCHANGE", "URGENT", "requests"),
  item("card1", "TIMECARD", "REVIEW", "timekeeping"),
  item("card2", "TIMECARD", "REVIEW", "timekeeping"),
];
const base = {
  greeting: "Welcome back, Carmen", dateLabel: "Friday, October 30", summary: "4 things need you today.", today: today([shift("a", "clocked_in"), shift("b", "upcoming"), shift("c", "no_punches")]),
  monitor: monitor(["a"]), monitorPending: false, todayRefreshing: false, offline: false, connection: "ready" as const,
  value: needsYou(items, "2026-10-30", [shift("c", "no_punches")]), timecards: items.filter(i => i.type === "TIMECARD"),
  nextPay: { payday: "2026-11-03", daysUntil: 1, period: { startDate: "2026-10-26", endDate: "2026-11-01" } },
};
// The corporate cards (tablets and desktop); the Direction B phone screen has its own tests (owner-b/owner-b.test.tsx).
const html = (props: Partial<ComponentProps<typeof OwnerHomeCorp>> = {}) => withoutB(renderToStaticMarkup(<OwnerHomeCorp {...base} {...props} />));

it("keeps the day and the short action on a Spanish Home coverage row", () => {
  const out = renderToStaticMarkup(<HomeB {...base} timecardsReady lang="es" />);
  expect(out).toContain("Próximo: hoy, ");
  expect(out).toContain('aria-label="Cubrir turno: ');
  expect(out).toContain(">Cubrir</a>");
});

describe("Owner Home on the corporate kit (board C-Owner)", () => {
  it("has a title, at most three cards and the live summary for screen readers", () => {
    const out = html();
    expect(out).toContain("<h1>Welcome back, Carmen</h1>");
    expect(out).toContain('role="status" class="c-sr">4 things need you today.</span>');
    expect(out.match(/class="c-card[" ]/g)).toHaveLength(3);
  });
  it("counts who is on shift out of who is scheduled, missed clock-ins and open shifts in ink, each opening its list, and offers Find cover once", () => {
    const out = html().replace(/\u2009/g, " ");
    // R6: each figure is a link (Who's working, the missed clock-ins, the one open shift's Find cover); R3: no red or amber.
    expect(out).toContain('<a href="/app?view=attendance" class="c-stat c-home__stat" aria-label="Clocked in: 1 of 3. Who’s working"><span class="c-stat__label">Clocked in</span><span class="c-stat__value c-num">1<span class="c-home__of"> of 3</span></span></a>');
    // Nov 1 upscale: the short labels Who's working uses, so all three sit on one line.
    expect(out).not.toContain("On shift now");
    expect(out).not.toContain("Missed clock-ins");
    expect(out).toMatch(/href="\/app\/inbox#todo-missed" class="c-stat c-home__stat" aria-label="Missed: 1"><span class="c-stat__label">Missed<\/span><span class="c-stat__value c-num">1<\/span>/);
    expect(out).toMatch(/href="\/app\/schedule\/coverage\?shift=gap1[^"]*" class="c-stat c-home__stat" aria-label="Open shifts: 1. Find cover"><span class="c-stat__label">Open shifts<\/span><span class="c-stat__value c-num">1<\/span>/);
    expect(out).not.toMatch(/c-stat__value--(red|amber)/);
    // The open shift reads as on Things to do (board O-Inbox wording) and opens its coverage review.
    expect(out).toContain(">Barista 1:00 PM – 3:00 PM<");
    // Nov 1 upscale: the card's header says Today, so the detail starts at the place.
    expect(out).toContain(">Condado · 1 open<");
    expect(out).not.toContain(">Today · Condado");
    expect(out).toMatch(/href="\/app\/schedule\/coverage\?shift=gap1[^"]*"/);
    expect(out.match(/>Find cover</g)).toHaveLength(1);
    // Several open shifts: the figure opens the Schedule, and the hero lists the next two (shown from tablet width).
    const gap = (id: string, time: string) => item(id, "COVERAGE_GAP", "URGENT", "scheduling", { title: "Position not covered at Condado", detail: `2026-10-30 · ${time} · Need 1 employee`, dateTime: "2026-10-30T13:00", href: `/app/schedule/coverage?shift=${id}` });
    const many = html({ value: needsYou([gap("g1", "1:00 PM–3:00 PM"), gap("g2", "all day"), gap("g3", "6:00 PM–midnight"), gap("g4", "7:00 PM–9:00 PM")], "2026-10-30", []) }).replace(/[\u00a0\u2009]/g, " ");
    expect(many).toMatch(/href="\/app\/schedule" class="c-stat c-home__stat" aria-label="Open shifts: 4. Schedule"/);
    expect(many).toContain('<ul class="c-rows c-home__more" aria-label="More open shifts today">');
    expect(many).toContain("Open all day");
    expect(many).toContain("6:00 PM – 12:00 AM");
    expect(many).toContain(">Condado · Needs 1 person<");
    expect(many).not.toContain("Today · Condado");
    expect(many).not.toContain("7:00 PM");
    expect(out.match(/class="c-btn( c-btn--md)?"/g)).toHaveLength(1);
  });
  it("names the next payday, then what to do about its timecards and when, and never claims they are approved", () => {
    const open = [item("card1", "TIMECARD", "REVIEW", "timekeeping", { href: "/app/timecards?start=2026-10-26&end=2026-11-01#timecard-a" }),
      item("card2", "TIMECARD", "REVIEW", "timekeeping", { href: "/app/timecards?start=2026-10-26&end=2026-11-01#timecard-b" })];
    // Before the period ends: the payday, then the day approvals open (R7, "You can approve from Mon, Nov 2").
    const before = html({ timecards: open, timecardsReady: true, businessDay: "2026-10-30" }).replace(/\u00a0/g, " ");
    expect(before).toContain('<section id="home-payday" class="c-card" aria-labelledby="home-payday-label">');
    expect(before).toContain(">Tue, Nov 3<");
    expect(before).toContain(">Tomorrow<");
    expect(before).toContain(">Pay period Oct 26–Nov 1<");
    expect(before).toContain(">Approve timecards<");
    expect(before).toContain(">You can approve from Mon, Nov 2<");
    expect(before).not.toMatch(/Approve \d/);
    // Once it has ended: the count, with the one verb.
    const after = html({ timecards: open, timecardsReady: true, businessDay: "2026-11-02" }).replace(/\u00a0/g, " ");
    expect(after).toContain(">Review 2 timecards<");
    expect(after).toContain("Before payroll · Oct 26–Nov 1");
    expect(after).toContain('href="/app/timecards?start=2026-10-26&amp;end=2026-11-01"');
    // P3: never "approved" — not while loading, not when the read failed, not when there are simply none.
    const loading = html({ value: null, connection: "loading", timecards: [], timecardsReady: false, businessDay: "2026-10-30" });
    expect(loading).toContain(">Checking timecards…<");
    const failed = html({ value: null, connection: "unavailable", timecards: [], timecardsReady: false, businessDay: "2026-10-30" });
    expect(failed).toContain(">Timecards aren’t available right now<");
    const none = html({ timecards: [], timecardsReady: true, businessDay: "2026-11-02" });
    expect(none).toContain(">No timecards waiting<");
    for (const out of [before, after, loading, failed, none]) expect(out).not.toMatch(/approved/i);
    expect(html({ nextPay: null, timecards: [] })).not.toContain('id="home-payday"');
  });
  it("lists only decisions under Things to do, so the shift counts in Today don't show twice", () => {
    const out = html();
    expect(out).toContain(">Things to do<");
    expect(out).not.toContain("Things to do (");
    expect(out).toContain('aria-label="Time off requests, 1"');
    expect(out).toContain('aria-label="Shift swaps, 2"');
    expect(out).toContain('href="/app/exchange"');
    expect(out).not.toContain("Shifts with no clock-in");
    const card = out.slice(out.indexOf('id="home-needs-you"'));
    expect(card).not.toContain("Open shifts");
    expect(out).not.toContain("TIMECARD title");
    // R3: the count is grey text after the label, not a badge.
    expect(card).toContain('<span class="c-row__value c-row__value--soft">1</span>');
    expect(out).not.toContain("c-badge");
  });
  it("says so while loading or offline, offers Try again when a read fails, and never shows a false zero", () => {
    expect(html({ value: null, connection: "loading" })).toContain("Checking what needs you…");
    expect(html({ value: null, connection: "unavailable", onRetryActions: () => {} })).toContain(">Try again<");
    expect(html({ value: null, connection: "unavailable", onRetryActions: () => {} })).toContain('class="c-error-card"');
    expect(html({ value: null, connection: "offline", offline: true })).not.toContain(">Try again<");
    // Nov 1 upscale: a failed Today keeps its shape, every figure "—" (never a false zero), and the header offers Try again.
    const failedToday = html({ today: { state: "unavailable", reason: "read_failed" } as Today, onRetryToday: () => {} });
    expect(failedToday).toContain("Who’s on shift isn’t available");
    expect(failedToday).toContain("Couldn’t load");
    expect(failedToday).toMatch(/<div class="c-card__aside"><span class="c-fail">.*>Try again<\/button>/);
    expect(failedToday).not.toContain('class="c-error-card"');
    expect(failedToday.match(/<span class="c-stat__value c-stat__value--none c-num">—<\/span>/g)).toHaveLength(3);
    expect(failedToday).not.toMatch(/c-stat__value c-num">\d/);
    // A figure still on its way is the grey dash, plain text, never a link.
    expect(html({ value: null })).toContain('<div class="c-stat c-home__stat"><span class="c-stat__label">Missed</span><span class="c-stat__value c-stat__value--none c-num">—</span></div>');
    expect(html({ value: null })).not.toContain(">…<");
    // P7: while Today loads, the card already has its final shape (the three counts as "—").
    const loadingToday = html({ today: null, value: null, connection: "loading" });
    expect(loadingToday).toContain('aria-busy="true"');
    expect(loadingToday.match(/<span class="c-stat__value c-stat__value--none c-num">—<\/span><\/div>/g)).toHaveLength(3);
  });
  it("shows the all-set card when nothing needs the Owner, and says where shift items are when only those wait", () => {
    const out = html({ value: needsYou([], "2026-10-30", []) });
    expect(out).toContain("You’re all set</b>");
    expect(out).toContain("Nothing needs you right now.");
    const shiftsOnly = html({ value: needsYou([items[0]], "2026-10-30", []) });
    expect(shiftsOnly).toContain("No requests waiting</b>");
  });
});

describe("Direction B phone screen (Owner and Manager Home)", () => {
  const payrollWeek = { firstName: "Carmen", days: [], scheduledHours: 0, people: 0, payrollHref: "/app/payroll" };
  const phone = (props: Partial<ComponentProps<typeof OwnerHomeCorp>> = {}) => onlyB(renderToStaticMarkup(<OwnerHomeCorp {...base} {...props} />)).replace(/ /g, " ");
  // BR-16 with the backend's clockerRegistered (Nov 15, 2026).
  it("with no time clock registered, one tile says so in place of the attendance tiles; unknown or registered keeps them", () => {
    const quiet = [shift("b", "upcoming"), shift("c", "no_punches")];
    const none = phone({ today: { ...today(quiet), clockerRegistered: false } as Today, monitor: monitor([]), setup: <span>setup</span> });
    // Gaps G39 (Nov 23, 2026): the tile is named by what it shows, with no label that words it differently.
    expect(none).toContain('<a href="/app/settings/clocker" class="b-live__a"><span class="b-live__l">Time clock</span><span class="b-sr">\u00a0</span><span class="b-live__v">Not set up</span>');
    expect(none).not.toContain('href="/app?view=attendance" class="b-live__a"');
    expect(none).not.toContain('href="/app/inbox#todo-missed" class="b-live__a"');
    expect(none).toContain("Open shifts");
    // A Manager's Home (no setup card) says the same, without a link.
    expect(phone({ today: { ...today(quiet), clockerRegistered: false } as Today, monitor: monitor([]) })).not.toContain('href="/app/settings/clocker"');
    // Gaps G38 (Nov 23, 2026): someone clocked in without a tablet (a phone clock-in) means the band shows the live figures,
    // never "Not set up" beside Today's list of who is clocked in.
    const shifts = [shift("a", "clocked_in"), ...quiet];
    for (const registered of [true, undefined, false]) {
      const out = phone({ today: { ...today(shifts), ...(registered === undefined ? {} : { clockerRegistered: registered }) } as Today, setup: <span>setup</span> });
      expect(out).toContain('<a href="/app?view=attendance" class="b-live__a"><span class="b-live__l"><span class="b-dot b-dot--live" aria-hidden="true"></span>Clocked in</span><span class="b-sr">\u00a0</span><span class="b-live__v">1<small>/3</small></span>');
      expect(out).not.toContain(">Time clock<");
      expect(out).not.toContain("Not set up");
    }
    // A clock-in whose shift is over (done) counts too.
    const ended = phone({ today: { ...today([{ ...shift("a", "done"), firstClockInAt: "2026-10-30T13:01:00Z" }, ...quiet]), clockerRegistered: false } as Today, monitor: monitor([]) });
    expect(ended).not.toContain("Not set up");
  });
  it("leads with the shared needs-you count as a sentence and three live figures that open their lists", () => {
    const out = phone();
    expect(out).toMatch(/<h1>5 things need you<\/h1>/);
    // Gaps G39 (Nov 23, 2026): each figure's spoken name is its visible text (no aria-label).
    expect(out).toContain('<a href="/app?view=attendance" class="b-live__a"><span class="b-live__l"><span class="b-dot b-dot--live" aria-hidden="true"></span>Clocked in</span>');
    // B7 wording (NV-123): the stat and the row use one name ("Missed", as on the corporate Home).
    expect(out).toContain('<a href="/app/inbox#todo-missed" class="b-live__a"><span class="b-live__l"><span class="b-dot b-dot--warn" aria-hidden="true"></span>Missed</span><span class="b-sr">\u00a0</span><span class="b-live__v">1</span>');
    expect(out).not.toMatch(/class="b-live__a" aria-label=/);
    expect(out).toContain('aria-label="Find cover: Barista 1:00 PM – 3:00 PM">Find cover</a>');
    // B7 wording (NV-068): outside the dense week grid, ranges keep full times with a spaced en dash.
    // Jose (Nov 15, 2026, item 5): the short form shows on a phone, the full one from 768px (b-foundation.css picks).
    expect(out).toMatch(/>Next: today, Barista 1:00\s?PM\s–\s3:00\s?PM</);
    // Phase 8 (a.md #13): the row's title is the person; the line under it says what and when.
    expect(out).toMatch(/>Missed clock-in\s·\sshift\sended\s\d{1,2}:\d{2}\s?[AP]M</);
  });
  it("uses Jose's attendance words: a shift still running is Not clocked in, and only an ended shift is Missed", () => {
    // Nov 11, 2026 decision; Nov 14 inspection (BR-9). A shift that began and has no punch is never called missed.
    const running = phone({ value: needsYou(items, "2026-10-30", [shift("b", "not_clocked_in")]) });
    expect(running).toContain('<a href="/app/inbox#todo-not-clocked-in" class="b-live__a">');
    expect(running).toContain('<span class="b-home-attendance-label">Not clocked in</span></span><span class="b-sr">\u00a0</span><span class="b-live__v">1</span>');
    expect(running).toMatch(/>Not clocked in\s·\sshift\sbegan\s\d{1,2}:\d{2}\s?[AP]M</);
    expect(running).not.toMatch(/Missed|missed/);
    // Both kinds: the live tile counts who is waiting to clock in, and each kind has its own row.
    const both = phone({ value: needsYou(items, "2026-10-30", [shift("b", "not_clocked_in"), shift("c", "no_punches")]) });
    expect(both).toContain('<a href="/app/inbox#todo-not-clocked-in" class="b-live__a"><span class="b-live__l"><span class="b-dot b-dot--warn" aria-hidden="true"></span><span class="b-home-attendance-label">Not clocked in</span></span><span class="b-sr">\u00a0</span><span class="b-live__v">1</span>');
    // Gaps G39: the two rows are named by what they show (the person, then what and when), with no aria-label.
    expect(both).not.toMatch(/aria-label="(Not clocked in|Missed clock-ins):/);
    expect(both).toMatch(/>Not clocked in\s·\sshift\sbegan\s/);
    expect(both).toMatch(/>Missed clock-in\s·\sshift\sended\s/);
    // Nobody waiting and nothing missed: the tile keeps its name with a zero.
    expect(phone({ value: needsYou(items, "2026-10-30", []) })).toContain('<span class="b-home-attendance-label">Not clocked in</span></span><span class="b-sr">\u00a0</span><span class="b-live__v">0</span>');
  });
  it("names both people on a shift request, says which timecards Payday counts, and leads with setup until it is done", () => {
    // Nov 14 inspection (BR-7): the other person in a swap or cover, when the read carries them.
    const swap = item("EXCHANGE:s9", "EXCHANGE", "REVIEW", "requests", { detail: "Ana Colon is waiting for review.", request: { startDate: "2026-11-21", endDate: "2026-11-21", lengthText: "8 h",
      locationName: "Condado", counterpartName: "James Ortiz", reviewHref: "/app/exchange?tab=requests&requestId=s9" } });
    const out = phone({ value: needsYou([swap], "2026-10-30", []) });
    // Phase 3 (OW-002, OW-007): the people are the title, the kind and the date the line under it; the lead is 36px.
    // Final polish (Nov 20, 2026): the two names are joined by the bold swap glyph, said as "and".
    expect(out).toContain('class="b-swapnames"');
    expect(out).not.toContain("⇄");
    expect(out).toContain(">Shift swap · Nov 21<");
    // Gaps G39 (Nov 23, 2026): the row is named by what it shows ("Ana Colon and James Ortiz, Shift swap · Nov 21").
    expect(out).not.toContain('aria-label="Shift request, Ana Colon and James Ortiz"');
    expect(out).toContain('<span class="b-sr"> and </span>');
    expect(out).toMatch(/<span class="b-av" style="--s:36px;[^"]*" aria-hidden="true">AC<\/span>/);
    // Payday counts only timecards whose pay period has ended, and says so (Things to do also lists the open period's).
    const cards = [item("c1", "TIMECARD", "REVIEW", "timekeeping", { href: "/app/timecards?start=2026-10-19&end=2026-10-25" }), item("c2", "TIMECARD", "REVIEW", "timekeeping", { href: "/app/timecards?start=2026-10-26&end=2026-11-01" })];
    const payday = phone({ timecards: cards, timecardsReady: true, businessDay: "2026-10-30", week: payrollWeek });
    // Phase 8 (a.md #5): the counted cards' period is named, so it is never read as the payday's own period.
    expect(payday).toContain("<span>1\u00a0timecard to review</span><span>Pay period Oct\u00a019–25 ended</span>");
    expect(payday).not.toContain("Before payroll");
    // BR-16: the setup card is the first card while there is something to finish.
    const setup = phone({ setup: <span>setup row</span> });
    expect(setup.indexOf('aria-label="Finish setting up"')).toBeGreaterThan(0);
    expect(setup.indexOf('aria-label="Finish setting up"')).toBeLessThan(setup.indexOf('id="b-home-needs"'));
  });
  it("shows Payday as the ink tile for someone who can open Payroll, and never without a payday", () => {
    expect(phone({ week: payrollWeek })).toContain('<a href="/app/payroll" class="b-btn b-btn--white b-btn--full" aria-label="Prepare payroll">');
    expect(phone({ week: payrollWeek })).toContain('<section class="b-ink" aria-label="Scheduled payday">');
    // Phase 8 (a.md #15): a date from the pay schedule is the "Scheduled payday".
    expect(phone({ week: payrollWeek })).toContain('<span class="b-ink__k">Scheduled payday</span>');
    expect(phone({ nextPay: undefined })).not.toContain('class="b-ink"');
  });
  it("never looks calm while Payroll is red: a period with no payroll leads, in Payroll's own words (Phase 8, a.md #5)", () => {
    const overdue = { state: "ready" as const, overdue: { payday: "2026-10-23", period: { startDate: "2026-10-12", endDate: "2026-10-18" } } };
    const out = phone({ week: payrollWeek, payrollStatus: overdue });
    const notice = out.slice(out.indexOf('aria-label="Pay periods with no payroll"'), out.indexOf('class="b-ink"'));
    expect(notice).toContain("b-ico b-ico--red");
    expect(notice).toMatch(/>Oct 12–18 has no payroll</);
    expect(notice).toMatch(/>Scheduled payday was Fri,\sOct\s23</);
    expect(notice).toMatch(/href="\/app\/payroll\/prepare#unpaid-2026-10-12" class="b-btn b-btn--teal b-btn--full"[^>]*>Prepare Oct 12–18</);
    // The notice sits before the payday tile, which has no Prepare button of its own then (Core check, Nov 23, 2026).
    expect(out.indexOf("has no payroll")).toBeLessThan(out.indexOf('class="b-ink"'));
    expect(out).not.toContain('aria-label="Prepare payroll"');
    // QA A5-01 (Nov 23, 2026): on phones the overdue card is first under the band, before Things to do; from 768 the copy
    // in the right column shows (owner-b-home.css). The phone copy isn't held for Things to do's read (G73).
    const first = out.indexOf('<div class="b-home-payfirst">');
    expect(first).toBeGreaterThan(-1);
    expect(first).toBeLessThan(out.indexOf('id="b-home-needs"'));
    expect(out).toContain('<div class="b-home-paylate">');
    const loading = phone({ week: payrollWeek, payrollStatus: overdue, value: null, connection: "loading", timecardsReady: false });
    expect(loading).toContain('<div class="b-home-payfirst">');
    expect(loading).not.toContain('<div class="b-home-paylate">');
    // Only an overdue payroll moves up: a schedule that needs review keeps its place.
    expect(phone({ week: payrollWeek, payrollStatus: { state: "ready", reviewRequired: overdue.overdue } })).not.toContain("b-home-payfirst");
    // A schedule that needs review is amber and opens Payroll; a status that couldn't be read says so, never calm.
    const review = phone({ week: payrollWeek, payrollStatus: { state: "ready", reviewRequired: overdue.overdue } });
    expect(review).toContain(">Payroll schedule needs review<");
    expect(review).toContain("b-ico b-ico--amber");
    expect(phone({ week: payrollWeek, payrollStatus: { state: "unavailable" } })).toContain(">Payroll status isn’t available right now<");
    // Up to date, or not this person's: no notice, and the tile keeps its white button.
    const calm = phone({ week: payrollWeek, payrollStatus: { state: "ready" } });
    expect(calm).not.toContain("has no payroll");
    expect(calm).toContain('class="b-btn b-btn--white b-btn--full" aria-label="Prepare payroll"');
    expect(phone({ week: payrollWeek })).not.toContain("Pay periods with no payroll");
  });
  it("frames the ink tile around timecards for someone who can't open Payroll (Phase 3, MG-003, MG-004)", () => {
    const card = (id: string, start: string, end: string, extra: Partial<ActionItem> = {}) => item(id, "TIMECARD", "REVIEW", "timekeeping", { href: `/app/timecards?start=${start}&end=${end}`, review:reviewFacts(false,false,'TIMECARD',{startDate:start,endDate:end}), ...extra });
    const ended = [card("c1", "2026-10-19", "2026-10-25"), card("c2", "2026-10-19", "2026-10-25"), card("mine", "2026-10-19", "2026-10-25", { title: "Your timecard needs another reviewer",review:reviewFacts(true,true,'TIMECARD',{startDate:'2026-10-19',endDate:'2026-10-25'}) })];
    // Something to approve today: the count leads (the reviewer's own card is left out and the line says so), payday is
    // the detail, and the one white button reviews timecards.
    const open = phone({ timecards: ended, timecardsReady: true, businessDay: "2026-10-30" });
    expect(open).toContain('<section class="b-ink" aria-label="Timecards">');
    expect(open).toContain('<span class="b-ink__k">Timecards</span><span class="b-ink__due">Open now</span>');
    expect(open).toMatch(/<div class="b-ink__big">2\sto approve<\/div>/);
    // Core check (Nov 23, 2026): the count is said once, in the big line.
    expect(open).toContain("<span>Pay period ended</span><span>Scheduled payday Tue,\u00a0Nov\u00a03</span>");
    expect(open).not.toContain("2 of 3 timecards");
    expect(open).toContain("Another reviewer approves your timecard");
    expect(open).toContain('<a href="/app/timecards" class="b-btn b-btn--white b-btn--full" aria-label="Review timecards">');
    expect(open).not.toMatch(/Prepare payroll|Open timecards/);
    // Not open yet: the day approval opens leads, and the button is the quiet glass pill, never the white one.
    const closed = phone({ timecards: [card("c3", "2026-10-26", "2026-11-01")], timecardsReady: true, businessDay: "2026-10-30" });
    expect(closed).toContain('<div class="b-ink__big">Opens Mon, Nov 2</div>');
    // Phase 9 (spec 3.1): when approval opens is a time fact, grey header text, not a chip.
    expect(closed).toContain('<span class="b-ink__due b-ink__due--when">In 3 days</span>');
    expect(closed).toContain('<a href="/app/timecards" class="b-btn b-btn--glass b-btn--full" aria-label="See this week’s hours">');
    expect(closed).not.toContain("b-btn--white");
    // The Owner's Payday leaves the reviewer's own card out of its count too.
    expect(phone({ timecards: ended, timecardsReady: true, businessDay: "2026-10-30", week: payrollWeek })).toMatch(/<span>2\stimecards to review<\/span><span>Pay period Oct\s19–25 ended<\/span>/);
  });
  it("lists who is on now from Today's shifts, in Jose's words, and counts the corrections that can be decided (Phase 3, MG-011, MG-005)", () => {
    const late = { ...shift("d", "clocked_in"), late: true, employeeName: "Gabriela Santos" };
    const out = phone({ today: today([shift("a", "clocked_in"), late, shift("e", "not_clocked_in"), shift("b", "upcoming"), shift("c", "no_punches")]) });
    const card = out.slice(out.indexOf('id="b-home-on"'), out.indexOf('class="b-home-col b-home-col--b"'));
    expect(card).toContain('<a href="/app?view=attendance" class="b-card__a" aria-label="See everyone working today">See everyone</a>');
    // Final polish (Nov 20, 2026): the card leads with today's chart and, for phones, one row of faces; the people's rows
    // are the "On now" list.
    // Jose (Nov 22, 2026: no fact twice): who hasn't clocked in is listed once, under Things to do, so On now keeps the two
    // people on the clock.
    expect(card.slice(card.indexOf('aria-label="On now"')).match(/<li class="b-li">/g)).toHaveLength(2);
    expect(card).toContain('<h2 id="b-home-on-h">Today</h2>');
    expect(card).toContain("People scheduled by hour");
    // The row's name is its visible text (no aria-label that differs from it).
    expect(card).toContain(">2 clocked in<");
    expect(card).not.toContain('aria-label="2 clocked in');
    // Phase 8 (a.md #11): the live word is Team's, "Clocked in". Phase 9 (spec 1.2): the normal state is quiet grey words
    // with the green live dot; only the exceptions are amber chips, with the live dot, and "Not clocked in" says how long.
    expect(card).toContain('<span class="b-status" data-dot="green"><span class="b-ldot" data-tone="green" aria-hidden="true"></span>Clocked in</span>');
    expect(card).not.toContain('b-chip--green');
    expect(card).toContain('<span class="b-chip b-chip--amber" data-dot=""><span class="b-ldot" data-tone="amber" aria-hidden="true"></span>Clocked in late</span>');
    expect(card).not.toContain("Person e");
    // When Things to do couldn't load, On now still lists them, with how long in Jose's words.
    const waiting = phone({ value: null, today: today([shift("a", "clocked_in"), shift("e", "not_clocked_in")]) });
    expect(waiting.slice(waiting.indexOf('id="b-home-on"'))).toMatch(/<span class="b-chip b-chip--amber" data-dot=""><span class="b-ldot" data-tone="amber" aria-hidden="true"><\/span>Not clocked in( · [^<]+)?<\/span>/);
    expect(phone({ value: null, connection: "offline", offline: true, today: today([shift("e", "not_clocked_in")]) })).toContain('id="b-home-on"');
    // Gaps G56 (Nov 23, 2026): while Things to do's read is on its way, Today waits for it (it would list them, then drop
    // them and move).
    for (const connection of ["loading", "reconnecting"] as const) expect(phone({ value: null, connection, today: today([shift("e", "not_clocked_in")]) })).not.toContain('id="b-home-on"');
    // Gaps G73 (Nov 23, 2026): the cards below Things to do (Payday, This week) wait for its read too, so its growth moves
    // nothing and the Timecards tile never switches content mid-load; a failed read releases them.
    for (const connection of ["loading", "reconnecting"] as const) expect(phone({ value: null, connection, timecardsReady: false })).toContain('<div class="b-home-col b-home-col--b"></div>');
    expect(phone({ value: null, connection: "unavailable", timecardsReady: false })).toContain("Not available right now");
    expect(card).toMatch(/9:00\sAM\s–\s5:00\sPM/);
    expect(card).not.toMatch(/Person b|Person c/);
    // Nobody on: the card says so and names the next start; it never lists a shift that hasn't begun.
    expect(phone({ today: today([shift("b", "upcoming")]), monitor: monitor([]) })).toContain("Nobody is working right now. Next shift starts 9:00\u202fAM.");
    // A correction that waits on this person is counted and has its row; their own is not.
    const fix = (id: string, title: string, name: string, own=false) => item(id, "TIME_CORRECTION", "REVIEW", "timekeeping", { title, detail: `${name} · Recorded time correction.`, review:reviewFacts(own,own,'TIME_CORRECTION') });
    const counted = phone({ value: needsYou([fix("f1", "Time correction waiting for review", "James Ortiz"), fix("f2", "Your correction needs another reviewer", "Carmen Ruiz",true)], "2026-10-30", []) });
    expect(counted).toMatch(/<h1>1\sthing needs you<\/h1>/);
    expect(counted).toMatch(/>1\stime correction</);
    expect(counted).toContain('href="/app/inbox#todo-corrections"');
    expect(counted).not.toContain("Carmen Ruiz");
  });
  it("keeps an actually clocked-in person on Home without inventing a scheduled shift", () => {
    const live=monitor(["unscheduled"]);
    if(live.state!=="ready")throw Error("Fictional ready monitor expected");
    live.employees[0].scheduleMatch="UNMATCHED";
    const out=phone({today:today([]),monitor:live});
    const card=out.slice(out.indexOf('id="b-home-on"'),out.indexOf('class="b-home-col b-home-col--b"'));
    expect(card).toContain("Person unscheduled");
    // The status says "Clocked in"; the line says since when, and names no place when the card shows only one.
    expect(card).toMatch(/In since 9:02\sAM/);
    expect(card).not.toContain("Condado");
    expect(card).toContain('data-dot="green"><span class="b-ldot" data-tone="green" aria-hidden="true"></span>Clocked in</span>');
    expect(card).not.toContain("Nobody is working right now");
    expect(card).not.toContain("5:00 PM");
    const retired=phone({today:today([]),monitor:null});
    expect(retired).not.toContain("Person unscheduled");
    const matched=phone({today:today([shift("a","clocked_in")]),monitor:monitor(["a"])});
    const matchedCard=matched.slice(matched.indexOf('id="b-home-on"'),matched.indexOf('class="b-home-col b-home-col--b"'));
    expect(matchedCard.slice(matchedCard.indexOf('aria-label="On now"')).match(/<li class="b-li">/g)).toHaveLength(1);
  });
  it("says coverage as one line with a bar, and nothing about what isn't required (Phase 3, OW-006)", () => {
    const coverage = { state: "ready" as const, staffing: { required: 20160, covered: 11610, percent: 57.6 }, positions: { required: 0, covered: 0, percent: null }, lead: { required: 0, covered: 0, percent: null } };
    const out = phone({ week: { firstName: "Carmen", days: [], scheduledHours: 0, people: 0, coverage } });
    expect(out).toContain('<div class="b-cov" role="group" aria-label="Covered this week"><span class="b-cov__k" data-short="true">Staffing <b class="c-num">58%</b></span>');
    expect(out).toContain('<span class="b-cov__bar" aria-hidden="true"><i style="width:57.6%" data-short="true"></i></span>');
    expect(out).toMatch(/193\sh 30\smin of 336\sh/);
    expect(out).not.toMatch(/aren’t required|class="cov /);
  });
  it("draws This week from the page's own hours and shifts per day, today in teal, and nothing estimated", () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday, i) => ({ date: `2026-10-${26 + i}`, weekday, shiftCount: i + 1 }));
    const out = phone({ week: { firstName: "Carmen", days, scheduledHours: 112, people: 3 } });
    // Jose (Nov 22, 2026: no label twice): Today says "Scheduled" and "People"; the week says "Planned" and "Staff".
    expect(out).toContain(">112 h</b><span>Planned</span>");
    expect(out).toContain(">3</b><span>Staff</span>");
    expect(out).toContain(">28</b><span>Shifts</span>");
    expect(out).toContain('class="today" style="height:71%"');
    expect(out).not.toMatch(/estimate|\$/i);
  });
});
// Closed action items include both review and finalization work; the Home total must not call all of them unapproved.
it("describes mixed closed timecard actions as review work before payroll", () => {
  const cards = [
    item("unapproved", "TIMECARD", "REVIEW", "timekeeping", { title: "Needs approval", href: "/app/timecards?start=2026-10-19&end=2026-10-25" }),
    item("approved", "TIMECARD", "REVIEW", "timekeeping", { title: "Approved, awaiting finalization", href: "/app/timecards?start=2026-10-19&end=2026-10-25" }),
  ];
  const out = html({timecards: cards, timecardsReady: true, businessDay: "2026-11-02"});
  expect(out).toContain('aria-label="Review 2 timecards. Before payroll · Oct 19–25. Opens Timecards"');
  expect(out).not.toContain("Approve 2");
  expect(html({timecards: cards.slice(1), timecardsReady: true, businessDay: "2026-11-02"})).toContain("Review 1 timecard");
});

it("shows overdue preparation and its exact period alongside the independent upcoming payday", () => {
  const out = html({ payrollStatus: {state: "ready", overdue: {payday: "2026-10-27", period: {startDate: "2026-10-19", endDate: "2026-10-25"}}} });
  expect(out).toContain("Tue, Nov 3");
  expect(out).toContain("Payroll to prepare");
  expect(out).toContain("Tue, Oct 27");
  expect(out).toContain("Pay period Oct 19, 2026–Oct 25, 2026");
  expect(out).toContain("Payday Tue, Oct 27, 2026");
  expect(out).toContain('href="/app/payroll"');
  expect(out).not.toMatch(/late payment|unpaid/i);
});

it("keeps overdue, ambiguous and unavailable payroll visible without an upcoming payday", () => {
  const overdue = {payday: "2026-10-27", period: {startDate: "2026-10-19", endDate: "2026-10-25"}};
  expect(html({nextPay: null, timecards: [], payrollStatus: {state: "ready", overdue}})).toContain("Payroll to prepare");
  expect(html({nextPay: null, timecards: [], payrollStatus: {state: "ready", reviewRequired: overdue}})).toContain("Payroll schedule needs review");
  const failed = html({nextPay: null, timecards: [], payrollStatus: {state: "unavailable"}});
  expect(failed).toContain("Payroll status isn’t available right now");
  expect(failed).not.toContain("No payroll");
});

it("keeps every closed review card with its own canonical period link across multiple periods", () => {
  const cards = [
    item("draft-old", "TIMECARD", "REVIEW", "timekeeping", { title: "Needs approval", href: "/app/timecards?start=2026-10-19&end=2026-10-25#timecard-a" }),
    item("approved-old", "TIMECARD", "REVIEW", "timekeeping", { title: "Approved, awaiting finalization", href: "/app/timecards?start=2026-10-19&end=2026-10-25#timecard-b" }),
    item("approved-recent", "TIMECARD", "REVIEW", "timekeeping", { title: "Approved, awaiting finalization", href: "/app/timecards?start=2026-10-26&end=2026-11-01#timecard-b" }),
  ];
  const out = html({timecards: cards, timecardsReady: true, businessDay: "2026-11-02"});
  expect(out).toContain('href="/app/timecards?start=2026-10-19&amp;end=2026-10-25" class="c-row" aria-label="Review 2 timecards. Before payroll · Oct 19–25. Opens Timecards"');
  expect(out).toContain('href="/app/timecards?start=2026-10-26&amp;end=2026-11-01" class="c-row" aria-label="Review 1 timecard. Before payroll · Oct 26–Nov 1. Opens Timecards"');
  expect(out).not.toContain("Review 3 timecards");
  expect(out).not.toContain('href="/app/timecards"');
});

it.each(['overdue', 'reviewRequired'] as const)('marks only the %s payroll fact for complete cross-year date wrapping', field => {
  const out = html({payrollStatus: {state: 'ready', [field]: {payday: '2027-01-05', period: {startDate: '2026-12-28', endDate: '2027-01-03'}}}});
  expect(out.match(/<li class="c-home__payroll-fact">/g)).toHaveLength(1);
  expect(out).toMatch(/<li class="c-home__payroll-fact"><a href="\/app\/payroll"[^>]*>.*?Payday Tue, Jan 5, 2027 · Pay period Dec 28, 2026–Jan 3, 2027/);
  expect(out).toContain('<li><div class="c-row"><span class="c-row__main"><span class="c-row__title c-row__title--b">Tue, Nov 3');
});

// Gaps G56 (Nov 23, 2026): Home draws First-week setup only once its read says setup applies. The card's loading shape
// (FirstWeekSetupCard, aria-busy) is not drawn on Home, so a finished workspace never sees the card and Things to do and
// Today don't move when it goes.
it("doesn't draw First-week setup while its read checks", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const sheet = readFileSync(join(__dirname, "../app/app/owner-b-home.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  expect(sheet).toMatch(/\.app-shell\[data-nv-b\] \.b-card#fw-setup:has\(> \.fw-skel\) \{ display: none !important; \}/);
  expect(sheet).not.toContain("fw-skel__");
  const { FirstWeekSetupCard } = await import("./first-week-setup");
  expect(renderToStaticMarkup(createElement(FirstWeekSetupCard, { initial: { state: "loading" } }))).toMatch(/^<section class="b-card" id="fw-setup"[^>]*>[\s\S]*<div class="fw-skel"/);
});
