/** Today on the floor (B4). Each published shift today is compared with the
 * punches actually recorded, so managers see who started without clocking in
 * and which finished shifts have no punches. Wording stays factual: a shift
 * "started, not clocked in", never a "no-show". */
export const START_GRACE_MINUTES = 5;
export const EARLY_CLOCK_IN_MINUTES = 90;

export type TodayShiftStatus = "upcoming" | "starting" | "not_clocked_in" | "no_punches" | "clocked_in" | "on_break" | "done";
export type TodayShift = {
  id: string; employeeId: string; employeeName: string; locationId: string; locationName: string; positionName: string | null;
  startAt: string; endAt: string; status: TodayShiftStatus; firstClockInAt: string | null; late: boolean;
};
export type TodayCounts = { scheduled: number; clockedIn: number; late: number; notClockedIn: number };
export type Today =
  | { state: "ready"; observedAt: string; validForMs: number; timeZone: string; today: string; counts: TodayCounts; shifts: TodayShift[]; missed: TodayShift[] }
  | { state: "unavailable"; reason: "access_denied" | "read_failed" | "schema_missing" };

type RawShift = { id: string; employeeId: string; employeeName: string; locationId: string; locationName: string; positionName: string | null; date: string; startAt: string; endAt: string };
type RawEntry = { id: string; employeeId: string; locationId: string; clockInAt: string; clockOutAt: string | null; onBreak: boolean };

const fail = (): Today => ({ state: "unavailable", reason: "read_failed" });
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 400;
const ms = (v: unknown) => (typeof v === "string" ? Date.parse(v) : NaN);
const MINUTE = 60_000;

export function shiftStatus(shift: { startAt: string; endAt: string }, entries: RawEntry[], now: number): { status: TodayShiftStatus; firstClockInAt: string | null; late: boolean } {
  const start = ms(shift.startAt), end = ms(shift.endAt);
  const first = entries.map(e => e.clockInAt).sort((a, b) => ms(a) - ms(b))[0] ?? null;
  const late = first !== null && ms(first) - start >= MINUTE;
  const open = entries.find(e => e.clockOutAt === null);
  if (open) return { status: open.onBreak ? "on_break" : "clocked_in", firstClockInAt: first, late };
  if (entries.length) return { status: "done", firstClockInAt: first, late };
  if (now < start) return { status: "upcoming", firstClockInAt: null, late: false };
  if (now >= end) return { status: "no_punches", firstClockInAt: null, late: false };
  if (now < start + START_GRACE_MINUTES * MINUTE) return { status: "starting", firstClockInAt: null, late: false };
  return { status: "not_clocked_in", firstClockInAt: null, late: false };
}

/** A punch belongs to a shift when it is the same person at the same place and
 * overlaps the shift, allowing a clock-in up to 90 minutes early. */
export function overlaps(shift: RawShift, entry: RawEntry, now: number) {
  if (entry.employeeId !== shift.employeeId || entry.locationId !== shift.locationId) return false;
  const inAt = ms(entry.clockInAt), outAt = entry.clockOutAt === null ? now : ms(entry.clockOutAt);
  return inAt < ms(shift.endAt) && outAt > ms(shift.startAt) - EARLY_CLOCK_IN_MINUTES * MINUTE;
}

