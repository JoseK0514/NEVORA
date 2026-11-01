"use client";
import { createContext, useContext, type ReactNode } from "react";
import { CorpPill } from "./corp/corp";
import { useToday } from "./manager-today";
import { useClockMonitor } from "./clean/use-clock-monitor";

/* Team (Release 1, board G-O-Team): who is working now. Two existing reads, the ones Home uses: Today (published shifts
 * and their clock-ins) and the clock monitor (every open clock-in, so someone clocked in without a scheduled shift reads
 * "Working", never "Off"). One read of each for the page; every row and the subtitle consume them. Nothing is shown until
 * the reads are in (never a false "Off"). When the clock monitor isn't available, Today alone decides, as before. */
type Live = { ready: boolean; working: Set<string>; onBreak: Set<string> };
const TeamLiveContext = createContext<Live>({ ready: false, working: new Set(), onBreak: new Set() });

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
  return <TeamLiveContext.Provider value={{ ready, working, onBreak }}>{children}</TeamLiveContext.Provider>;
}

/** "Working" or "On break" for one person; nothing until the reads are ready. Off is the normal state, so it shows no
 * pill (Owner premium A5: a pill only for the exception; the subtitle says how many are working). */
export function TeamLivePill({ employeeId }: { employeeId: string }) {
  const live = useContext(TeamLiveContext);
  if (!live.ready) return null;
  if (live.working.has(employeeId)) return <CorpPill tone="teal">Working</CorpPill>;
  if (live.onBreak.has(employeeId)) return <CorpPill tone="neutral">On break</CorpPill>;
  return null;
}

/** " · 7 working now" for the subtitle, once the reads are ready. */
export function TeamWorkingNow() {
  const live = useContext(TeamLiveContext);
  if (!live.ready) return null;
  return <>{` · ${live.working.size + live.onBreak.size} working now`}</>;
}

