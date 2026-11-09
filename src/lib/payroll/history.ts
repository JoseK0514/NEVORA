/** SQL bounds apply before JSON aggregation. Overflow is explicit; no partial counts. */
export const payrollHistorySql = `WITH context AS (
 SELECT id,time_zone,to_char(clock_timestamp() AT TIME ZONE time_zone,'YYYY-MM-DD') AS today FROM workspaces WHERE singleton AND active
), history AS (
 SELECT s.payload,s.revision FROM payroll_setting_revisions s JOIN context w ON w.id=s.workspace_id WHERE s.effective_from<=w.today::date ORDER BY s.effective_from,s.revision DESC LIMIT 1001
), originals AS (
 SELECT r.start_date,r.end_date,c.payload->>'status' AS status FROM payroll_runs r JOIN context w ON w.id=r.workspace_id JOIN payroll_runs_current c ON c.workspace_id=r.workspace_id AND c.run_id=r.id WHERE r.correction_of IS NULL AND r.start_date>=w.today::date-3660 AND r.start_date<w.today::date ORDER BY r.start_date,r.end_date LIMIT 10001
) SELECT w.today,
 (SELECT payload FROM payroll_setting_revisions WHERE workspace_id=w.id AND effective_from<=w.today::date ORDER BY effective_from DESC,revision DESC LIMIT 1) AS settings,
 COALESCE((SELECT jsonb_agg(payload ORDER BY revision) FROM history),'[]'::jsonb) AS history,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('startDate',start_date,'endDate',end_date)) FROM originals),'[]'::jsonb) AS originals,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('startDate',start_date,'endDate',end_date)) FROM originals WHERE status='APPROVED'),'[]'::jsonb) AS approved,
 ((SELECT count(*) FROM history)>1000 OR (SELECT count(*) FROM originals)>10000) AS overflow
 FROM context w`;
