import type {SessionMutationProof} from '../shift-changes/types';
import type {CommandResult} from '../employee-attention/types';
import {isValidWeekStart} from '../date-utils';
import {assertEmployeeViewProof} from './employee-profile.server';
import {commitAttention} from './employee-attention-receipts.server';
import { getDb, queryRows } from "../db";
import { neonNotificationExecutor } from "./notification-transactions";
import type { SqlExecutor } from "../notifications/types";
import {
  buildAcknowledgementState,
  type EmployeeAcknowledgementState,
} from "../assistance/acknowledgement-state";
import {
  getLatestPublicationRevision,
  listRevisionShifts,
} from "./publication-revisions";

export type AcknowledgementSummary = {
  scheduledEmployees: number;
  acknowledgedEmployees: number;
};

export async function acknowledgeScheduleWeek(input:{proof:SessionMutationProof;weekStart:string;expectedRevisionId:string;operationId:string;authority:string},executor:SqlExecutor=neonNotificationExecutor()):Promise<CommandResult>{
  try { assertEmployeeViewProof(input.proof); } catch { return {status:'blocked',reason:'session_unavailable'}; }
  if(!isValidWeekStart(input.weekStart))return {status:'blocked',reason:'invalid_week'};
  return commitAttention(input.proof,'CONFIRM_WEEK',{operationId:input.operationId,authority:input.authority,ref:{kind:'SCHEDULE',id:input.weekStart,version:input.expectedRevisionId}},executor);
}

export async function getEmployeeAcknowledgementState(
  weekStart: string,
  employeeId: string,
): Promise<EmployeeAcknowledgementState> {
  const latest = await getLatestPublicationRevision(weekStart);

  if (!latest) {
    return buildAcknowledgementState({ employeeId });
  }

  const sql = getDb();
  const rows = queryRows<{ publication_revision_id: string | null }>(
    await sql.query(
      `SELECT publication_revision_id
       FROM schedule_acknowledgements
       WHERE week_start = $1
         AND employee_id = $2
       LIMIT 1`,
      [weekStart, employeeId],
    ),
  );
  const acknowledgedRevisionId = rows[0]?.publication_revision_id ?? undefined;

  if (
    !acknowledgedRevisionId ||
    acknowledgedRevisionId === latest.id
  ) {
    return buildAcknowledgementState({
      employeeId,
      acknowledgementRevisionId: acknowledgedRevisionId,
      latestRevisionId: latest.id,
    });
  }

  const [acknowledgedRevisionShifts, latestRevisionShifts] = await Promise.all([
    listRevisionShifts(acknowledgedRevisionId),
    listRevisionShifts(latest.id),
  ]);

  return buildAcknowledgementState({
    employeeId,
    acknowledgementRevisionId: acknowledgedRevisionId,
    latestRevisionId: latest.id,
    acknowledgedRevisionShifts,
    latestRevisionShifts,
  });
}

export async function hasAcknowledgedScheduleWeek(
  weekStart: string,
  employeeId: string,
) {
  const state = await getEmployeeAcknowledgementState(weekStart, employeeId);
  return state.acknowledged;
}

async function selfServiceScheduledIds(employeeIds: string[]) {
  if (!employeeIds.length) return [];
  const sql = getDb();
  const rows = queryRows<{ id: string }>(await sql.query(
    `SELECT id FROM employees WHERE id = ANY($1::text[]) AND role IN ('EMPLOYEE', 'LEAD')`,
    [employeeIds],
  ));
  return rows.map(row => row.id);
}

export async function getAcknowledgementSummary(
  weekStart: string,
): Promise<AcknowledgementSummary> {
  const latest = await getLatestPublicationRevision(weekStart);
  if (!latest) {
    return { scheduledEmployees: 0, acknowledgedEmployees: 0 };
  }

  const latestShifts = await listRevisionShifts(latest.id);
  const scheduledEmployeeIds = await selfServiceScheduledIds(Array.from(
    new Set(latestShifts.map((shift) => shift.employeeId)),
  ));

  if (!scheduledEmployeeIds.length) {
    return { scheduledEmployees: 0, acknowledgedEmployees: 0 };
  }

  const sql = getDb();
  const acknowledgementRows = queryRows<{
    employee_id: string;
    publication_revision_id: string | null;
  }>(
    await sql.query(
      `SELECT employee_id, publication_revision_id
       FROM schedule_acknowledgements
       WHERE week_start = $1`,
      [weekStart],
    ),
  );
  const acknowledgementMap = new Map(
    acknowledgementRows.map((row) => [
      row.employee_id,
      row.publication_revision_id ?? undefined,
    ]),
  );

  const priorRevisionIds = Array.from(
    new Set(
      scheduledEmployeeIds
        .map((employeeId) => acknowledgementMap.get(employeeId))
        .filter(
          (revisionId): revisionId is string =>
            Boolean(revisionId) && revisionId !== latest.id,
        ),
    ),
  );
  const priorShiftEntries = await Promise.all(
    priorRevisionIds.map(async (revisionId) => [
      revisionId,
      await listRevisionShifts(revisionId),
    ] as const),
  );
  const priorShiftsByRevision = new Map(priorShiftEntries);

  let acknowledgedEmployees = 0;

  for (const employeeId of scheduledEmployeeIds) {
    const acknowledgedRevisionId = acknowledgementMap.get(employeeId);

    if (!acknowledgedRevisionId) continue;

    const state =
      acknowledgedRevisionId === latest.id
        ? buildAcknowledgementState({
            employeeId,
            acknowledgementRevisionId: acknowledgedRevisionId,
            latestRevisionId: latest.id,
          })
        : buildAcknowledgementState({
            employeeId,
            acknowledgementRevisionId: acknowledgedRevisionId,
            latestRevisionId: latest.id,
            acknowledgedRevisionShifts:
              priorShiftsByRevision.get(acknowledgedRevisionId),
            latestRevisionShifts: latestShifts,
          });

    if (state.acknowledged) acknowledgedEmployees += 1;
  }

  return {
    scheduledEmployees: scheduledEmployeeIds.length,
    acknowledgedEmployees,
  };
}

export async function clearWeekAcknowledgements(weekStart: string) {
  const sql = getDb();
  await sql.query(
    `DELETE FROM schedule_acknowledgements
     WHERE week_start = $1`,
    [weekStart],
  );
}

export async function listUnacknowledgedEmployeeIds(weekStart: string) {
  const latest = await getLatestPublicationRevision(weekStart);
  if (!latest) return [];

  const latestShifts = await listRevisionShifts(latest.id);
  const employeeIds = await selfServiceScheduledIds(Array.from(
    new Set(latestShifts.map((shift) => shift.employeeId)),
  ));

  const states = await Promise.all(
    employeeIds.map(async (employeeId) => ({
      employeeId,
      state: await getEmployeeAcknowledgementState(weekStart, employeeId),
    })),
  );

  return states
    .filter(({ state }) => state.needsAcknowledgement)
    .map(({ employeeId }) => employeeId);
}
