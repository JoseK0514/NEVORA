import { getDb, queryRows } from "../db";
import {
  type PublishedShiftSnapshot,
} from "../assistance/publication-diff";

export type RevisionSourceType =
  | "PUBLISH"
  | "EXCHANGE"
  | "CALLOUT"
  | "MANAGER_MUTATION";

export type PublicationRevision = {
  id: string;
  weekStart: string;
  revisionNumber: number;
  sourceType: RevisionSourceType;
  sourceId?: string;
  affectedLocationId?: string;
  createdBy: string;
  createdAt: string;
};

import { commitPublishedWeekChange } from "./notification-transactions";
import type { SqlExecutor } from "../notifications/types";

function dateValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function timeValue(value: unknown) {
  return String(value).slice(0, 5);
}

function isoValue(value: unknown) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(String(value)).toISOString();
}

function mapRevision(row: Record<string, unknown>): PublicationRevision {
  return {
    id: String(row.id),
    weekStart: dateValue(row.week_start),
    revisionNumber: Number(row.revision_number),
    sourceType: row.source_type as RevisionSourceType,
    sourceId: row.source_id ? String(row.source_id) : undefined,
    affectedLocationId: row.affected_location_id
      ? String(row.affected_location_id)
      : undefined,
    createdBy: String(row.created_by),
    createdAt: isoValue(row.created_at),
  };
}

export async function getLatestPublicationRevision(
  weekStart: string,
): Promise<PublicationRevision | null> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT
         id,
         week_start,
         revision_number,
         source_type,
         source_id,
         affected_location_id,
         created_by,
         created_at
       FROM schedule_publication_revisions
       WHERE week_start = $1
       ORDER BY revision_number DESC
       LIMIT 1`,
      [weekStart],
    ),
  );

  return rows[0] ? mapRevision(rows[0] as Record<string, unknown>) : null;
}

export async function listRevisionShifts(
  revisionId: string,
): Promise<PublishedShiftSnapshot[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT
         source_shift_id,
         schedule_id,
         location_id,
         employee_id,
         date,
         start_time,
         end_time,
         notes,
         is_designated_lead,
         is_callout_approved
       FROM schedule_publication_revision_shifts
       WHERE revision_id = $1
       ORDER BY date, start_time, location_id, employee_id, source_shift_id`,
      [revisionId],
    ),
  );

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      sourceShiftId: item.source_shift_id
        ? String(item.source_shift_id)
        : undefined,
      scheduleId: String(item.schedule_id),
      locationId: String(item.location_id),
      employeeId: String(item.employee_id),
      date: dateValue(item.date),
      startTime: timeValue(item.start_time),
      endTime: timeValue(item.end_time),
      notes: item.notes ? String(item.notes) : undefined,
      isDesignatedLead: Boolean(item.is_designated_lead),
      isCalloutApproved: Boolean(item.is_callout_approved),
    };
  });
}

/** Compatibility entry for callers recording a current published week. New
 * business writers compose their changes directly with commitPublishedWeekChange. */
export async function recordPublishedWeekRevision(input: {
  weekStart: string; sourceType: RevisionSourceType; sourceId?: string;
  affectedLocationId?: string; createdBy: string;
}): Promise<PublicationRevision> {
  const result = await commitPublishedWeekChange({weekStarts:[input.weekStart],actorEmployeeId:input.createdBy,sourceType:input.sourceType,sourceId:input.sourceId,
    build: state => ({statements:[{text:'SELECT 1',values:[]}],afterSchedules:state.schedules,afterShifts:state.shifts,publishWeekStarts:[input.weekStart],affectedLocationId:input.affectedLocationId})});
  if (!result.revisions[0]) throw new Error("Publication revision could not be recorded.");
  return result.revisions[0];
}

export async function publishScheduleWithRevision(input: {
  locationId: string; weekStart: string; managerId: string;
}, executor?: SqlExecutor): Promise<{ published: boolean; revision?: PublicationRevision }> {
  const result = await commitPublishedWeekChange({weekStarts:[input.weekStart],actorEmployeeId:input.managerId,sourceType:'PUBLISH',
    build: state => {
      const schedule=state.schedules.find(s=>s.locationId===input.locationId && s.weekStart===input.weekStart);
      if (!schedule) return {statements:[],afterSchedules:state.schedules,afterShifts:state.shifts};
      return {statements:[{text:`UPDATE schedules SET status='PUBLISHED',published_by=$2,published_at=now() WHERE id=$1`,values:[schedule.id,input.managerId]}],
        afterSchedules:state.schedules.map(s=>s.id===schedule.id?{...s,status:'PUBLISHED'}:s),afterShifts:state.shifts,publishWeekStarts:[input.weekStart],revisionSourceId:schedule.id,affectedLocationId:input.locationId};
    }},executor);
  return {published:result.committed,...(result.revisions[0]?{revision:result.revisions[0]}:{})};
}
