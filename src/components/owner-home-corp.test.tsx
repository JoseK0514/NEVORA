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
  item("gap1", "COVERAGE_GAP", "URGENT", "scheduling", { title: "Barista needed 1 – 3 PM", detail: "Condado · 2 people free", href: "/app/schedule/coverage?shift=gap1" }),
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
    expect(out).toContain("Barista needed 1 – 3 PM");
    expect(out).toContain('href="/app/schedule/coverage?shift=gap1"');
    expect(out.match(/>Find cover</g)).toHaveLength(1);
    expect(out.match(/class="c-btn( c-btn--md)?"/g)).toHaveLength(1);
  });
  it("names the next payday with its period and the timecards still to approve", () => {
    expect(html()).toContain("Payday tomorrow");
    expect(html()).toContain("Oct 26 – Nov 1 · 2 timecards to approve");
    expect(html({ nextPay: null, timecards: [] })).not.toContain('aria-label="Payday"');
  });
  it("lists Things to do with the shared count, one row per kind, each opening where the decision is made", () => {
    const out = html();
    expect(out).toContain("Things to do (5)");
    expect(out).toContain('aria-label="Time off requests, 1"');
    expect(out).toContain('aria-label="Shift swaps, 2"');
    expect(out).toContain('href="/app/exchange"');
    expect(out).toContain('aria-label="Shifts with no clock-in, 1"');
    expect(out).not.toContain("TIMECARD title");
  });
  it("says so while loading or offline, offers Try again when a read fails, and never shows a false zero", () => {
    expect(html({ value: null, connection: "loading" })).toContain("Checking what needs you…");
    expect(html({ value: null, connection: "unavailable", onRetryActions: () => {} })).toContain(">Try again<");
    expect(html({ value: null, connection: "offline", offline: true })).not.toContain(">Try again<");
    const failedToday = html({ today: { state: "unavailable", reason: "read_failed" } as Today, onRetryToday: () => {} });
    expect(failedToday).toContain("Who’s on shift isn’t available right now.");
    expect(failedToday).not.toContain("c-stat__value");
    expect(html({ value: null })).toContain('<dd class="c-stat__value">…</dd>');
  });
  it("shows the all-set line when nothing needs the Owner", () => {
    const out = html({ value: needsYou([], "2026-10-30", []) });
    expect(out).toContain("Things to do (0)");
    expect(out).toContain("You’re all set. Nothing needs you right now.");
  });
});
