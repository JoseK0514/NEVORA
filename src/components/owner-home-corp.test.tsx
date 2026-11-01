import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor } from "@/lib/time-clock";
import type { ActionItem } from "@/lib/action-center/project";
import { needsYou } from "@/lib/action-center/needs-you";

vi.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
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
  it("counts who is clocked in out of who is scheduled, shifts with no clock-in and open shifts, and offers Find cover once", () => {
    const out = html();
    expect(out).toMatch(/Clocked in<\/dt><dd class="c-stat__value">1 of 3<\/dd>/);
    expect(out).toMatch(/No clock-in<\/dt><dd class="c-stat__value c-stat__value--red">1<\/dd>/);
    expect(out).toMatch(/Open shifts<\/dt><dd class="c-stat__value c-stat__value--amber">1<\/dd>/);
    // The open shift reads as on Things to do (board O-Inbox wording) and opens its coverage review.
    expect(out).toContain(">Barista 1:00 PM – 3:00 PM<");
    expect(out).toContain(">Today · Condado · 1 open<");
    expect(out).toMatch(/href="\/app\/schedule\/coverage\?shift=gap1[^"]*"/);
    expect(out.match(/>Find cover</g)).toHaveLength(1);
    expect(out.match(/class="c-btn( c-btn--md)?"/g)).toHaveLength(1);
  });
  it("names the next payday and says honestly where its timecards stand", () => {
    const open = [item("card1", "TIMECARD", "REVIEW", "timekeeping", { href: "/app/timecards?start=2026-10-26&end=2026-11-01#timecard-a" }),
      item("card2", "TIMECARD", "REVIEW", "timekeeping", { href: "/app/timecards?start=2026-10-26&end=2026-11-01#timecard-b" })];
    // Before the period ends, approvals aren't open: the card says when they open, not "2 timecards to approve".
    const before = html({ timecards: open, timecardsReady: true, businessDay: "2026-10-30" }).replace(/\u00a0/g, " ");
    expect(before).toContain("Payday tomorrow");
    expect(before).toContain("Oct 26 – Nov 1 · Approvals open after Sunday");
    expect(before).not.toContain("to approve");
    expect(before).not.toMatch(/>Review</);
    // Once it has ended, the count and Review.
    const after = html({ timecards: open, timecardsReady: true, businessDay: "2026-11-02" }).replace(/\u00a0/g, " ");
    expect(after).toContain("Oct 26 – Nov 1 · 2 timecards to approve");
    expect(after).toMatch(/>Review</);
    // P3: never "approved" — not while loading, not when the read failed, not when there are simply none.
    const loading = html({ value: null, connection: "loading", timecards: [], timecardsReady: false, businessDay: "2026-10-30" });
    expect(loading).toContain("Oct 26 – Nov 1 · Checking timecards…");
    const failed = html({ value: null, connection: "unavailable", timecards: [], timecardsReady: false, businessDay: "2026-10-30" });
    expect(failed).toContain(">Oct 26 – Nov 1 · Timecards aren’t available right now<");
    const none = html({ timecards: [], timecardsReady: true, businessDay: "2026-11-02" });
    expect(none).toContain("Oct 26 – Nov 1 · No timecards waiting");
    for (const out of [before, after, loading, failed, none]) expect(out).not.toMatch(/approved/i);
    expect(html({ nextPay: null, timecards: [] })).not.toContain('aria-label="Payday"');
  });
  it("lists only decisions under Things to do, so the shift counts in Today don't show twice", () => {
    const out = html();
    expect(out).toContain(">Things to do<");
    expect(out).not.toContain("Things to do (");
    expect(out).toContain('aria-label="Time off requests, 1"');
    expect(out).toContain('aria-label="Shift swaps, 2"');
    expect(out).toContain('href="/app/exchange"');
    expect(out).not.toContain("Shifts with no clock-in");
    expect(out).not.toContain('aria-label="Open shifts');
    expect(out).not.toContain("TIMECARD title");
  });
  it("says so while loading or offline, offers Try again when a read fails, and never shows a false zero", () => {
    expect(html({ value: null, connection: "loading" })).toContain("Checking what needs you…");
    expect(html({ value: null, connection: "unavailable", onRetryActions: () => {} })).toContain(">Try again<");
    expect(html({ value: null, connection: "unavailable", onRetryActions: () => {} })).toContain('class="c-error-card"');
    expect(html({ value: null, connection: "offline", offline: true })).not.toContain(">Try again<");
    const failedToday = html({ today: { state: "unavailable", reason: "read_failed" } as Today, onRetryToday: () => {} });
    expect(failedToday).toContain("Who’s on shift isn’t available");
    expect(failedToday).not.toContain("c-stat__value");
    expect(html({ value: null })).toContain('<dd class="c-stat__value">…</dd>');
    // P7: while Today loads, the card already has its final shape (the three counts as "…").
    const loadingToday = html({ today: null, value: null, connection: "loading" });
    expect(loadingToday).toContain('aria-busy="true"');
    expect(loadingToday.match(/<dd class="c-stat__value">…<\/dd>/g)).toHaveLength(3);
  });
  it("shows the all-set card when nothing needs the Owner, and says where shift items are when only those wait", () => {
    const out = html({ value: needsYou([], "2026-10-30", []) });
    expect(out).toContain("You’re all set</b>");
    expect(out).toContain("Nothing needs you right now.");
    const shiftsOnly = html({ value: needsYou([items[0]], "2026-10-30", []) });
    expect(shiftsOnly).toContain("No requests waiting</b>");
  });
});
