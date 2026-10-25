import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }), usePathname: () => "/app" }));
vi.mock("./quiet/u1.css", () => ({}));
vi.mock("./quiet/quiet.css", () => ({}));
import { OnShiftSurface, minutesLabel, type OnShiftSurfaceProps } from "./manager-on-shift";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor } from "@/lib/time-clock";

const zone = "America/Puerto_Rico";
const observedAt = "2026-10-25T13:24:00Z"; // 9:24 AM
const shift = (id: string, status: TodayShift["status"], over: Partial<TodayShift> = {}): TodayShift => ({
  id, employeeId: `E-${id}`, employeeName: `Person ${id}`, locationId: "L1", locationName: "Main Office", positionName: "Front desk",
  startAt: "2026-10-25T13:00:00Z", endAt: "2026-10-25T21:00:00Z", status, firstClockInAt: null, late: false, ...over });
const today = (shifts: TodayShift[]): Today => ({ state: "ready", observedAt, validForMs: 30_000, timeZone: zone, today: "2026-10-25",
  counts: { scheduled: shifts.length, clockedIn: shifts.filter(s => s.status === "clocked_in" || s.status === "on_break").length, late: 0, notClockedIn: 0 },
  shifts, missed: shifts.filter(s => s.status === "not_clocked_in" || s.status === "no_punches") });
const corrections = { snapshot: null, connection: "ready" as const, busyId: null, notice: null, retry: null, decide: vi.fn(), retryDecision: vi.fn(), refresh: vi.fn() };
const readyCorrections = { ...corrections, snapshot: { state: "ready" as const, validForMs: 30_000, observedAt, timeZone: zone, requests: [] } };
const emptyReview = { review: { state: "ready" as const, engineVersion: 1 as const, workspaceId: "w", timeZone: zone, observedAt, validForMs: 30_000, scope: { kind: "TODAY_AND_OPEN" as const, localDate: "2026-10-25", dayStartAt: "2026-10-25T04:00:00Z" },
  groups: [], recordCount: 0, signalCount: 0, affectedEmployeeCount: 0, pendingCorrectionCount: 0, labels: { employees: [], locations: [] },
  coverage: { state: "complete" as const, limitations: [], deferredCapabilities: [] } }, refreshing: false, paused: false };
const render = (props: Partial<OnShiftSurfaceProps>) => renderToStaticMarkup(<OnShiftSurface dateLabel="Sunday, October 25" timeZone={zone} today={null} monitor={null}
  attendance={emptyReview as OnShiftSurfaceProps["attendance"]} onRefreshAttendance={() => {}} corrections={readyCorrections} {...props} />).replace(/ /g, " ");

it("T-1: back to Today, the On shift title and a live Updated time instead of Refresh", () => {
  const html = render({ today: today([shift("A", "clocked_in", { firstClockInAt: "2026-10-25T13:02:00Z" })]) });
  expect(html).toContain(">Today</a>");
  expect(html).toContain('href="/app"');
  expect(html).toContain(">On shift</h1>");
  expect(html).toContain("Sunday, October 25 · Updated 9:24 AM");
  expect(html).not.toMatch(/Refresh|Updates every|TODAY|to review ·|people affected/);
  expect(html).not.toMatch(/nv-card|nv-pageband|attendance-review-summary/);
});

