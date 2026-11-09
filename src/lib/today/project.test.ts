import { describe, expect, it } from "vitest";
import { parseToday, projectToday, shiftStatus, STATUS_TEXT } from "./project";

const now = Date.parse("2030-10-16T14:00:00Z"); // 10:00 in Puerto Rico
const at = (offsetMinutes: number) => new Date(now + offsetMinutes * 60_000).toISOString();
const shift = (id: string, startOffset: number, endOffset: number, extra: Record<string, unknown> = {}) => ({
  id, employeeId: `E-${id}`, employeeName: `Fictional ${id}`, locationId: "L1", locationName: "Main", positionName: null,
  date: "2030-10-16", startAt: at(startOffset), endAt: at(endOffset), ...extra,
});
const entry = (employeeId: string, inOffset: number, outOffset: number | null, extra: Record<string, unknown> = {}) => ({
  id: `T-${employeeId}-${inOffset}`, employeeId, locationId: "L1", clockInAt: at(inOffset), clockOutAt: outOffset === null ? null : at(outOffset), onBreak: false, ...extra,
});
const source = (shifts: unknown[], entries: unknown[] = []) => ({ observedAt: at(0), expiresAt: at(30), timeZone: "America/Puerto_Rico", today: "2030-10-16", shifts, entries });
const ready = (value: ReturnType<typeof projectToday>) => { if (value.state !== "ready") throw Error("not ready"); return value; };

describe("shiftStatus", () => {
  it("names each state factually", () => {
    const s = { startAt: at(0), endAt: at(480) };
    expect(shiftStatus({ startAt: at(30), endAt: at(510) }, [], now).status).toBe("upcoming");
    expect(shiftStatus({ startAt: at(-4), endAt: at(476) }, [], now).status).toBe("starting");
    expect(shiftStatus({ startAt: at(-5), endAt: at(475) }, [], now).status).toBe("not_clocked_in");
    expect(shiftStatus({ startAt: at(-480), endAt: at(-1) }, [], now).status).toBe("no_punches");
    expect(shiftStatus(s, [entry("E", -2, null)], now)).toMatchObject({ status: "clocked_in", late: false });
    expect(shiftStatus(s, [entry("E", -2, null, { onBreak: true })], now).status).toBe("on_break");
    expect(shiftStatus({ startAt: at(-240), endAt: at(-1) }, [entry("E", -239, -2)], now)).toMatchObject({ status: "done", late: true });
    expect(STATUS_TEXT.not_clocked_in).toBe("Started, not clocked in");
    expect(Object.values(STATUS_TEXT).join(" ")).not.toMatch(/no-show|absent/i);
  });
});

describe("projectToday", () => {
  it("counts scheduled, clocked in, late and started-not-clocked-in", () => {
    const today = ready(projectToday(source(
      [shift("A", -60, 420), shift("B", -30, 450), shift("C", -20, 460), shift("D", 120, 600), shift("E", -600, -120)],
      [entry("E-A", -70, null), entry("E-B", -12, null, { onBreak: true }), entry("E-X", -15, null)],
    )));
    expect(today.counts).toEqual({ scheduled: 5, clockedIn: 3, late: 1, notClockedIn: 1 });
    expect(Object.fromEntries(today.shifts.map(s => [s.id, s.status]))).toEqual({ E: "no_punches", A: "clocked_in", B: "on_break", C: "not_clocked_in", D: "upcoming" });
    expect(today.missed.map(s => s.id)).toEqual(["E", "C"]);
  });

  it("accepts an early clock-in up to 90 minutes before the start, but not other people or places", () => {
    expect(ready(projectToday(source([shift("A", -10, 470)], [entry("E-A", -95, null)]))).shifts[0].status).toBe("clocked_in");
    expect(ready(projectToday(source([shift("A", 60, 540)], [entry("E-A", -40, -35)]))).shifts[0].status).toBe("upcoming");
    expect(ready(projectToday(source([shift("A", -10, 470)], [entry("E-B", -12, null)]))).shifts[0].status).toBe("not_clocked_in");
    expect(ready(projectToday(source([shift("A", -10, 470)], [entry("E-A", -12, null, { locationId: "L2" })]))).shifts[0].status).toBe("not_clocked_in");
  });

  it("keeps yesterday's overnight shift only while it is still running", () => {
    const running = shift("N", -600, 60, { date: "2030-10-15" }), ended = shift("M", -900, -30, { date: "2030-10-15" });
    const today = ready(projectToday(source([running, ended])));
    expect(today.shifts.map(s => s.id)).toEqual(["N"]);
  });

  it("refuses malformed or expired sources instead of guessing", () => {
    expect(projectToday(null).state).toBe("unavailable");
    expect(projectToday({ ...source([shift("A", 0, 60)]), expiresAt: at(-1) }).state).toBe("unavailable");
    expect(projectToday(source([shift("A", 0, 60), shift("A", 0, 60)])).state).toBe("unavailable");
    expect(projectToday(source([shift("A", 60, 30)])).state).toBe("unavailable");
    expect(projectToday(source([shift("A", 0, 60)], [entry("E-A", 5, null)])).state).toBe("unavailable");
    expect(projectToday(source([{ ...shift("A", 0, 60), employeeName: "" }])).state).toBe("unavailable");
  });
});

describe("parseToday", () => {
  it("accepts a projected snapshot and refuses tampered ones", () => {
    const today = projectToday(source([shift("A", -30, 450)]));
    expect(parseToday(JSON.parse(JSON.stringify(today)))).toEqual(today);
    expect(parseToday({ ...today, counts: { ...(today as { counts: object }).counts, late: -1 } }).state).toBe("unavailable");
    expect(parseToday({ ...today, shifts: [{ ...(today as { shifts: object[] }).shifts[0], status: "no_show" }] }).state).toBe("unavailable");
    expect(parseToday({ state: "unavailable", reason: "access_denied" })).toEqual({ state: "unavailable", reason: "access_denied" });
    expect(parseToday("x").state).toBe("unavailable");
  });
});
