import { databaseDate as dateValue } from './database-date';
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
import type { SessionMutationProof } from "../shift-changes/types";

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
         position_id,
         position_name,
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
      positionId: item.position_id ? String(item.position_id) : undefined,
      positionName: item.position_name ? String(item.position_name) : undefined,
      notes: item.notes ? String(item.notes) : undefined,
      isDesignatedLead: Boolean(item.is_designated_lead),
      isCalloutApproved: Boolean(item.is_callout_approved),
    };
  });
}

/** Compatibility entry for callers recording a current published week. New
 * business writers compose their changes directly with commitPublishedWeekChange. */
export async function recordPublishedWeekRevision(input: {
  weekStart: string; sourceType: 'PUBLISH' | 'MANAGER_MUTATION'; proof: SessionMutationProof; sourceId?: string;
  affectedLocationId?: string; createdBy: string;
}): Promise<PublicationRevision> {
  const result = await commitPublishedWeekChange({weekStarts:[input.weekStart],actorEmployeeId:input.createdBy,proof:input.proof,sourceType:input.sourceType,sourceId:input.sourceId,
    build: state => ({statements:[{text:'SELECT 1',values:[]}],afterSchedules:state.schedules,afterShifts:state.shifts,publishWeekStarts:[input.weekStart],affectedLocationId:input.affectedLocationId})});
  if (!result.revisions[0]) throw new Error("Publication revision could not be recorded.");
  return result.revisions[0];
}

/** Publish one location while capturing the resulting whole-week projection through the shared atomic protocol. */
export async function publishScheduleWithRevision(input: {
  locationId: string; weekStart: string; managerId: string; proof: SessionMutationProof;
}, executor?: SqlExecutor): Promise<{ published: boolean; revision?: PublicationRevision }> {
  const result = await commitPublishedWeekChange({weekStarts:[input.weekStart],actorEmployeeId:input.managerId,proof:input.proof,sourceType:'PUBLISH',
    build: state => {
      const schedule=state.schedules.find(s=>s.locationId===input.locationId && s.weekStart===input.weekStart);
      if (!schedule) return {statements:[],afterSchedules:state.schedules,afterShifts:state.shifts};
      return {statements:[{text:`UPDATE schedules SET status='PUBLISHED',published_by=$2,published_at=now() WHERE id=$1`,values:[schedule.id,input.managerId]}],
        afterSchedules:state.schedules.map(s=>s.id===schedule.id?{...s,status:'PUBLISHED'}:s),afterShifts:state.shifts,publishWeekStarts:[input.weekStart],revisionSourceId:schedule.id,affectedLocationId:input.locationId};
    }},executor);
  return {published:result.committed,...(result.revisions[0]?{revision:result.revisions[0]}:{})};
}

export type CapturedShiftPosition = {
  sourceShiftId: string;
  positionId?: string;
  positionName?: string;
};

/** Latest actual capture per requested shift, including rows omitted by newer
 * snapshots after archival. This read neither changes publication nor exposes
 * notes or employee details to the Manager position-label projection. */
export async function listCapturedShiftPositions(
  input: { weekStart: string; shiftIds: readonly string[] },
  executor?: SqlExecutor,
): Promise<CapturedShiftPosition[]> {
  const shiftIds = [...new Set(input.shiftIds)].sort();
  if (!shiftIds.length) return [];
  const statement = {
    text: `SELECT DISTINCT ON (sh.source_shift_id)
      sh.source_shift_id, sh.position_id, sh.position_name
    FROM schedule_publication_revision_shifts sh
    JOIN schedule_publication_revisions r ON r.id = sh.revision_id
    WHERE r.week_start = $1 AND sh.source_shift_id = ANY($2::text[])
    ORDER BY sh.source_shift_id, r.revision_number DESC, r.id DESC, sh.id DESC`,
    values: [input.weekStart, shiftIds],
  };
  const rows = executor
    ? await executor.query<Record<string, unknown>>(statement)
    : queryRows(await getDb().query(statement.text, statement.values));
  return rows.map(row => ({
    sourceShiftId: String(row.source_shift_id),
    positionId: row.position_id ? String(row.position_id) : undefined,
    positionName: row.position_name ? String(row.position_name) : undefined,
  }));
}