it("lists who is on the clock with when and where, on break in grey and lateness in the one red", () => {
  const monitor: ClockMonitor = { state: "ready", observedAt, timeZone: zone, validForMs: 30_000, employees: [
    { timeEntryId: "t1", employeeId: "E-A", employeeName: "Person A", locationId: "L1", locationName: "Main Office", deviceId: "d", clockInAt: "2026-10-25T13:12:00Z", state: "ON_FLOOR", elapsedMinutes: 12, breakElapsedMinutes: null, positionName: "Front desk", scheduleMatch: "MATCHED" },
    { timeEntryId: "t2", employeeId: "E-B", employeeName: "Person B", locationId: "L1", locationName: "Main Office", deviceId: "d", clockInAt: "2026-10-25T12:58:00Z", breakStartAt: "2026-10-25T13:20:00Z", state: "ON_BREAK", elapsedMinutes: 26, breakElapsedMinutes: 4, positionName: null, scheduleMatch: "MATCHED" },
  ] };
  const html = render({ today: today([shift("A", "clocked_in", { firstClockInAt: "2026-10-25T13:12:00Z", late: true }), shift("B", "on_break", { firstClockInAt: "2026-10-25T12:58:00Z" })]), monitor });
  expect(html).toContain("<b>Person B</b><i>In at 8:58 AM · Main Office</i>");
  expect(html).toContain('<span class="q-rv">On break</span>');
  expect(html).toContain("<b>Person A</b><i>In at 9:12 AM · Front desk</i>");
  expect(html).toContain('<span class="q-rv q-rv--alert">12 min</span>');
});

it("says who isn't in yet, with how long since the shift began, and opens their timecard", () => {
  const html = render({ today: today([shift("C", "not_clocked_in"), shift("D", "no_punches", { startAt: "2026-10-25T04:00:00Z", endAt: "2026-10-25T12:00:00Z" })]) });
  expect(html).toContain(">Not in yet</h2>");
  expect(html).toContain("<b>Person C</b><i>Shift began at 9:00 AM</i>");
  expect(html).toContain('<span class="q-rv q-rv--alert">24 min</span>');
  expect(html).toContain("Shift ended at 8:00 AM · No clock-in");
  expect(html).toContain('href="/app/timecards#timecard-E-C"');
});

it("with nobody on the clock: one row naming who's next; empty sections are left out", () => {
  const html = render({ today: today([shift("M", "upcoming", { employeeName: "Marco Silva", startAt: "2026-10-25T20:00:00Z" })]) });
  expect(html).toContain("<b>No one on shift yet</b><i>Next: Marco Silva at 4:00 PM</i>");
  expect(html).not.toContain("Not in yet");
  expect(html).not.toContain(">To review<");
  expect(html).not.toContain("Correction requests");
  expect(html).toContain("How clock-ins are checked");
});

it("while loading shows the page's shape, never zeros; a failed read offers Try again", () => {
  const loading = render({});
  expect(loading).toContain("q-skel__rows");
  expect(loading).not.toMatch(/No one on shift|0 on shift/);
  const failed = render({ today: { state: "unavailable", reason: "read_failed" } });
  expect(failed).toContain("Who’s on shift isn’t available");
  expect(failed).toContain(">Try again</button>");
  expect(render({ offline: true })).toContain("You’re offline");
});

it("lists correction requests with the decision on the same page", () => {
  const request = { id: "11111111-1111-4111-8111-111111111111", kind: "MISSING_ENTRY" as const, status: "PENDING" as const, revision: 2, createdAt: observedAt,
    locationId: "L1", locationName: "Main Office", originalStartAt: null, originalEndAt: null, proposedStartAt: "2026-10-25T12:00:00Z", proposedEndAt: "2026-10-25T20:00:00Z",
    breakName: null, reason: "Tablet was down.", baseChanged: false, context: { state: "none" as const }, employeeName: "Alexandra Rivera", isSelf: false };
  const html = render({ today: today([]), corrections: { ...corrections, snapshot: { ...readyCorrections.snapshot, requests: [request] } } });
  expect(html).toContain(">Correction requests</h2><span class=\"q-sec__aside\">1</span>");
  expect(html).toContain("<i>Missed punch · Oct 25, 8:00 AM – 4:00 PM</i>");
  expect(html).toContain('aria-label="Approve correction for Alexandra Rivera"');
  expect(html).toContain("The original Clocker record is kept.");
});

it("says durations in the shared format", () => {
  expect(minutesLabel("2026-10-25T13:00:00Z", "2026-10-25T13:00:20Z")).toBe("1 min");
  expect(minutesLabel("2026-10-25T13:00:00Z", "2026-10-25T14:05:00Z")).toBe("1 h 5 min");
});
