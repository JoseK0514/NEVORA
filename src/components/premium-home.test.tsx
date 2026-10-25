import { describe, expect, it } from "vitest";
import { timelineLanes } from "./premium-home";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor, ClockMonitorEmployee } from "@/lib/time-clock";

const shift = (id: string, status: TodayShift["status"], extra: Partial<TodayShift> = {}): TodayShift => ({
  id, employeeId: id, employeeName: `Person ${id}`, locationId: "main", locationName: "Main Office", positionName: null,
  startAt: "2026-10-20T13:00:00Z", endAt: "2026-10-20T21:00:00Z", status, firstClockInAt: null, late: false, ...extra,
});
// 11:18 PM in Puerto Rico (UTC-4): every planned shift has ended.
const today = (shifts: TodayShift[]): Extract<Today, { state: "ready" }> => ({
  state: "ready", observedAt: "2026-10-21T03:18:00Z", validForMs: 60_000, timeZone: "America/Puerto_Rico", today: "2026-10-20",
  counts: { scheduled: shifts.length, clockedIn: 0, late: 0, notClockedIn: 0 }, shifts, missed: [],
});
const open = (employeeId: string, clockInAt: string, extra: Partial<ClockMonitorEmployee> = {}): ClockMonitorEmployee => ({
  timeEntryId: `t-${employeeId}`, employeeId, employeeName: `Person ${employeeId}`, locationId: "main", locationName: "Main Office", deviceId: "d1",
  clockInAt, state: "ON_FLOOR", elapsedMinutes: 0, breakElapsedMinutes: null, positionName: null, scheduleMatch: "UNMATCHED", ...extra,
});
const monitor = (employees: ClockMonitorEmployee[]): ClockMonitor => ({ state: "ready", observedAt: "2026-10-21T03:18:00Z", timeZone: "America/Puerto_Rico", validForMs: 60_000, employees });
const hour = 3_600_000;

describe("Home timeline (UI-1, PD2, UX6)", () => {
  it("always reaches now, to the hour after it, even when every shift ended hours ago", () => {
    const { from, to, now } = timelineLanes(today([shift("a", "no_punches")]), null);
    expect(new Date(from).toISOString()).toBe("2026-10-20T13:00:00.000Z");
    expect(now).toBeLessThan(to);
    expect(new Date(to).toISOString()).toBe("2026-10-21T04:00:00.000Z");
  });
  it("starts the axis at now when the day's shifts are still ahead", () => {
    const early = { ...today([shift("a", "upcoming")]), observedAt: "2026-10-20T10:40:00Z" };
    const { from, lanes } = timelineLanes(early, null);
    expect(new Date(from).toISOString()).toBe("2026-10-20T10:00:00.000Z");
    expect(lanes[0]).toMatchObject({ kind: "later", recorded: null });
  });
  it("never draws someone Working now lists as no clock-in, and records from their clock-in to now", () => {
    const { lanes, now } = timelineLanes(today([shift("casey", "no_punches"), shift("morgan", "no_punches")]), monitor([open("casey", "2026-10-21T01:12:00Z")]));
    const casey = lanes.find(lane => lane.name === "Person casey")!;
    expect(casey.kind).toBe("in");
    expect(casey.recorded).toEqual({ from: Date.parse("2026-10-21T01:12:00Z"), to: now });
    expect(lanes.find(lane => lane.name === "Person morgan")).toMatchObject({ kind: "missed", recorded: null });
  });
  it("draws a shift under way from its first clock-in", () => {
    const { lanes, now } = timelineLanes({ ...today([shift("a", "clocked_in", { firstClockInAt: "2026-10-20T13:05:00Z", late: true })]), observedAt: "2026-10-20T15:00:00Z" }, null);
    expect(lanes[0]).toMatchObject({ kind: "in", recorded: { from: Date.parse("2026-10-20T13:05:00Z"), to: now } });
  });
  it("gives a row to someone on the clock with no shift today, and the axis covers their clock-in", () => {
    const { lanes, from } = timelineLanes(today([shift("a", "done", { firstClockInAt: "2026-10-20T13:00:00Z" })]), monitor([open("extra", "2026-10-20T11:30:00Z")]));
    expect(lanes.map(lane => [lane.name, lane.kind])).toEqual([["Person a", "done"], ["Person extra", "unscheduled"]]);
    expect(lanes[1].planned).toBeNull();
    expect(from).toBe(Date.parse("2026-10-20T11:00:00Z"));
    expect(from % hour).toBe(0);
  });
  // Quiet (v4, approved Oct 23): Today has no timeline; Right now counts everyone on the clock.
  it("counts people on the clock even when none of them is scheduled today", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const { PremiumHomeSurface } = await import("./premium-home");
    const html = renderToStaticMarkup(createElement(PremiumHomeSurface, {
      greeting: "", dateLabel: "Tuesday, October 20", timeZone: "America/Puerto_Rico",
      week: { weekStart: "2026-10-19", weekLabel: "", plannedShifts: 0, availabilitySubmitted: 0, availabilityEligible: 0, locations: [] },
      today: today([]), monitor: monitor([open("extra", "2026-10-20T11:30:00Z")]),
      actions: null, actionsConnection: "loading",
    }));
    expect(html).toContain("<b>1 on shift</b>");
    // T-1 / P2-10: the row opens On shift.
    expect(html).toContain('href="/app?view=attendance"');
  });
  it("attaches an open punch to only its current shift, preserving finished and future shifts", () => {
    const shifts = [
      shift("morning", "done", { employeeId: "a", endAt: "2026-10-20T17:00:00Z", firstClockInAt: "2026-10-20T13:00:00Z" }),
      shift("afternoon", "clocked_in", { employeeId: "a", startAt: "2026-10-20T19:00:00Z", endAt: "2026-10-20T23:00:00Z", firstClockInAt: "2026-10-20T19:00:00Z" }),
      shift("evening", "upcoming", { employeeId: "a", startAt: "2026-10-20T23:30:00Z", endAt: "2026-10-21T01:00:00Z" }),
    ];
    const { lanes } = timelineLanes({ ...today(shifts), observedAt: "2026-10-20T20:00:00Z" }, monitor([open("a", "2026-10-20T19:00:00Z")]));
    expect(lanes.map(lane => lane.kind)).toEqual(["done", "in", "later"]);
    expect(lanes.filter(lane => lane.recorded).map(lane => lane.key)).toEqual(["afternoon"]);
  });
  it("keeps a punch at a different location separate from the planned shift", () => {
    const { lanes } = timelineLanes(today([shift("a", "no_punches")]), monitor([open("a", "2026-10-20T19:00:00Z", { locationId: "other" })]));
    expect(lanes.map(lane => lane.kind)).toEqual(["missed", "unscheduled"]);
  });
});

describe("Home's Next payday row (MK1)", () => {
  // Quiet (v4): the next payday lives on My pay (from More), so Today doesn't repeat it.
  it("leaves the next payday to My pay", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const { PremiumHomeSurface } = await import("./premium-home");
    const base = { greeting: "", dateLabel: "Tuesday, October 20", timeZone: "America/Puerto_Rico", week: { weekStart: "2026-10-19", weekLabel: "", plannedShifts: 0, availabilitySubmitted: 0, availabilityEligible: 0, locations: [] },
      today: null, actions: null, actionsConnection: "loading" as const };
    const html = renderToStaticMarkup(createElement(PremiumHomeSurface, { ...base, nextPay: { payday: "2026-10-27", daysUntil: 6 } }));
    expect(html).not.toContain("Next payday");
    expect(html).not.toContain('href="/app/my-pay"');
  });;
});
