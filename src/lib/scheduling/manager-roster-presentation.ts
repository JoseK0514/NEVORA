import { durationMinutes } from "../date-utils";

export type RosterShift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  position?: string | null;
  /** Tint slot from the workspace's position order; falls back to a name hash. */
  tint?: number;
  status: string;
  lead: boolean;
};
export type RosterEmployee = {
  id: string; name: string; role: string; shifts: RosterShift[];
  /** Optional, from scheduling rules: weekly hours across all locations against the person's target. */
  hours?: { week: number; target: number | null; maximum: number };
};

/** One of six position tints, stable for a position name. Colour is never the
 * only cue: the position name is always printed on the shift. */
export function positionTint(position?: string | null) {
  if (!position) return 0;
  let hash = 0;
  for (const char of position.trim().toLocaleLowerCase()) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return hash % 6;
}

export function assignedHours(shifts: RosterShift[]) {
  return Number((shifts.reduce((sum, shift) => sum + durationMinutes(shift.startTime, shift.endTime), 0) / 60).toFixed(1));
}

export function filterRoster(employees: RosterEmployee[], query: string) {
  const search = query.trim().toLocaleLowerCase();
  return employees.filter(employee => `${employee.name} ${employee.role}`.toLocaleLowerCase().includes(search));
}
