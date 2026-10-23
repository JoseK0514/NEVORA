import "server-only";
import { readTimecards } from "@/lib/timecards/service";
import { payrollFeatureEnabled } from "@/lib/payroll/service";
import { guarded, statement, workspaceSql } from "@/lib/payroll/store";
import type { PayrollRun } from "@/lib/payroll/contracts";
import { checkOwner } from "./authority.server";
import type { AdvisorStore } from "./store.server";
import type { ToolCall, ToolResult } from "./contracts";
import { issueLabels, type PeriodReview } from "./workflow-contracts";

export async function readPeriodReview(store: AdvisorStore, args: Extract<ToolCall, { name: "attendance_payroll_review" }>["args"]): Promise<ToolResult> {
  const { proof, original, ex } = store;
  await checkOwner(proof, original, ex);
  const cards = await readTimecards(proof, args, ex);
  const attendance: PeriodReview["attendance"] = cards.state === "ready" ? {
    state: "ready", total: cards.cards.length, employees: cards.cards.slice(0, 100).map(c => ({
      name: c.card.employeeName.slice(0, 200), state: c.state, revision: c.revision,
      locations: [...new Set(c.card.entries.map(e => e.locationName.slice(0, 200)))].slice(0, 20),
      issues: [...c.card.issues, ...(!c.card.entries.length ? ["no_records"] : []), ...(c.state !== "FINALIZED" ? ["review_required"] : [])],
      historical: c.state === "FINALIZED",
    })),
  } : { state: "unavailable", total: 0, employees: [] };
  let payroll: PeriodReview["payroll"] = { state: "disabled", runs: [] }, overflow = false;
  if (payrollFeatureEnabled()) {
    try {
      const rows = await guarded<{ run: Pick<PayrollRun, "id" | "revision" | "period" | "status"> & { ruleRevision: number | null; coverageComplete: boolean; codes: string[] }; superseded: boolean }>(proof, "REVIEW", statement(`SELECT jsonb_build_object('id',c.run_id::text,'revision',c.payload->'revision','period',c.payload->'period','status',c.payload->>'status',
        'ruleRevision',c.payload#>'{nativeCalculation,ruleRevision}','coverageComplete',COALESCE((c.payload#>>'{coverage,complete}')::boolean,false),
        'codes',COALESCE((SELECT jsonb_agg(split_part(value,':',1)) FROM jsonb_array_elements_text(c.payload->'exceptions')),'[]'::jsonb)) AS run,
        EXISTS(SELECT 1 FROM payroll_runs child WHERE child.workspace_id=c.workspace_id AND child.correction_of=c.run_id) AS superseded
        FROM payroll_runs_current c WHERE c.workspace_id=${workspaceSql} AND c.payload#>>'{period,startDate}' <= $2 AND c.payload#>>'{period,endDate}' >= $1
        ORDER BY c.payload->>'createdAt' DESC,c.run_id LIMIT 11`, args.startDate, args.endDate), ex);
      overflow = rows.length > 10;
      payroll = { state: "ready", runs: rows.slice(0, 10).map(({ run, superseded }) => ({
        id: run.id, revision: run.revision, startDate: run.period.startDate, endDate: run.period.endDate, status: run.status,
        ruleRevision: run.ruleRevision, coverageComplete: run.coverageComplete, superseded,
        codes: [...new Set(run.codes.map(c => c.split(":")[0]).map(c => Object.hasOwn(issueLabels, c) && /^[A-Z_]+$/.test(c) ? c : "OTHER"))].slice(0, 20),
      })) };
    } catch {
      payroll = { state: "unavailable", runs: [] };
    }
  }
  await checkOwner(proof, original, ex);
  const [clock] = await store.transaction<{ observedAt: string }>({ text: 'SELECT clock_timestamp()::text AS "observedAt"', values: [] });
  const observedAt = clock.observedAt;
  const review: PeriodReview = { ...args, observedAt, readiness: "unverified", partial: cards.state !== "ready" || attendance.total > 100 || overflow || payroll.state !== "ready", attendance, payroll };
  return {
    observedAt, partial: review.partial, periodReview: review,
    sources: [{ label: args.language === "es" ? "Tarjetas de tiempo" : "Timecards", href: `/app/timecards?start=${args.startDate}&end=${args.endDate}`, observedAt }, { label: args.language === "es" ? "Nómina" : "Payroll", href: "/app/payroll", observedAt }],
    data: review,
  };
}