export function projectToday(source: unknown): Today {
  if (!object(source) || !Array.isArray(source.shifts) || !Array.isArray(source.entries) || !text(source.timeZone) || !text(source.today)) return fail();
  const now = ms(source.observedAt), expiry = ms(source.expiresAt);
  if (!Number.isFinite(now) || !Number.isFinite(expiry)) return fail();
  const validForMs = Math.min(60_000, expiry - now);
  if (validForMs <= 0) return fail();
  const entries: RawEntry[] = [];
  for (const row of source.entries) {
    if (!object(row) || !text(row.id) || !text(row.employeeId) || !text(row.locationId) || !Number.isFinite(ms(row.clockInAt)) ||
        !(row.clockOutAt === null || Number.isFinite(ms(row.clockOutAt))) || typeof row.onBreak !== "boolean") return fail();
    if (ms(row.clockInAt) > now) return fail();
    entries.push(row as RawEntry);
  }
  const seen = new Set<string>(), shifts: TodayShift[] = [];
  for (const row of source.shifts) {
    if (!object(row) || !text(row.id) || !text(row.employeeId) || !text(row.employeeName) || !text(row.locationId) || !text(row.locationName) ||
        !(row.positionName === null || text(row.positionName)) || !text(row.date) || !Number.isFinite(ms(row.startAt)) || !Number.isFinite(ms(row.endAt)) ||
        ms(row.endAt) <= ms(row.startAt) || seen.has(row.id)) return fail();
    seen.add(row.id);
    const raw = row as RawShift;
    // Yesterday's overnight shifts only count while they are still running today.
    if (raw.date !== source.today && ms(raw.endAt) <= now) continue;
    const matched = entries.filter(e => overlaps(raw, e, now));
    shifts.push({ id: raw.id, employeeId: raw.employeeId, employeeName: raw.employeeName, locationId: raw.locationId, locationName: raw.locationName,
      positionName: raw.positionName, startAt: raw.startAt, endAt: raw.endAt, ...shiftStatus(raw, matched, now) });
  }
  shifts.sort((a, b) => ms(a.startAt) - ms(b.startAt) || a.employeeName.localeCompare(b.employeeName) || a.id.localeCompare(b.id));
  const missed = shifts.filter(s => s.status === "not_clocked_in" || s.status === "no_punches");
  const counts: TodayCounts = {
    scheduled: shifts.length,
    clockedIn: new Set(entries.filter(e => e.clockOutAt === null).map(e => e.employeeId)).size,
    late: shifts.filter(s => s.late).length,
    notClockedIn: shifts.filter(s => s.status === "not_clocked_in").length,
  };
  return { state: "ready", observedAt: new Date(now).toISOString(), validForMs, timeZone: source.timeZone, today: source.today, counts, shifts, missed };
}

export const STATUS_TEXT: Record<TodayShiftStatus, string> = {
  upcoming: "Starts later", starting: "Starting now", not_clocked_in: "Started, not clocked in", no_punches: "No punches recorded",
  clocked_in: "Clocked in", on_break: "On break", done: "Finished",
};

const STATUSES: TodayShiftStatus[] = ["upcoming", "starting", "not_clocked_in", "no_punches", "clocked_in", "on_break", "done"];
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
function shiftOk(v: unknown): v is TodayShift {
  return object(v) && text(v.id) && text(v.employeeId) && text(v.employeeName) && text(v.locationId) && text(v.locationName) &&
    (v.positionName === null || text(v.positionName)) && Number.isFinite(ms(v.startAt)) && Number.isFinite(ms(v.endAt)) &&
    STATUSES.includes(v.status as TodayShiftStatus) && (v.firstClockInAt === null || Number.isFinite(ms(v.firstClockInAt))) && typeof v.late === "boolean";
}

/** Browser-side check of the API response; anything unexpected is unavailable. */
export function parseToday(value: unknown): Today {
  if (!object(value)) return fail();
  if (value.state === "unavailable") return { state: "unavailable", reason: value.reason === "access_denied" ? "access_denied" : "read_failed" };
  const c = value.counts;
  if (value.state !== "ready" || !Number.isFinite(ms(value.observedAt)) || !count(value.validForMs) || !text(value.timeZone) || !text(value.today) ||
      !object(c) || !count(c.scheduled) || !count(c.clockedIn) || !count(c.late) || !count(c.notClockedIn) ||
      !Array.isArray(value.shifts) || !value.shifts.every(shiftOk) || !Array.isArray(value.missed) || !value.missed.every(shiftOk)) return fail();
  return value as Today;
}
