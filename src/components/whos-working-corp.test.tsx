import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { ClockMonitor } from "@/lib/time-clock";
import type { Today, TodayShift } from "@/lib/today/project";

vi.mock("next/link", () => ({ default: ({ children, prefetch: _p, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", props, children) }));
const { WhosWorkingView } = await import("./whos-working-corp");

const person = (id: string, clockInAt: string, extra: Partial<Extract<ClockMonitor, { state: "ready" }>["employees"][number]> = {}) => ({ timeEntryId: `t-${id}`, employeeId: id, employeeName: `Person ${id}`, locationId: "l1", locationName: "Condado", deviceId: "d", clockInAt, state: "ON_FLOOR" as const, elapsedMinutes: 60, breakElapsedMinutes: null, positionName: null, scheduleMatch: "MATCHED" as const, ...extra });
const monitor = (employees: ReturnType<typeof person>[]): ClockMonitor => ({ state: "ready", observedAt: "2026-10-30T12:24:00Z", timeZone: "America/Puerto_Rico", validForMs: 30000, employees });
const shift = (id: string, status: TodayShift["status"], startAt: string): TodayShift => ({ id, employeeId: id, employeeName: `Person ${id}`, locationId: "l1", locationName: "Condado", positionName: null, startAt, endAt: "2026-10-30T20:00:00Z", status, firstClockInAt: null, late: false });
const today = (shifts: TodayShift[]): Today => ({ state: "ready", observedAt: "2026-10-30T12:24:00Z", validForMs: 30000, timeZone: "America/Puerto_Rico", today: "2026-10-30", counts: { scheduled: shifts.length, clockedIn: 0, late: 0, notClockedIn: 0 }, shifts, missed: shifts.filter(s => s.status === "not_clocked_in" || s.status === "no_punches") });
const html = (props: Partial<ComponentProps<typeof WhosWorkingView>>) => renderToStaticMarkup(createElement(WhosWorkingView, { monitor: null, today: null, ...props }));

it("lists who is clocked in (earliest first), who isn't in yet with how late, and shifts that ended with no clock-in", () => {
  const out = html({ monitor: monitor([person("b", "2026-10-30T11:58:00Z"), person("a", "2026-10-30T09:54:00Z", { state: "ON_BREAK", breakStartAt: "2026-10-30T12:10:00Z" })]),
    today: today([shift("c", "not_clocked_in", "2026-10-30T12:00:00Z"), shift("d", "no_punches", "2026-10-30T04:00:00Z")]) });
  expect(out).toContain(">Clocked in (2)<");
  expect(out).toContain(">Live<");
  expect(out.indexOf("Person a")).toBeLessThan(out.indexOf("Person b"));
  expect(out).toContain("On break since 8:10 AM");
  expect(out).toContain("In since 7:58 AM");
  expect(out).toContain(">Not in yet (1)<");
  expect(out).toContain("Due 8:00 AM");
  expect(out).toContain("c-row__value--red\">24 min late<");
  expect(out).toContain(">No clock-in (1)<");
  expect(out).toContain('href="/app/timecards#timecard-d"');
  expect(out).toContain('<a class="c-nav__back" href="/app">');
});

it("says when clock-ins are loading or unavailable and never shows a false empty list", () => {
  expect(html({})).toContain("Checking who’s clocked in…");
  expect(html({ monitor: { state: "unavailable", reason: "read_failed" } })).toContain("Clock-ins aren’t available right now.");
  expect(html({})).not.toContain("No one is clocked in");
  expect(html({ monitor: monitor([]) })).toContain("No one is clocked in right now.");
  expect(html({ monitor: monitor([]), today: { state: "unavailable", reason: "read_failed" } as Today, onRetry: () => {} })).toContain(">Try again<");
});

it("shows five, then Show N more", () => {
  const out = html({ monitor: monitor(["a", "b", "c", "d", "e", "f", "g"].map((id, i) => person(id, `2026-10-30T1${i}:00:00Z`))) });
  expect(out.match(/c-row c-row--/g)?.length ?? out.match(/class="c-row"/g)?.length).toBe(5);
  expect(out).toContain(">Show 2 more<");
});
