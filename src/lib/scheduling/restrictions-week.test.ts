// Scheduling restrictions (U02): the browser's week logic, checked against the server's own rules (fictional data only).
import { describe, expect, it } from "vitest";
import { applyRestrictionCommand, emptyRestrictionDocument, normalizeRestrictionHours, parseRestrictionCommand, resolveRestrictionDay } from "./restrictions";
import {
  DAY_ORDER, admissibleMondays, allowedByDay, carriedInto, changedDays, cleanNote, decidedRequests, findReceipt, firstAdmissible, isAdmissibleMonday, openPlan, planAllowed, planFromUnavailable,
  planProblems, rangeOccupancy, unavailableFromPlan, versionInEffect, versionsAhead, waitingRequests, workplaceWeek, type WeekPlan,
} from "./restrictions-week";

const OP = (n: number) => `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;
const plan = (days: WeekPlan): WeekPlan => ({ ...openPlan(), ...days });

describe("the week as the contract stores it", () => {
  it("numbers days as the contract does: Sunday is 0, Saturday is 6, and the week is shown Monday first", () => {
    expect(DAY_ORDER).toEqual([1, 2, 3, 4, 5, 6, 0]);
    const rows = unavailableFromPlan(plan({ 0: { mode: "none" }, 6: { mode: "none" } }));
    expect(rows).toEqual([{ dayOfWeek: 0, startTime: "00:00", endTime: "24:00" }, { dayOfWeek: 6, startTime: "00:00", endTime: "24:00" }]);
    // Sunday, January 4, 2032 resolves against day 0, as the server resolves it.
    expect(resolveRestrictionDay("2032-01-04", [{ id: "v", effectiveWeek: "2031-12-29", unavailable: rows }])?.windows).toEqual([]);
    expect(resolveRestrictionDay("2032-01-05", [{ id: "v", effectiveWeek: "2031-12-29", unavailable: rows }])?.windows).toEqual([{ start: 0, end: 1440 }]);
  });
  it("writes 24:00 only as an end, and never as a start", () => {
    const rows = unavailableFromPlan(plan({ 1: { mode: "ranges", ranges: [{ start: "08:00", end: "16:00" }] } }));
    expect(rows).toEqual([{ dayOfWeek: 1, startTime: "00:00", endTime: "08:00" }, { dayOfWeek: 1, startTime: "16:00", endTime: "24:00" }]);
    expect(rows.every(row => row.startTime !== "24:00")).toBe(true);
    // The server accepts the list unchanged: it is already merged, ordered and same-day.
    expect(normalizeRestrictionHours(rows)).toEqual(rows);
  });
  it("an end of midnight closes the day at 24:00 and reaches no other day", () => {
    expect(rangeOccupancy({ start: "18:00", end: "00:00" })).toEqual({ same: { start: 1080, end: 1440 }, next: null });
    const rows = unavailableFromPlan(plan({ 5: { mode: "ranges", ranges: [{ start: "18:00", end: "00:00" }] } }));
    expect(rows).toEqual([{ dayOfWeek: 5, startTime: "00:00", endTime: "18:00" }]);
  });
  it("splits an overnight range over the two dates it occupies", () => {
    const overnight = plan({ 1: { mode: "ranges", ranges: [{ start: "22:00", end: "06:00" }] }, 2: { mode: "none" } });
    expect(rangeOccupancy({ start: "22:00", end: "06:00" })).toEqual({ same: { start: 1320, end: 1440 }, next: { start: 0, end: 360 } });
    const allowed = planAllowed(overnight);
    expect(allowed[1]).toEqual([{ start: 1320, end: 1440 }]);
    expect(allowed[2]).toEqual([{ start: 0, end: 360 }]);
    expect(unavailableFromPlan(overnight)).toEqual([{ dayOfWeek: 1, startTime: "00:00", endTime: "22:00" }, { dayOfWeek: 2, startTime: "06:00", endTime: "24:00" }]);
    expect(carriedInto(overnight, 2)).toEqual({ start: 0, end: 360 });
    expect(carriedInto(overnight, 3)).toBeNull();
  });
  it("carries Saturday night into Sunday (day 6 into day 0)", () => {
    const weekend = plan({ 6: { mode: "ranges", ranges: [{ start: "20:00", end: "02:00" }] }, 0: { mode: "none" } });
    expect(planAllowed(weekend)[0]).toEqual([{ start: 0, end: 120 }]);
    expect(unavailableFromPlan(weekend)).toContainEqual({ dayOfWeek: 0, startTime: "02:00", endTime: "24:00" });
  });
  it("reads a stored version back as the plan a person would recognise, overnight included", () => {
    const stored = [{ dayOfWeek: 1, startTime: "00:00", endTime: "22:00" }, { dayOfWeek: 2, startTime: "06:00", endTime: "24:00" }, { dayOfWeek: 6, startTime: "00:00", endTime: "24:00" }];
    const read = planFromUnavailable(stored);
    expect(read[1]).toEqual({ mode: "ranges", ranges: [{ start: "22:00", end: "06:00" }] });
    expect(read[2]).toEqual({ mode: "none" });
    expect(read[6]).toEqual({ mode: "none" });
    expect(read[3]).toEqual({ mode: "any" });
    expect(unavailableFromPlan(read)).toEqual(stored);
  });
  it("round-trips every shape without losing a minute", () => {
    const cases = [
      [],
      [{ dayOfWeek: 0, startTime: "00:00", endTime: "24:00" }],
      [{ dayOfWeek: 3, startTime: "12:00", endTime: "13:00" }],
      [{ dayOfWeek: 4, startTime: "00:00", endTime: "09:30" }, { dayOfWeek: 4, startTime: "12:00", endTime: "13:15" }, { dayOfWeek: 4, startTime: "21:00", endTime: "24:00" }],
      Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: "06:00", endTime: "22:00" })),
    ];
    for (const stored of cases) expect(unavailableFromPlan(planFromUnavailable(stored))).toEqual(stored);
  });
  it("says which ranges stop a plan: a missing time, or the same time twice", () => {
    expect(planProblems(plan({ 1: { mode: "ranges", ranges: [{ start: "", end: "10:00" }, { start: "09:00", end: "09:00" }, { start: "09:00", end: "17:00" }] } }))).toEqual([{ day: 1, index: 0, kind: "missing" }, { day: 1, index: 1, kind: "same" }]);
    expect(planProblems(plan({ 1: { mode: "ranges", ranges: [{ start: "00:00", end: "00:00" }] } }))).toEqual([]);
  });
  it("names the days that change between two versions", () => {
    const before = [{ dayOfWeek: 6, startTime: "00:00", endTime: "24:00" }], after = [{ dayOfWeek: 6, startTime: "00:00", endTime: "24:00" }, { dayOfWeek: 2, startTime: "00:00", endTime: "09:00" }, { dayOfWeek: 0, startTime: "12:00", endTime: "24:00" }];
    expect(changedDays(before, after)).toEqual([2, 0]);
    expect(changedDays(before, before)).toEqual([]);
    expect(allowedByDay(after)[2]).toEqual([{ start: 540, end: 1440 }]);
  });
});

describe("versions and the Monday a new one may start", () => {
  it("offers the server's earliest week and the Mondays after it, and nothing when the bound is not a Monday", () => {
    expect(admissibleMondays("2030-10-14", 3)).toEqual(["2030-10-14", "2030-10-21", "2030-10-28"]);
    expect(admissibleMondays("2030-10-15")).toEqual([]);
    expect(isAdmissibleMonday("2030-10-14", "2030-10-14")).toBe(true);
    expect(isAdmissibleMonday("2030-10-07", "2030-10-14")).toBe(false);
    expect(isAdmissibleMonday("2030-10-16", "2030-10-14")).toBe(false);
    expect(firstAdmissible("2030-10-07", "2030-10-14")).toBe("2030-10-14");
    expect(firstAdmissible("2030-10-28", "2030-10-14")).toBe("2030-10-28");
  });
  it("matches the contract's example: a version effective 2030-10-07 makes the next possible version 2030-10-14", () => {
    const set = applyRestrictionCommand(emptyRestrictionDocument(), { kind: "SET", operationId: OP(1), expectedRevision: 0, reason: "Agreed", effectiveWeek: "2030-10-07", unavailable: [] },
      { actorId: "OWNER-1", actorRole: "OWNER", now: "2030-09-30T12:00:00.000Z", earliestWeek: "2030-09-30" });
    // The server refuses the same week again and names the week the picker must start from.
    try { applyRestrictionCommand(set.document, { kind: "SET", operationId: OP(2), expectedRevision: 1, reason: "Agreed", effectiveWeek: "2030-10-07", unavailable: [] }, { actorId: "OWNER-1", actorRole: "OWNER", now: "2030-09-30T12:00:00.000Z", earliestWeek: "2030-09-30" }); expect.unreachable(); }
    catch (error) { expect((error as { code?: string; earliestWeek?: string }).code).toBe("locked"); expect((error as { earliestWeek?: string }).earliestWeek).toBe("2030-10-14"); }
    expect(admissibleMondays("2030-10-14", 1)).toEqual(["2030-10-14"]);
  });
  it("a later version never applies early", () => {
    const versions = [{ effectiveWeek: "2030-10-07" }, { effectiveWeek: "2030-10-21" }] as never;
    expect(versionInEffect(versions, "2030-09-30")).toBeNull();
    expect(versionInEffect(versions, "2030-10-14")).toMatchObject({ effectiveWeek: "2030-10-07" });
    expect(versionInEffect(versions, "2030-10-21")).toMatchObject({ effectiveWeek: "2030-10-21" });
    expect(versionsAhead(versions, "2030-10-14")).toHaveLength(1);
  });
  it("takes the current week from the workplace's clock, not the device's", () => {
    // Monday 03:30 UTC is still Sunday evening in Puerto Rico: the workplace is in the week before.
    expect(workplaceWeek(new Date("2030-10-14T03:30:00Z"), "America/Puerto_Rico")).toBe("2030-10-07");
    expect(workplaceWeek(new Date("2030-10-14T04:30:00Z"), "America/Puerto_Rico")).toBe("2030-10-14");
  });
  it("finds an operation's receipt wherever the document keeps it, and builds commands the server accepts", () => {
    const context = { actorId: "EMP-1", actorRole: "EMPLOYEE" as const, now: "2030-09-30T12:00:00.000Z", earliestWeek: "2030-09-30" };
    const unavailable = unavailableFromPlan(plan({ 1: { mode: "ranges", ranges: [{ start: "22:00", end: "06:00" }] } }));
    const command = { kind: "REQUEST" as const, operationId: OP(3), expectedRevision: 0, reason: cleanNote("  School on\nTuesdays​  "), effectiveWeek: "2030-10-07", unavailable };
    expect(parseRestrictionCommand(command)).toEqual(command);
    const asked = applyRestrictionCommand(emptyRestrictionDocument(), command, context);
    expect(findReceipt(asked.document, OP(3))).toMatchObject({ kind: "REQUEST", status: "PENDING" });
    expect(findReceipt(asked.document, OP(9))).toBeNull();
    expect(waitingRequests(asked.document)).toHaveLength(1);
    const decided = applyRestrictionCommand(asked.document, { kind: "DECIDE", operationId: OP(4), expectedRevision: 1, reason: "Approved", requestId: OP(3), decision: "APPROVE", effectiveWeek: "2030-10-14" },
      { ...context, actorId: "MGR-1", actorRole: "MANAGER" });
    expect(findReceipt(decided.document, OP(4))).toMatchObject({ kind: "DECIDE", status: "APPROVED", effectiveWeek: "2030-10-14" });
    expect(waitingRequests(decided.document)).toHaveLength(0);
    expect(decidedRequests(decided.document)).toHaveLength(1);
    // An employee's request never approves itself: the same command from the employee is refused.
    expect(() => applyRestrictionCommand(asked.document, { kind: "DECIDE", operationId: OP(5), expectedRevision: 1, reason: "Approved", requestId: OP(3), decision: "APPROVE", effectiveWeek: "2030-10-14" }, context)).toThrow();
  });
  it("cleans a note to one line the server accepts", () => {
    expect(cleanNote("  School on\nTuesdays​  ")).toBe("School on Tuesdays");
    expect(cleanNote("\n\t ")).toBe("");
    expect(cleanNote("x".repeat(600))).toHaveLength(500);
  });
});
