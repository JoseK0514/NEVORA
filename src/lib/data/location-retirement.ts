import type { SqlStatement } from '../notifications/types';

const blockerMessages = {
  SCHEDULE: 'Resolve ongoing and future shifts in Schedule and publish any changes.',
  OPEN_SHIFT_POSTINGS: 'Withdraw unused postings in Posted open shifts.',
  OPEN_TIME: 'Close open punches in Timecards using verified times.',
  TIME_CORRECTIONS: 'Decide pending requests in Time corrections.',
  SHIFT_REQUESTS: 'Decide pending shift requests in Things to do.',
} as const;

export type LocationRetirementBlocker = keyof typeof blockerMessages;
export const LOCATION_RETIREMENT_BLOCKED = 'LOCATION_RETIREMENT_BLOCKED';

export class LocationRetirementBlockedError extends Error {
  constructor(readonly blockers: LocationRetirementBlocker[]) {
    super(['The location is still active.', ...blockers.map(blocker => blockerMessages[blocker])].join(' '));
  }
}

export function locationRetirementError(error: unknown): LocationRetirementBlockedError | undefined {
  if (!(error instanceof Error) || !('code' in error) || error.code !== '22P02') return;
  const match = /^invalid input syntax for type integer: "location_retirement_blocked:([A-Z_,]+)"$/.exec(error.message);
  if (!match) return;
  const blockers = (Object.keys(blockerMessages) as LocationRetirementBlocker[])
    .filter(blocker => match[1].split(',').includes(blocker));
  if (blockers.length) return new LocationRetirementBlockedError(blockers);
}

/** Run after acquiring the workspace write lock, checking the location version and
 * reauthorizing the Owner. A separate statement sees work committed while waiting. */
export function locationRetirementGuard(locationId: string, workspaceId: string, timeZone: string): SqlStatement {
  return {
    text: `WITH site AS (
      SELECT id FROM locations WHERE id=$1 AND workspace_id=$2 AND active
    ), observed AS (
      SELECT clock_timestamp() AS at
    ), scheduled AS (
      SELECT sh.id, sh.date, sh.start_time, sh.end_time
      FROM site JOIN schedules s ON s.location_id=site.id JOIN shifts sh ON sh.schedule_id=s.id
      WHERE s.status IN ('DRAFT','PUBLISHED')
    ), commitments AS (
      SELECT date,start_time,end_time FROM scheduled
      UNION ALL
      SELECT sh.date,sh.start_time,sh.end_time
      FROM site JOIN schedule_publication_revision_shifts sh ON sh.location_id=site.id
      JOIN schedule_publication_revisions r ON r.id=sh.revision_id
      WHERE NOT EXISTS (
        SELECT 1 FROM schedule_publication_revisions newer
        WHERE newer.week_start=r.week_start AND newer.revision_number>r.revision_number
      )
    ), blockers AS (
      SELECT concat_ws(',',
        CASE WHEN EXISTS (
          SELECT 1 FROM commitments c, observed
          WHERE ((c.date + (c.end_time < c.start_time)::integer + c.end_time) AT TIME ZONE $3)>observed.at
        ) THEN 'SCHEDULE' END,
        CASE WHEN EXISTS (
          SELECT 1 FROM site JOIN manager_open_shifts o ON o.location_id=site.id, observed
          WHERE o.workspace_id=$2 AND o.claimed_by IS NULL AND o.withdrawn_at IS NULL AND o.starts_at>observed.at
        ) THEN 'OPEN_SHIFT_POSTINGS' END,
        CASE WHEN EXISTS (
          SELECT 1 FROM site JOIN time_entries t ON t.location_id=site.id WHERE t.clock_out_at IS NULL
        ) THEN 'OPEN_TIME' END,
        CASE WHEN EXISTS (
          SELECT 1 FROM site JOIN nevora_pending_time_corrections r ON r.location_id=site.id
          WHERE r.workspace_id=$2
        ) THEN 'TIME_CORRECTIONS' END,
        CASE WHEN EXISTS (
          SELECT 1 FROM scheduled sh JOIN shift_callouts c ON c.shift_id=sh.id WHERE c.status='PENDING'
        ) OR EXISTS (
          SELECT 1 FROM shift_exchanges x
          WHERE x.status IN ('OPEN','EMPLOYEE_PENDING','MANAGER_PENDING')
            AND EXISTS (SELECT 1 FROM scheduled sh WHERE sh.id IN (x.source_shift_id,x.target_shift_id))
        ) THEN 'SHIFT_REQUESTS' END
      ) AS codes
    )
    SELECT (CASE WHEN codes='' THEN '1' ELSE 'location_retirement_blocked:'||codes END)::integer FROM blockers`,
    values: [locationId, workspaceId, timeZone],
  };
}
