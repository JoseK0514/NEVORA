"use client";
import { createContext, useContext, type ReactNode } from "react";
import { CorpPill } from "./corp/corp";
import { useToday } from "./manager-today";
import { useClockMonitor } from "./clean/use-clock-monitor";
import { ATTENDANCE_WORDS } from "@/lib/action-center/present";
import { lateText } from "@/lib/action-center/request-details";
import { reviewCopy } from "@/components/review-details/copy";

/* Team (Release 1, board G-O-Team): who is working now. Two existing reads, the ones Home uses: Today (published shifts
 * and their clock-ins) and the clock monitor (every open clock-in, so someone clocked in without a scheduled shift reads
 * "Working", never "Off"). One read of each for the page; every row and the subtitle consume them. Nothing is shown until
 * the reads are in (never a false "Off"). When the clock monitor isn't available, Today alone decides, as before. */
/** Direction B adds, from the same Today read: who has not clocked in (`late`: minutes past a started shift with no
 * clock-in), who clocked in after their start (`clockedInLate`) and who has a shift today, so Team can say "Not clocked in ·
 * 42 min", "Clocked in late" and "Off today" (Jose's attendance words, Nov 11, 2026). */
type Live = { ready: boolean; working: Set<string>; onBreak: Set<string>; late: Map<string, number>; clockedInLate: Map<string, number | null>; scheduled: Set<string> };
const TeamLiveContext = createContext<Live>({ ready: false, working: new Set(), onBreak: new Set(), late: new Map(), clockedInLate: new Map(), scheduled: new Set() });
export const useTeamLive = () => useContext(TeamLiveContext);

export function TeamLiveProvider({ children }: { children: ReactNode }) {
  const { snapshot } = useToday();
  const { monitor } = useClockMonitor();
  const monitorSettled = monitor !== null;
  const ready = snapshot?.state === "ready" && monitorSettled;
  const shifts = ready ? snapshot.shifts : [];
  const open = ready && monitor?.state === "ready" ? monitor.employees : [];
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
  return <TeamLiveContext.Provider value={{ ready, working, onBreak, late, clockedInLate, scheduled }}>{children}</TeamLiveContext.Provider>;
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

/** One person's live chip, the phone Team's words on every width (closing F1, NV-071/NV-091): a green "Clocked in" (or
 * "Clocked in late") with the live dot, teal "On break", amber "Not clocked in · 12 min", grey "Off today"; nothing until
 * the reads are ready, and nothing for someone whose shift starts later today. */
export function TeamLivePill({ employeeId }: { employeeId: string }) {
  const live = useContext(TeamLiveContext);
  const state = teamStateOf(live, employeeId);
  if (state === "working") return <CorpPill tone="green" dot>{clockedInText(live, employeeId)}</CorpPill>;
  if (state === "break") return <CorpPill tone="teal">On break</CorpPill>;
  if (state === "late") return <CorpPill tone="amber">{notClockedInText(live.late.get(employeeId) ?? 0)}</CorpPill>;
  if (state === "off") return <CorpPill tone="neutral">Off today</CorpPill>;
  return null;
}

/** " · 7 working now" (" · No one working now") for the subtitle, once the reads are ready. */
export function TeamWorkingNow() {
  const live = useContext(TeamLiveContext);
  if (!live.ready) return null;
  const count = live.working.size + live.onBreak.size;
  return <>{count ? ` · ${count} working now` : " · No one working now"}</>;
}

