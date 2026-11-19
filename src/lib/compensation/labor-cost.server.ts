import 'server-only';
import { readOperationalSchedule } from '../company-access/operational-read.server';
import { neonNotificationExecutor } from '../data/sql-executor';
import type { SqlExecutor } from '../notifications/types';
import { PayrollError } from '../payroll/model';
import type { WageTerms } from '../payroll/native/contracts';
import type { SessionMutationProof } from '../shift-changes/types';
import { applyDraft, estimateShifts, parseCostRequest, rateIntervals } from './labor-cost';
import { ownerTransaction, q, ws } from './store.server';

export async function draftLaborCost(proof: SessionMutationProof, value: unknown, ex: SqlExecutor = neonNotificationExecutor()) {
  if (proof.employee.role !== 'OWNER') throw new PayrollError('ACCESS_DENIED',403);
  const {weekStart, locationId, changes} = parseCostRequest(value);
  const source = await readOperationalSchedule(proof,{weekStart,locationId},ex);
  if (source.state !== 'ready') {
    if (source.reason === 'access_denied') throw new PayrollError('ACCESS_DENIED',403);
    throw new PayrollError('SCHEDULE_UNAVAILABLE',503);
  }
  const {before, after} = applyDraft(source.data,changes);
  const ids = [...new Set([...before,...after].map(s => s.employeeId))];
  const [facts] = await ownerTransaction<{timeZone:string; profiles:{employeeId:string; wages:WageTerms[]}[]}>(proof, ex, [
    q(`SELECT w.time_zone AS "timeZone", COALESCE((
      SELECT jsonb_agg(jsonb_build_object('employeeId',p.employee_id,'wages',(
        SELECT COALESCE(jsonb_agg(jsonb_build_object('id',r->'id','effectiveFrom',r->'effectiveFrom',
          'effectiveTo',r->'effectiveTo','locationIds',jsonb_build_array($2::text),'hourlyRateMinor',r->'hourlyRateMinor')),'[]'::jsonb)
        FROM jsonb_array_elements(p.payload->'wages') r WHERE r->'locationIds' ? $2)))
      FROM native_payroll_profiles_current p WHERE p.workspace_id=w.id AND p.employee_id=ANY($1::text[])
    ),'[]'::jsonb) AS profiles FROM workspaces w WHERE w.id=${ws}`,ids,locationId)]);
  if (!facts) throw new PayrollError('WAGE_SOURCE_UNAVAILABLE',503);
  const rates = new Map(facts.profiles.map(p => [p.employeeId,rateIntervals(p.wages,locationId)]));
  const saved = estimateShifts(before,rates,facts.timeZone);
  const draft = estimateShifts(after,rates,facts.timeZone);
  if (Date.now() >= Date.parse(source.observedAt) + source.validForMs) throw new PayrollError('SCHEDULE_UNAVAILABLE',503);
  return {version:'SCHEDULE_BASE_WAGE_ESTIMATE_V1', weekStart,locationId,timeZone:facts.timeZone,
    scheduleObservedAt:source.observedAt,currency:'USD',basis:'scheduled_elapsed_time_at_effective_hourly_rate',
    excludes:['overtime_and_premiums','break_adjustments','employer_taxes_and_benefits','employee_deductions','released_callouts'],
    saved,draft,deltaMinor:saved.totalMinor === null || draft.totalMinor === null ? null :
      (BigInt(draft.totalMinor)-BigInt(saved.totalMinor)).toString()};
}
