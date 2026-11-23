import * as actualActionCenter from "@/components/manager-action-center" with { rstest: 'importActual' };
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, rs } from "@rstest/core";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor } from "@/lib/time-clock";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import { onlyB } from "@/components/owner-b/test-support";

// The location Manager's Home is the company Manager's Direction B Home (HomeB) fed by the scoped reads; these fixtures
// stand in for /api/manager/today, the clock monitor and the scoped action center. Fictional data only.
const reads = rs.hoisted(() => ({ today: null as unknown, monitor: null as unknown, actions: null as unknown }));
rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }), usePathname: () => "/app" }));
rs.mock("@/components/manager-today", () => ({ useToday: () => ({ snapshot: reads.today, refreshing: false, refresh: () => {} }) }));
rs.mock("@/components/clean/use-clock-monitor", () => ({ useClockMonitor: () => ({ monitor: reads.monitor, refreshing: false, paused: false }) }));
rs.mock("@/components/manager-action-center", () => ({ ...actualActionCenter, useActionCenter: () => ({ snapshot: reads.actions, connection: reads.actions ? "ready" : "loading", refresh: () => {} }) }));
const { ScopedHomeLive, ScopedWhosWorking, actionsAt, todayAt } = await import("./scoped-home");

const shift = (id: string, status: TodayShift["status"], locationId = "loc-2"): TodayShift => ({
  id, employeeId: id, employeeName: `Person ${id.toUpperCase()}`, locationId, locationName: locationId === "loc-2" ? "Condado" : "Santurce", positionName: "Barista",
  startAt: "2026-11-22T13:00:00Z", endAt: "2026-11-22T21:00:00Z", status, firstClockInAt: status === "clocked_in" ? "2026-11-22T13:01:00Z" : null, late: false,
});
const today = (shifts: TodayShift[]): Today => ({ state: "ready", observedAt: "2026-11-22T15:00:00Z", validForMs: 60_000, timeZone: "America/Puerto_Rico", today: "2026-11-22",
  counts: { scheduled: shifts.length, clockedIn: 1, late: 0, notClockedIn: 1 }, shifts, missed: shifts.filter(s => s.status === "not_clocked_in") });
const monitor = (people: [string, string][]): ClockMonitor => ({ state: "ready", observedAt: "2026-11-22T15:00:00Z", timeZone: "America/Puerto_Rico", validForMs: 60_000,
  employees: people.map(([id, locationId]) => ({ timeEntryId: `t-${id}`, employeeId: id, employeeName: `Person ${id.toUpperCase()}`, locationId, locationName: "", deviceId: "d1",
    clockInAt: "2026-11-22T13:01:00Z", state: "ON_FLOOR", elapsedMinutes: 120, breakElapsedMinutes: null, positionName: null, scheduleMatch: "MATCHED" })) });
const gap = (id: string, locationId: string): ActionItem => ({ id, type: "COVERAGE_GAP", priority: "URGENT", category: "scheduling", locationId, title: "Position not covered",
  detail: "2026-11-22 · 6:00 PM–10:00 PM · Barista: 1 open", dateTime: "2026-11-22T18:00", href: `/app/schedule/coverage?shift=${id}` }) as ActionItem;
const center = (items: ActionItem[]): ActionCenter => ({ state: "ready", observedAt: "2026-11-22T15:00:00Z", validForMs: 30_000, weekStart: "2026-11-16", items,
  counts: { total: items.length, scheduling: items.length, requests: 0, timekeeping: 0 }, limitedAttendance: false });
const homeB = (extra: Record<string, unknown> = {}) => ({ firstName: "Daniel", place: <span className="b-date b-place">Condado</span>, shortcuts: ["shift", "timeOff"] as ("shift" | "timeOff")[],
  days: ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"].map((date, index) => ({ date, weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index], shiftCount: 2 })),
  scheduledHours: 112, people: 4, ...extra });
const render = (extra: Partial<ComponentProps<typeof ScopedHomeLive>> = {}) => onlyB(renderToStaticMarkup(<ScopedHomeLive greeting="Welcome back, Daniel" dateLabel="Sunday, November 22"
  timeZone="America/Puerto_Rico" workspaceName="Fictional Cafe" weekStart="2026-11-16" actorId="OWN-DANI" homeB={homeB()}
  week={{ weekStart: "2026-11-16", weekLabel: "Nov 16 – 22", plannedShifts: 14, availabilitySubmitted: 0, availabilityEligible: 0, locations: [] }} {...extra} />));

