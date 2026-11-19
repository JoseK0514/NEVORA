import 'server-only';

/** Read only committed management review evidence. A period with no time rows
 * does not qualify. Reopening a period does not erase the historical milestone. */
export const timecardActivationEvidenceSql = `
  EXISTS(
    SELECT 1 FROM public.timecard_revisions r
    WHERE r.workspace_id=w.id AND r.action IN ('APPROVE','FINALIZE')
      AND r.snapshot->'entries'->0 IS NOT NULL
  ) AS "FIRST_TIMECARD_REVIEW"`;
