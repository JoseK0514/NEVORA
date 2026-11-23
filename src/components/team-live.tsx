"use client";
import { createContext, useContext, type ReactNode } from "react";
import { BChip, BStatusText } from "./owner-b/b-kit";
import { useToday } from "./manager-today";
import { useClockMonitor } from "./clean/use-clock-monitor";
import { ATTENDANCE_WORDS } from "@/lib/action-center/present";
import { lateText } from "@/lib/action-center/request-details";
import { reviewCopy } from "@/components/review-details/copy";

/* Team (Release 1, board G-O-Team): who is working now. Two existing reads, the ones Home uses: Today (published shifts
 * and their clock-ins) and the clock monitor (every open clock-in, so someone clocked in without a scheduled shift reads
 * "Clocked in", never "Off"). One read of each for the page; every row and the subtitle consume them. Nothing is shown until
 * the reads are in (never a false "Off"). When the clock monitor isn't available, Today alone decides, as before. */
/** Direction B adds, from the same Today read: who has not clocked in (`late`: minutes past a started shift with no
 * clock-in), who clocked in after their start (`clockedInLate`) and who has a shift today, so Team can say "Not clocked in ·
 * 42 min", "Clocked in late" and "Off today" (Jose's attendance words, Nov 11, 2026). */
/** `startsAt`: premium pass FA (final verification A #7, B #32): the clock time of the next shift today of someone who is
 * not on the clock yet ("1:30 PM", in the workplace's zone), so their row says when they start instead of nothing. */
/** `partial`: the reads cover only some of the company's places (a location Manager), so someone with nothing here today
 * may be working elsewhere; their row says nothing instead of "Off today". */
type Live = { partial?: boolean; ready: boolean; working: Set<string>; onBreak: Set<string>; late: Map<string, number>; clockedInLate: Map<string, number | null>; scheduled: Set<string>; startsAt?: Map<string, string> };
const TeamLiveContext = createContext<Live>({ ready: false, working: new Set(), onBreak: new Set(), late: new Map(), clockedInLate: new Map(), scheduled: new Set(), startsAt: new Map() });
export const useTeamLive = () => useContext(TeamLiveContext);

/** `locationId`: only that place's shifts and clock-ins (a location Manager's Team filtered to one of their places). */
export function TeamLiveProvider({ children, partial, locationId }: { children: ReactNode; partial?: boolean; locationId?: string }) {
  const { snapshot } = useToday();
  const { monitor } = useClockMonitor();
  const monitorSettled = monitor !== null;
  const ready = snapshot?.state === "ready" && monitorSettled;
  const here = (row: { locationId: string }) => !locationId || row.locationId === locationId;
  const shifts = ready ? snapshot.shifts.filter(here) : [];
  const open = ready && monitor?.state === "ready" ? monitor.employees.filter(here) : [];
  const onBreak = new Set([...shifts.filter(shift => shift.status === "on_break").map(shift => shift.employeeId),
    ...open.filter(entry => entry.state === "ON_BREAK").map(entry => entry.employeeId)]);
  const working = new Set([...shifts.filter(shift => shift.status === "clocked_in").map(shift => shift.employeeId),
    ...open.filter(entry => entry.state === "ON_FLOOR").map(entry => entry.employeeId)].filter(id => !onBreak.has(id)));
  const late = new Map<string, number>();
  if (ready) for (const shift of shifts) if (shift.status === "not_clocked_in" && !working.has(shift.employeeId) && !onBreak.has(shift.employeeId)) {
    const minutes = Math.floor((Date.parse(snapshot.observedAt) - Date.parse(shift.startAt)) / 60_000);
    if (minutes > 0) late.set(shift.employeeId, Math.max(minutes, late.get(shift.employeeId) ?? 0));
  }
  const scheduled = new Set(shifts.map(shift => shift.employeeId));
  // Today marks a shift late when its first clock-in came after the start; only people on the clock now are shown so.
  // Phase 4 (U09): with the server's whole late minutes when it sent them (null or absent: the words alone).
  const clockedInLate = new Map<string, number | null>();
  for (const shift of shifts) if (shift.late && (shift.status === "clocked_in" || shift.status === "on_break"))
    clockedInLate.set(shift.employeeId, typeof shift.lateMinutes === "number" ? Math.max(shift.lateMinutes, clockedInLate.get(shift.employeeId) ?? 0) : clockedInLate.get(shift.employeeId) ?? null);
  const startsAt = new Map<string, string>();
  if (ready) {
    const now = Date.parse(snapshot.observedAt);
    const next = new Map<string, number>();
    for (const shift of shifts) { const at = Date.parse(shift.startAt); if (at > now && at < (next.get(shift.employeeId) ?? Infinity)) next.set(shift.employeeId, at); }
    let format: Intl.DateTimeFormat | null = null;
    try { format = new Intl.DateTimeFormat("en-US", { timeZone: snapshot.timeZone, hour: "numeric", minute: "2-digit" }); } catch { format = null; }
    if (format) for (const [id, at] of next) startsAt.set(id, format.format(new Date(at)));
  }
  return <TeamLiveContext.Provider value={{ partial, ready, working, onBreak, late, clockedInLate, scheduled, startsAt }}>{children}</TeamLiveContext.Provider>;
}