beforeEach(() => {
  reads.today = today([shift("a", "clocked_in"), shift("b", "not_clocked_in"), shift("c", "clocked_in", "loc-1")]);
  reads.monitor = monitor([["a", "loc-2"], ["c", "loc-1"]]);
  reads.actions = center([gap("g2", "loc-2"), gap("g1", "loc-1")]);
});

it("is the company Manager's Direction B Home: the band names the place, three live figures, Things to do, shortcuts, Today and This week", () => {
  const html = render({ locationId: "loc-2" });
  expect(html).toContain("Good ");
  expect(html).toContain('class="b-date b-place">Condado</span>');
  for (const label of ["Clocked in", "Not clocked in", "Open shifts", "Things to do", "Find cover", "Add shift", "Time off", "Today", "This week", "Shifts by day"]) expect(html).toContain(label);
  // Nothing this Manager can't open or that has no scoped read: payroll, timecard counts, company-wide shortcuts.
  for (const absent of ["Payroll", "payday", "Timecards", "Add employee", "Send update", "company-wide"]) expect(html).not.toContain(absent);
  // Each fact once (Jose, Nov 22, 2026): the band's title has the count and the band's figure the open shifts, so the
  // card has no count pill and its row doesn't repeat the number.
  expect(html).not.toContain('class="b-pill"');
  expect(html).toContain("Cover an open shift");
});

it("keeps only the chosen location's shifts, clock-ins and open shifts", () => {
  const html = render({ locationId: "loc-2" });
  expect(html).toContain("Person A");
  expect(html).not.toContain("Person C");
  expect(html).toMatch(/Open shifts<\/span>(?: |<span class="b-sr">[ \u00a0]<\/span>)<span class="b-live__v">1</);
  const all = render();
  expect(all).toContain("Person C");
  expect(all).toMatch(/Open shifts<\/span>(?: |<span class="b-sr">[ \u00a0]<\/span>)<span class="b-live__v">2</);
  // With two places on the card, each row says where.
  expect(all).toContain("Santurce");
});

it("opens Who's working on the chosen place (gaps G41): See everyone, the faces row and the band's Clocked in keep ?location=", () => {
  const one = render({ locationId: "loc-2" });
  expect(one).toContain('href="/app?view=attendance&amp;location=loc-2" class="b-card__a"');
  expect(one).toContain('<a href="/app?view=attendance&amp;location=loc-2" class="b-live__a">');
  expect(one).not.toContain('href="/app?view=attendance"');
  // All of this Manager's places: the company view's link, with no place.
  const all = render();
  expect(all).toContain('href="/app?view=attendance" class="b-card__a"');
  expect(all).not.toContain("location=");
});

it("leaves This week out when the week's schedule couldn't be read", () => {
  expect(render({ homeB: homeB({ thisWeek: false }) })).not.toContain("This week");
});

it("filters items tied to a place and keeps a person's request, with counts that follow", () => {
  const request = { id: "r1", type: "TIME_OFF", priority: "REVIEW", category: "requests", title: "Time off", detail: "", href: "/app/requests" } as ActionItem;
  const kept = actionsAt(center([gap("g2", "loc-2"), gap("g1", "loc-1"), request]), "loc-2");
  expect(kept?.state === "ready" && kept.items.map(item => item.id)).toEqual(["g2", "r1"]);
  expect(kept?.state === "ready" && kept.counts).toEqual({ total: 2, scheduling: 1, requests: 1, timekeeping: 0 });
  const day = todayAt(today([shift("a", "clocked_in"), shift("c", "not_clocked_in", "loc-1")]), "loc-2");
  expect(day?.state === "ready" && [day.shifts.length, day.missed.length, day.counts.clockedIn, day.counts.notClockedIn]).toEqual([1, 0, 1, 0]);
});

it("Who's working shows the same scoped reads with a way back to Home and no company-wide attendance review", () => {
  const html = renderToStaticMarkup(<ScopedWhosWorking homeHref="/app?location=loc-2" locationId="loc-2" />);
  expect(html).toContain("Who’s working");
  expect(html).toContain('href="/app?location=loc-2"');
  expect(html).toContain("Person A");
  expect(html).not.toContain("Person C");
  expect(html).not.toContain("Clock-ins to check");
});
