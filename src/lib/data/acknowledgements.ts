import { getDb, queryRows } from "../db";
import { neonNotificationExecutor, scheduleWeekLockStatements } from "./notification-transactions";
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

export async function acknowledgeScheduleWeek(input: {
  weekStart: string;
  employeeId: string;
}, executor: SqlExecutor = neonNotificationExecutor()) {
  const results = await executor.transaction([
    ...scheduleWeekLockStatements([input.weekStart]),
    {text:
      `WITH latest_revision AS (
         SELECT id
         FROM schedule_publication_revisions
         WHERE week_start = $1
         ORDER BY revision_number DESC
         LIMIT 1
       )
       INSERT INTO schedule_acknowledgements (
         week_start,
         employee_id,
         publication_revision_id,
         acknowledged_at
       )
       SELECT
         $1,
         $2,
         r.id,
         now()
       FROM latest_revision r
       WHERE EXISTS (
         SELECT 1
         FROM schedule_publication_revision_shifts rs
         WHERE rs.revision_id = r.id
           AND rs.employee_id = $2
       )
       ON CONFLICT (week_start, employee_id)
       DO UPDATE SET
         publication_revision_id = EXCLUDED.publication_revision_id,
         acknowledged_at = now()
       RETURNING employee_id, publication_revision_id`,
      values: [input.weekStart, input.employeeId]},
    {text: `WITH cancelled AS (
      UPDATE notifications SET push_state = 'cancelled', cancelled_at = now()
      WHERE source_kind = 'SCHEDULE' AND source_id = $1::text AND employee_id = $2
        AND purpose = 'REMINDER' AND push_state IN ('pending','materialized','no_active_subscription')
        AND EXISTS (SELECT 1 FROM schedule_acknowledgements a WHERE a.week_start=$1::date AND a.employee_id=$2
          AND a.publication_revision_id=(SELECT id FROM schedule_publication_revisions WHERE week_start=$1::date ORDER BY revision_number DESC LIMIT 1))
      RETURNING id
    ) UPDATE push_deliveries SET status='cancelled', lease_token=NULL, lease_expires_at=NULL, updated_at=now()
      WHERE notification_id IN (SELECT id FROM cancelled) AND status IN ('queued','retry_pending','processing')`,values:[input.weekStart,input.employeeId]},
  ]);
  return Boolean(results[1]?.[0]);
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