/** One person's state today from the Team live read: null until the reads are ready. "late" is a started shift with no
 * clock-in (shown as "Not clocked in"); "later" has a shift that hasn't started; "off" has no shift today. */
export type TeamState = "working" | "break" | "late" | "later" | "off";
export function teamStateOf(live: Live, id: string): TeamState | null {
  return !live.ready ? null : live.working.has(id) ? "working" : live.onBreak.has(id) ? "break" : live.late.has(id) ? "late" : live.scheduled.has(id) ? "later" : "off";
}
/** "Not clocked in · 42 min": the shift started that long ago and there is no punch. Never "Late" (that word is for
 * someone who clocked in after their start) and never "Missed" (the shift hasn't ended). */
export const notClockedInText = (minutes: number) => minutes > 0 ? `${ATTENDANCE_WORDS.notClockedIn} · ${minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}` : `${minutes} min`}` : ATTENDANCE_WORDS.notClockedIn;
/** "Clocked in late" for someone on the clock who arrived after their start; otherwise "Clocked in". */
export const clockedInText = (live: Live, id: string) => live.clockedInLate.has(id) ? lateText({ late: true, lateMinutes: live.clockedInLate.get(id) }, ATTENDANCE_WORDS.late, reviewCopy()) : "Clocked in";

/** One person's live state, the same words and looks as Home's On now on every width (Phase 9, spec 3.1). The normal
 * states are quiet grey text: "Clocked in" with the green live dot, "On break" and "Off today" with none. Only an
 * exception is a chip, amber with the live dot (the person is, or should be, on the clock): "Clocked in late · 9 min",
 * "Not clocked in · 12 min". Nothing until the reads are ready. Premium pass FA: someone whose shift starts later today
 * reads "Starts 1:30 PM", grey (a time fact, not a state), where the row was blank. */
export function TeamLivePill({ employeeId }: { employeeId: string }) {
  const live = useContext(TeamLiveContext);
  const state = teamStateOf(live, employeeId);
  if (state === "working") return live.clockedInLate.has(employeeId) ? <BChip tone="amber" dot>{clockedInText(live, employeeId)}</BChip> : <BStatusText dot="green">{clockedInText(live, employeeId)}</BStatusText>;
  if (state === "break") return <BStatusText>On break</BStatusText>;
  if (state === "late") return <BChip tone="amber" dot>{notClockedInText(live.late.get(employeeId) ?? 0)}</BChip>;
  if (state === "off") return live.partial ? null : <BStatusText>Off today</BStatusText>;
  const starts = live.startsAt?.get(employeeId);
  return starts ? <BStatusText>{`Starts ${starts}`}</BStatusText> : null;
}

/** The Team title's live part. Jose (Nov 23, 2026: each count once), for every role (gaps G24): the filters under the
 * title say how many are clocked in ("Clocked in 2"), so the title says only how many people and this adds nothing. Kept
 * so the company Team page's title needs no change; it can drop it. */
export function TeamWorkingNow() {
  return null;
}

