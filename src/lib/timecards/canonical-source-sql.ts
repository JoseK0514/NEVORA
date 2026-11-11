import {timecardReadSql} from './service';
import {TIMECARD_READ_PAGE_SIZE} from './read-model';
// A canonical payroll source is one JSON object, while the timecard read returns
// bounded pages. Assemble inside the same statement so both review and its exact
// commit fence see every page. Preserve the one-page JSON shape used by existing
// population hashes, and exclude the volatile observation from all source fences.
export const canonicalTimecardsSql = `(WITH payroll_pages AS MATERIALIZED (${timecardReadSql}),
 payroll_complete AS MATERIALIZED (
  SELECT min("totalRows") AS total_rows,count(*) AS page_count,
   CASE WHEN count(*)>0 AND min("totalRows")>=0 AND min("totalRows")=max("totalRows")
    AND count(DISTINCT "observedAt")=1 AND min("pageIndex")=0 AND max("pageIndex")+1=count(*)
    AND count(DISTINCT "pageIndex")=count(*)
    AND count(*)=GREATEST(1,(max("totalRows")::bigint+${TIMECARD_READ_PAGE_SIZE}-1)/${TIMECARD_READ_PAGE_SIZE})
    AND bool_and(jsonb_array_length(cards)=LEAST(${TIMECARD_READ_PAGE_SIZE},"totalRows"-"pageIndex"*${TIMECARD_READ_PAGE_SIZE}))
   THEN 1 ELSE (COALESCE(min("pageIndex")::text,'missing')||':PAYROLL_SOURCE_INCOMPLETE')::integer END AS complete
  FROM payroll_pages
 )
 SELECT CASE WHEN c.page_count=1 THEN (SELECT to_jsonb(p)-'observedAt' FROM payroll_pages p)
  ELSE jsonb_build_object('totalRows',c.total_rows,'pageIndex',0,
   'cards',COALESCE((SELECT jsonb_agg(r.value ORDER BY p."pageIndex",r.ordinality)
    FROM payroll_pages p CROSS JOIN LATERAL jsonb_array_elements(p.cards) WITH ORDINALITY r(value,ordinality)),'[]'::jsonb),
   'paging',jsonb_build_object('version','COMPLETE_READ_V1','pageSize',${TIMECARD_READ_PAGE_SIZE},'totalRows',c.total_rows,
    'pageCounts',(SELECT jsonb_agg(jsonb_array_length(p.cards) ORDER BY p."pageIndex") FROM payroll_pages p))) END
 FROM payroll_complete c WHERE c.complete=1)`;
