"use client";
import { createContext, useContext, type ReactNode } from "react";
import { CorpPill } from "./corp/corp";
import { useToday } from "./manager-today";

/* Team (Release 1, board G-O-Team): who is working now, from the same Today read Home uses. One read for the page;
 * every row and the subtitle consume it. When the read isn't ready, nothing is shown (never a false "Off"). */
type Live = { ready: boolean; working: Set<string>; onBreak: Set<string> };
const TeamLiveContext = createContext<Live>({ ready: false, working: new Set(), onBreak: new Set() });

export function TeamLiveProvider({ children }: { children: ReactNode }) {
  const { snapshot } = useToday();
  const ready = snapshot?.state === "ready";
  const shifts = ready ? snapshot.shifts : [];
  const value: Live = { ready, working: new Set(shifts.filter(shift => shift.status === "clocked_in").map(shift => shift.employeeId)), onBreak: new Set(shifts.filter(shift => shift.status === "on_break").map(shift => shift.employeeId)) };
  return <TeamLiveContext.Provider value={value}>{children}</TeamLiveContext.Provider>;
}

/** "Working", "On break" or "Off" for one person; nothing until the read is ready. */
export function TeamLivePill({ employeeId }: { employeeId: string }) {
  const live = useContext(TeamLiveContext);
  if (!live.ready) return null;
  if (live.working.has(employeeId)) return <CorpPill tone="teal">Working</CorpPill>;
  if (live.onBreak.has(employeeId)) return <CorpPill tone="blue">On break</CorpPill>;
  return <CorpPill tone="neutral">Off</CorpPill>;
}

/** " · 7 working now" for the subtitle, once the read is ready. */
export function TeamWorkingNow() {
  const live = useContext(TeamLiveContext);
  if (!live.ready) return null;
  return <>{` · ${live.working.size + live.onBreak.size} working now`}</>;
}
