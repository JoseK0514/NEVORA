import { diffPublishedShifts, type PublishedShiftSnapshot, type PublicationChangeType } from '../assistance/publication-diff';

/**
 * Publish changes (Jose, 2026-10-29). Data contract for the Schedule UI,
 * returned by readSchedulePendingChanges in
 * src/lib/company-access/operational-read.server.ts.
 *
 * "Pending" means the live published rows differ from the latest publication
 * revision of the week by canonical comparison (employee, location, schedule,
 * date, times, position, notes, lead, callout), so a notes-only edit counts.
 */
export type SchedulePendingShiftValue = {
  employeeId: string;
  employeeName: string;
  locationId: string;
  date: string;
  /** HH:MM, business-local. */
  startTime: string;
  endTime: string;
  positionId: string | null;
  /** Captured name for the published side; current name for the held side. */
  positionName: string | null;
  isDesignatedLead: boolean;
  notes: string | null;
};
export type SchedulePendingChangeField =
  | 'ADDED' | 'REMOVED' | 'EMPLOYEE' | 'LOCATION' | 'TIME' | 'POSITION' | 'LEAD' | 'CALLOUT' | 'NOTES';
export type SchedulePendingChange = {
  /** Live shift id (null only for a legacy captured row without one). */
  shiftId: string | null;
  /** Location of the held value, or of the removed shift. */
  locationId: string;
  /** Person to show: the new assignee, or the removed shift's person. */
  employeeId: string;
  employeeName: string;
  /** Day to show: the new date, or the removed shift's date. */
  date: string;
  kind: 'ADDED' | 'REMOVED' | 'CHANGED';
  /** What changed, in a fixed order; a notes-only edit is ['NOTES']. */
  fields: SchedulePendingChangeField[];
  /** What people were shown (latest revision); null for an added shift. */
  before: SchedulePendingShiftValue | null;
  /** What Publish changes will show; null for a removed shift. */
  after: SchedulePendingShiftValue | null;
  /** From the held-edit history (unpublished rows for this shift). */
  editCount: number;
  lastEditedAt: string | null;
  lastEditedBy: { id: string; name: string } | null;
};
export type SchedulePendingChangesData = {
  weekStart: string;
  /** True when Publish changes would publish something in the caller's scope. */
  hasPendingChanges: boolean;
  /** Number of assignments that differ (all of them, not only `changes`). */
  pendingCount: number;
  /** A published week that was never captured: everything publishes at once. */
  neverCaptured: boolean;
  latestRevision: { id: string; revisionNumber: number; createdAt: string } | null;
  /** Per-location counts, only locations with pending changes, by name. */
  locations: { locationId: string; locationName: string; pendingCount: number }[];
  /** Short list ordered by date, start time and person; at most `limit`. */
  changes: SchedulePendingChange[];
  truncated: boolean;
  /** Every held shift still on the schedule (added or changed, not removed), with no limit: the "Changed" marks. */
  changedShiftIds: string[];
  /** Publish changes needs COMPANY scope; location-scoped Managers only see. */
  canPublish: boolean;
};
export type PendingHistoryRow = { shiftId: string | null; actorId: string; actorName: string; createdAt: string };
export type PendingChangeInput = { sourceShiftId: string | null; before: PublishedShiftSnapshot | null; after: PublishedShiftSnapshot | null };

const FIELD: Partial<Record<PublicationChangeType, SchedulePendingChangeField>> = {
  EMPLOYEE_REASSIGNED: 'EMPLOYEE', LOCATION_CHANGED: 'LOCATION', TIME_CHANGED: 'TIME', POSITION_CHANGED: 'POSITION', LEAD_CHANGED: 'LEAD', CALLOUT_CHANGED: 'CALLOUT',
};
const ORDER: SchedulePendingChangeField[] = ['ADDED', 'REMOVED', 'EMPLOYEE', 'LOCATION', 'TIME', 'POSITION', 'LEAD', 'CALLOUT', 'NOTES'];

