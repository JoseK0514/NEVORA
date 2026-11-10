import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor } from "@/lib/time-clock";
import type { ActionItem } from "@/lib/action-center/project";
import { needsYou } from "@/lib/action-center/needs-you";

vi.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
// The kit's "Couldn't load · Try again" refreshes the page through the router when no retry is given.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }), usePathname: () => "/app" }));
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
  ({ id, type, priority, category, title: `${type} title`, detail: `${type} detail`, href: `/app/go/${id}`, ...extra }) as ActionItem;

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
const html = (props: Partial<ComponentProps<typeof OwnerHomeCorp>> = {}) => renderToStaticMarkup(<OwnerHomeCorp {...base} {...props} />);

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
    expect(before).toContain(">Pay period Oct 26 – Nov 1<");
    expect(before).toContain(">Approve timecards<");
    expect(before).toContain(">You can approve from Mon, Nov 2<");
    expect(before).not.toMatch(/Approve \d/);
    // Once it has ended: the count, with the one verb.
    const after = html({ timecards: open, timecardsReady: true, businessDay: "2026-11-02" }).replace(/\u00a0/g, " ");
    expect(after).toContain(">Review 2 timecards<");
    expect(after).toContain("Before payroll · Oct 26 – Nov 1");
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
  expect(out).toContain("Pay period Oct 19, 2026 – Oct 25, 2026");
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
  expect(out).toContain('href="/app/timecards?start=2026-10-26&amp;end=2026-11-01" class="c-row" aria-label="Review 1 timecard. Before payroll · Oct 26 – Nov 1. Opens Timecards"');
  expect(out).not.toContain("Review 3 timecards");
  expect(out).not.toContain('href="/app/timecards"');
});
