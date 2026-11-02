import "server-only";
import { createHash } from "node:crypto";
import { checkOwner } from "./authority.server";
import type { AdvisorStore } from "./store.server";
import { AdvisorError } from "./contracts";
import { deriveOperationalInsights, INSIGHT_SOURCE_LIMIT, parseOperationalInsights, parseInsightRange, type InsightRange, type InsightSource, type OperationalInsights } from "./operational-insights";

/** One guarded statement takes the source snapshot, counts all eligible records,
 * hashes their selected metadata, and returns at most 3,000 records per source.
 * No employee names, notes, hours, requirements or inferred worker profiles. */
export async function readOperationalInsights(store: AdvisorStore, input: InsightRange, signal: AbortSignal): Promise<OperationalInsights> {
  const range = parseInsightRange(input);
  const { proof, original, ex } = store;
  if (signal.aborted) throw new AdvisorError("cancelled");
  await checkOwner(proof, original, ex);
  let result: OperationalInsights;
  try {
    const [row] = await store.transaction<{ source: InsightSource; fingerprint: string; observedAt: string }>({
      text: `WITH latest AS MATERIALIZED (
        SELECT DISTINCT ON(week_start) id,week_start,revision_number FROM schedule_publication_revisions
        WHERE week_start <= $3::date AND week_start >= $2::date - 6 ORDER BY week_start,revision_number DESC,id DESC
      ), shifts AS MATERIALIZED (
        SELECT s.id,s.location_id AS "locationId",left(l.name,200) AS "locationName",s.date::text AS date,r.revision_number AS revision,
          s.employee_id,s.start_time,s.end_time,r.id AS publication_id
        FROM schedule_publication_revision_shifts s JOIN latest r ON r.id=s.revision_id JOIN locations l ON l.id=s.location_id
        WHERE l.workspace_id=$1 AND s.date BETWEEN $2::date AND $3::date AND NOT s.is_callout_approved
      ), entries AS MATERIALIZED (
        SELECT COALESCE(e.time_entry_id,e.adjustment_id::text) AS id,e.location_id AS "locationId",left(l.name,200) AS "locationName",
          (e.start_at AT TIME ZONE $4)::date::text AS "startDate",
          ((e.end_at - interval '1 microsecond') AT TIME ZONE $4)::date::text AS "lastDate",
          e.source_kind AS "sourceKind",(e.adjustment_id IS NOT NULL) AS corrected,
          e.employee_id,e.start_at,e.end_at,e.adjustment_id,e.recorded_version
        FROM nevora_effective_time_entries e JOIN locations l ON l.id=e.location_id
        WHERE l.workspace_id=$1 AND e.start_at < (($3::date+1)::timestamp AT TIME ZONE $4)
          AND (e.end_at IS NULL OR e.end_at > ($2::date::timestamp AT TIME ZONE $4))
      ), cards AS MATERIALIZED (
        SELECT operation_id::text AS id,action,employee_id,start_date,end_date,revision,source_hash
        FROM nevora_timecard_latest WHERE workspace_id=$1 AND start_date <= $3::date AND end_date >= $2::date
      ) SELECT clock_timestamp()::text AS "observedAt",
        jsonb_build_object(
          'shifts',COALESCE((SELECT jsonb_agg(to_jsonb(x) - ARRAY['employee_id','start_time','end_time','publication_id'] ORDER BY date,id) FROM (SELECT * FROM shifts ORDER BY date,id LIMIT $5) x),'[]'::jsonb),
          'entries',COALESCE((SELECT jsonb_agg(to_jsonb(x) - ARRAY['employee_id','start_at','end_at','adjustment_id','recorded_version'] ORDER BY "startDate",id) FROM (SELECT * FROM entries ORDER BY "startDate",id LIMIT $5) x),'[]'::jsonb),
          'cards',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'action',action) ORDER BY id) FROM (SELECT * FROM cards ORDER BY id LIMIT $5) x),'[]'::jsonb),
          'totals',jsonb_build_object('publishedShiftRecords',(SELECT count(*) FROM shifts),'effectiveEntryRecords',(SELECT count(*) FROM entries),'timecardPeriodRecords',(SELECT count(*) FROM cards))) AS source,
        concat_ws(':',
          (SELECT md5(COALESCE(string_agg(to_jsonb(s)::text,',' ORDER BY id),'')) FROM shifts s),
          (SELECT md5(COALESCE(string_agg(to_jsonb(e)::text,',' ORDER BY id),'')) FROM entries e),
          (SELECT md5(COALESCE(string_agg(to_jsonb(c)::text,',' ORDER BY id),'')) FROM cards c),
          (SELECT md5(COALESCE(string_agg(to_jsonb(r)::text,',' ORDER BY week_start),'')) FROM latest r)) AS fingerprint`,
      values: [original.workspace.id, range.startDate, range.endDate, original.workspace.timeZone, INSIGHT_SOURCE_LIMIT],
    }, signal);
    if (!row) throw Error("Missing insight snapshot");
    const sourceVersion = createHash("sha256").update(JSON.stringify([original.workspace.id, original.workspace.timeZone, range, row.fingerprint])).digest("hex");
    result = parseOperationalInsights(deriveOperationalInsights(row.source, range, row.observedAt, original.workspace.timeZone, sourceVersion));
  } catch {
    if (signal.aborted) throw new AdvisorError("cancelled");
    result = { ...range, state: "unavailable", observedAt: new Date().toISOString(), timeZone: original.workspace.timeZone, sourceVersion: null, partial: true, denominators: null, omissions: null, observations: [], suggestions: [] };
  }
  await checkOwner(proof, original, ex);
  if (signal.aborted) throw new AdvisorError("cancelled");
  return result;
}