/** Pure projection from the pending comparison and held-edit history. */
export function buildSchedulePendingChanges(input: {
  weekStart: string;
  changes: readonly PendingChangeInput[];
  neverCaptured: boolean;
  latestRevision: SchedulePendingChangesData['latestRevision'];
  /** null = COMPANY scope; otherwise only these locations are shown. */
  locationIds: readonly string[] | null;
  employeeNames: ReadonlyMap<string, string>;
  locationNames: ReadonlyMap<string, string>;
  positionNames: ReadonlyMap<string, string>;
  history: readonly PendingHistoryRow[];
  canPublish: boolean;
  limit?: number;
}): SchedulePendingChangesData {
  const limit = input.limit ?? 50;
  const inScope = (s: PublishedShiftSnapshot | null) => !!s && (input.locationIds === null || input.locationIds.includes(s.locationId));
  const value = (s: PublishedShiftSnapshot | null, held: boolean): SchedulePendingShiftValue | null => s ? {
    employeeId: s.employeeId, employeeName: input.employeeNames.get(s.employeeId) ?? 'Former employee', locationId: s.locationId, date: s.date,
    startTime: s.startTime.slice(0, 5), endTime: s.endTime.slice(0, 5), positionId: s.positionId || null,
    positionName: (!held && s.positionName) || (s.positionId ? input.positionNames.get(s.positionId) ?? null : null),
    isDesignatedLead: s.isDesignatedLead, notes: s.notes || null,
  } : null;
  const visible = input.changes.filter(c => inScope(c.before) || inScope(c.after));
  const rows = visible.map((c): SchedulePendingChange => {
    const shown = (c.after ?? c.before)!;
    const fields = new Set<SchedulePendingChangeField>();
    for (const change of diffPublishedShifts(c.before ? [c.before] : [], c.after ? [c.after] : [])) fields.add(change.type === 'ADDED' || change.type === 'REMOVED' ? change.type : FIELD[change.type]!);
    if (c.before && c.after && (c.before.notes || null) !== (c.after.notes || null)) fields.add('NOTES');
    const edits = c.sourceShiftId ? input.history.filter(h => h.shiftId === c.sourceShiftId) : [];
    const last = edits.at(-1);
    return {
      shiftId: c.sourceShiftId, locationId: shown.locationId, employeeId: shown.employeeId, employeeName: input.employeeNames.get(shown.employeeId) ?? 'Former employee',
      date: shown.date, kind: !c.before ? 'ADDED' : !c.after ? 'REMOVED' : 'CHANGED', fields: ORDER.filter(f => fields.has(f)),
      before: value(c.before, false), after: value(c.after, true),
      editCount: edits.length, lastEditedAt: last?.createdAt ?? null, lastEditedBy: last ? { id: last.actorId, name: last.actorName } : null,
    };
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.after ?? a.before)!.startTime.localeCompare((b.after ?? b.before)!.startTime)
    || a.employeeName.localeCompare(b.employeeName) || (a.shiftId ?? '').localeCompare(b.shiftId ?? ''));
  const counts = new Map<string, number>();
  for (const c of visible) for (const id of new Set([c.before, c.after].filter(inScope).map(s => s!.locationId))) counts.set(id, (counts.get(id) ?? 0) + 1);
  const locations = [...counts].map(([locationId, pendingCount]) => ({ locationId, locationName: input.locationNames.get(locationId) ?? locationId, pendingCount }))
    .sort((a, b) => a.locationName.localeCompare(b.locationName) || a.locationId.localeCompare(b.locationId));
  return {
    weekStart: input.weekStart, hasPendingChanges: rows.length > 0 || input.neverCaptured, pendingCount: rows.length, neverCaptured: input.neverCaptured,
    latestRevision: input.latestRevision, locations, changes: rows.slice(0, limit), truncated: rows.length > limit,
    changedShiftIds: [...new Set(rows.flatMap(row => row.kind !== 'REMOVED' && row.shiftId ? [row.shiftId] : []))], canPublish: input.canPublish,
  };
}
