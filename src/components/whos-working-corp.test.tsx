import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from '@rstest/core';
import type { ClockMonitor } from "@/lib/time-clock";
import type { Today, TodayShift } from "@/lib/today/project";

rs.mock("next/link", () => ({ default: ({ children, prefetch: _p, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", props, children) }));
const { WhosWorkingView } = await import("./whos-working-corp");

const person = (id: string, clockInAt: string, extra: Partial<Extract<ClockMonitor, { state: "ready" }>["employees"][number]> = {}) => ({ timeEntryId: `t-${id}`, employeeId: id, employeeName: `Person ${id}`, locationId: "l1", locationName: "Condado", deviceId: "d", clockInAt, state: "ON_FLOOR" as const, elapsedMinutes: 60, breakElapsedMinutes: null, positionName: null, scheduleMatch: "MATCHED" as const, ...extra });
const monitor = (employees: ReturnType<typeof person>[]): ClockMonitor => ({ state: "ready", observedAt: "2026-10-30T12:24:00Z", timeZone: "America/Puerto_Rico", validForMs: 30000, employees });
const shift = (id: string, status: TodayShift["status"], startAt: string): TodayShift => ({ id, employeeId: id, employeeName: `Person ${id}`, locationId: "l1", locationName: "Condado", positionName: null, startAt, endAt: "2026-10-30T20:00:00Z", status, firstClockInAt: null, late: false });
const today = (shifts: TodayShift[]): Today => ({ state: "ready", observedAt: "2026-10-30T12:24:00Z", validForMs: 30000, timeZone: "America/Puerto_Rico", today: "2026-10-30", counts: { scheduled: shifts.length, clockedIn: 0, late: 0, notClockedIn: 0 }, shifts, missed: shifts.filter(s => s.status === "not_clocked_in" || s.status === "no_punches") });
const html = (props: Partial<ComponentProps<typeof WhosWorkingView>>) => renderToStaticMarkup(createElement(WhosWorkingView, { monitor: null, today: null, ...props }));

it("lists who is clocked in (earliest first), who isn't in yet with how late, and shifts that ended with no clock-in", () => {
  const out = html({ monitor: monitor([person("b", "2026-10-30T11:58:00Z"), person("a", "2026-10-30T09:54:00Z", { state: "ON_BREAK", breakStartAt: "2026-10-30T12:10:00Z" })]),
    today: today([shift("c", "not_clocked_in", "2026-10-30T12:00:00Z"), shift("d", "no_punches", "2026-10-30T04:00:00Z")]) });
  expect(out).toContain('>Clocked in<span class="c-count c-num"><span class="sr-only">\u00a0</span>2</span><');
  expect(out.replace(/\u202f/g, " ")).toContain('<span class="c-meta c-num">Updated 8:24 AM</span>');
  expect(out).not.toContain(">Live<");
  expect(out).not.toContain("c-pill");
  expect(out.indexOf("Person a")).toBeLessThan(out.indexOf("Person b"));
  // keepWhole holds each time together with no-break spaces; compare the words.
  const words = out.replace(/[\u00a0\u202f]/g, " ");
  expect(words).toContain("On break since 8:10 AM");
  expect(words).toContain("In since 7:58 AM");
  expect(out).toContain('>Not clocked in<span class="c-count c-num"><span class="sr-only">\u00a0</span>1</span><');
  expect(words).toContain("Due 8:00 AM");
  expect(out).toContain("c-row__value--amber\">24 min<");
  expect(out).toContain('>Missed clock-ins<span class="c-count c-num"><span class="sr-only">\u00a0</span>1</span><');
  expect(out).toContain('href="/app/timecards#timecard-d"');
  expect(out).toContain('<a class="c-nav__back" href="/app">');
});

it("says when clock-ins are loading or unavailable and never shows a false empty list", () => {
  expect(html({})).toContain("Checking who’s clocked in…");
  expect(html({ monitor: { state: "unavailable", reason: "read_failed" } })).toContain("Clock-ins aren’t available right now.");
  expect(html({})).not.toContain("No one is clocked in");
  expect(html({ monitor: monitor([]) })).toContain("No one is clocked in right now</b><span class=\"c-empty__body\">They show up here when they clock in.</span>");
  expect(html({ monitor: monitor([]), today: { state: "unavailable", reason: "read_failed" } as Today, onRetry: () => {} })).toContain(">Try again<");
});

it("shows five, then Show N more", () => {
  const out = html({ monitor: monitor(["a", "b", "c", "d", "e", "f", "g"].map((id, i) => person(id, `2026-10-30T1${i}:00:00Z`))) });
  expect(out.match(/c-row c-row--/g)?.length ?? out.match(/class="c-row"/g)?.length).toBe(5);
  expect(out).toContain(">Show 2 more<");
});

// Review 30 (D29): a punch from an earlier day says its day; a punch the attendance review flags as open past 12 hours
// carries the red chip on its row, and the folded "Clock-ins to check" row shows the count and the chip.
it("says the day of an earlier clock-in and shows the 12-hour flag with the count to check", () => {
  const out = renderToStaticMarkup(createElement(WhosWorkingView, { monitor: monitor([person("m", "2026-10-30T03:26:00Z"), person("v", "2026-10-26T14:58:00Z"), person("s", "2026-10-30T11:00:00Z")]),
    today: today([]), toCheck: 2, openPastLimit: new Set(["t-m"]) }, createElement("p", null, "review"))).replace(/[\u00a0\u202f]/g, " ");
  expect(out).toContain("In since 11:26 PM yesterday");
  expect(out).toContain("In since Mon 10:58 AM");
  expect(out).toContain("In since 7:00 AM");
  expect(out).toContain('<span class="c-who__name">Person m</span><span class="b-chip b-chip--red">No clock-out after 12 hours</span>');
  expect(out).not.toContain('<span class="c-who__name">Person s</span>');
  // Final polish D3 (#25): the count stays beside the heading; the chip follows the sub-line.
  expect(out).toMatch(/Clock-ins to check<\/span> <span class="b-count">2<\/span><\/span> <span class="c-row__detail"><span>[^<]*<\/span> <span class="b-chip b-chip--red">No clock-out after 12 hours<\/span>/);
  // Gaps G65 (Nov 23, 2026): the row is named by what it shows; open or closed is aria-expanded, not a rewording.
  const row = out.match(/<button type="button" class="c-row"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? "";
  expect(row).toContain('aria-expanded="false"');
  expect(row).not.toContain("aria-label");
  expect(row).not.toContain("aria-controls");
  expect(row.replace(/<[^>]+>/g, "")).toBe("Clock-ins to check 2 Times that don’t match the schedule or breaks No clock-out after 12 hours");
});

// Gaps G41: a location Manager's Who's working names the place once, beside the date, on desktop and phones.
it("names the place beside the date when one is given, and only the date otherwise", () => {
  const withPlace = html({ today: today([]), place: "Condado" });
  expect(withPlace.match(/Fri, Oct 30 · Condado/g)).toHaveLength(2);
  const plain = html({ today: today([]) });
  expect(plain).toContain("Fri, Oct 30");
  expect(plain).not.toContain("Fri, Oct 30 ·");
});
