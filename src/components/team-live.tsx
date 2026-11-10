"use client";
import { createContext, useContext, type ReactNode } from "react";
import { CorpPill } from "./corp/corp";
import { useToday } from "./manager-today";
import { useClockMonitor } from "./clean/use-clock-monitor";

/* Team (Release 1, board G-O-Team): who is working now. Two existing reads, the ones Home uses: Today (published shifts
 * and their clock-ins) and the clock monitor (every open clock-in, so someone clocked in without a scheduled shift reads
 * "Working", never "Off"). One read of each for the page; every row and the subtitle consume them. Nothing is shown until
 * the reads are in (never a false "Off"). When the clock monitor isn't available, Today alone decides, as before. */
/** Direction B adds, from the same Today read: who is late (minutes past a started shift with no clock-in) and who has a
 * shift today, so Team can say "Late 42 min" and "Off today". */
type Live = { ready: boolean; working: Set<string>; onBreak: Set<string>; late: Map<string, number>; scheduled: Set<string> };
const TeamLiveContext = createContext<Live>({ ready: false, working: new Set(), onBreak: new Set(), late: new Map(), scheduled: new Set() });
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
  return <TeamLiveContext.Provider value={{ ready, working, onBreak, late, scheduled }}>{children}</TeamLiveContext.Provider>;
}

/** One person's state today from the Team live read: null until the reads are ready. "later" has a shift that hasn't
 * started; "off" has no shift today. */
export type TeamState = "working" | "break" | "late" | "later" | "off";
export function teamStateOf(live: Live, id: string): TeamState | null {
  return !live.ready ? null : live.working.has(id) ? "working" : live.onBreak.has(id) ? "break" : live.late.has(id) ? "late" : live.scheduled.has(id) ? "later" : "off";
}
export const lateText = (minutes: number) => minutes >= 60 ? `Late ${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}` : `Late ${minutes} min`;

/** One person's live chip, the phone Team's words on every width (closing F1, NV-071/NV-091): a green "Clocked in" with
 * the live dot, teal "On break", amber "Late 12 min", grey "Off today"; nothing until the reads are ready, and nothing for
 * someone whose shift starts later today. */
export function TeamLivePill({ employeeId }: { employeeId: string }) {
  const live = useContext(TeamLiveContext);
  const state = teamStateOf(live, employeeId);
  if (state === "working") return <CorpPill tone="green" dot>Clocked in</CorpPill>;
  if (state === "break") return <CorpPill tone="teal">On break</CorpPill>;
  if (state === "late") return <CorpPill tone="amber">{lateText(live.late.get(employeeId) ?? 0)}</CorpPill>;
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

