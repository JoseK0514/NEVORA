import {assertOperationalAccess,assertOriginalOperationalAccess,isOperationalAuthorizationError,operationalScopeStatements,OperationalAuthorizationError,OperationalUnavailableError} from '../company-access/operational-scope.server';
import type {OperationalRead} from '../company-access/model';
import {buildManagerActionItems} from '../assistance/manager-actions';
import {workspaceReadGuard} from './workspaces';
import { createHash } from 'node:crypto';
import type { SessionMutationProof } from '../shift-changes/types';
import type { SqlExecutor } from '../notifications/types';
import { addDays, isValidWeekStart } from '../date-utils';
import { businessDate, shiftBoundaryInstants } from '../business-time';
import { minutesInWorkweek, shiftPeriod } from '../scheduling/periods';
import { calculateScheduleHealth } from '../scheduling/schedule-health';
import { rankCoverageCandidates } from '../scheduling/coverage-ranking';
import { CoverageRepairConflictError, parseCoverageRepairLocator, reportedCoverageState, type CoverageRepairLocator } from '../scheduling/coverage-repair';
import { generationSourceSql, type GenerationSource } from './generation-guards';
import { mapSchedulingSourceFacts, type SchedulingSourceFacts } from './scheduling-source-facts';
import { assertManagementProof } from './management-session';
import { neonNotificationExecutor } from './notification-transactions';

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
function sourceVersion(source: GenerationSource) { return createHash('sha256').update(stable(source)).digest('hex'); }

type CoveragePeriod = Pick<CoverageRepairLocator, 'weekStart'|'locationId'|'date'|'startTime'|'endTime'|'positionId'>;

function coverageFacts(source: GenerationSource, weekStart: string, workspaceId = String(source.workspaces.find(w => w.singleton === true)?.id ?? source.workspaces[0]?.id)) {
  return mapSchedulingSourceFacts(source, {workspaceId,startDate:weekStart,endDate:addDays(weekStart,7),retainAdjacentCommitments:true});
}

function coverageHealth(facts: SchedulingSourceFacts, weekStart: string, visibleLocationIds?: readonly string[]) {
  return calculateScheduleHealth({ workspace: facts.workspace, positions: facts.positions, shifts: facts.ledger,
    locations: facts.locations.filter(l => l.active && (!visibleLocationIds || visibleLocationIds.includes(l.id))).map(l => ({ id: l.id, name: l.shortName, minimumStaffPerShift: facts.staffing.find(s => s.locationId === l.id)?.minimumStaffPerShift ?? null, requiresDesignatedLead: facts.staffing.find(s => s.locationId === l.id)?.requiresDesignatedLead ?? null })),
    employees: facts.employees.map(e => ({ ...e, name: `${e.firstName} ${e.lastName}` })), coverageWindows: facts.coverageWindows,
    weekDates: Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) });
}

function coverageLocation(facts: SchedulingSourceFacts, period: CoveragePeriod) {
  const location = facts.locations.find(l => l.id === period.locationId && l.active);
  if (!facts.workspace.active || !location) throw new CoverageRepairConflictError();
  try { shiftBoundaryInstants(period, facts.workspace.timeZone); } catch { throw new CoverageRepairConflictError(); }
  return location;
}

/** Derive health and candidates from the same complete scheduling source as the write guard. */
export function deriveCoverageRepair(source: GenerationSource, supplied: CoverageRepairLocator, refresh = false) {
  const locator = parseCoverageRepairLocator(JSON.stringify(supplied));
  const facts = coverageFacts(source, locator.weekStart);
  const location = coverageLocation(facts, locator);
  const health = coverageHealth(facts, locator.weekStart);
  const block = health.coverageBlocks.find(b => b.key === locator.gapKey && b.locationId === locator.locationId && b.date === locator.date && b.startTime === locator.startTime && b.endTime === locator.endTime);
  const targets = block ? [
    ...block.positionCoverage.filter(p => p.missing > 0).map(p => ({ target: 'POSITION' as const, positionId: p.positionId, positionName:p.positionName,count:p.missing,label: `${p.positionName}: ${p.missing} needed` })),
    ...(block.gap && block.gap > 0 ? [{ target: 'STAFFING' as const,count:block.gap,label: `${block.gap} employees needed` }] : []),
    ...(block.requiresLead && !block.leadCovered ? [{ target: 'LEAD' as const,count:1,label: 'Shift lead needed' }] : []),
  ] : [];
  const current = block ? reportedCoverageState({ ...block, requiresLead: block.requiresLead && !block.leadCovered }) : undefined;
  const changed = !current || stable(current) !== stable(locator.reported);
  let currentLocator = refresh && current ? { ...locator, reported: current } : locator;
  const targetAvailable = targets.some(t => t.target === locator.target && (t.target !== 'POSITION' || t.positionId === locator.positionId));
  const status = !block || block.gap === null || block.requiresLead === null ? 'STALE' as const
    : block.covered ? 'RESOLVED' as const
    : changed && !refresh ? 'STALE' as const
    : locator.target === 'CHOOSE' ? 'CHOOSE' as const
    : !targetAvailable ? refresh && targets.length ? 'CHOOSE' as const : 'STALE' as const : 'READY' as const;
  if (status === 'CHOOSE') currentLocator = { ...currentLocator, target: 'CHOOSE', positionId: undefined };
  const designatedLead = !!(block?.requiresLead && !block.leadCovered) || currentLocator.target === 'LEAD';
  const candidates = status === 'READY' ? rankForPeriod(facts, currentLocator, location, designatedLead) : [];
  return { status, locator: currentLocator, block, targets, location, position: facts.positions.find(p => p.id === currentLocator.positionId), designatedLead, candidates, sourceVersion: sourceVersion(source), workspaceId: facts.workspace.id };
}

function rankForPeriod(facts: SchedulingSourceFacts, locator: CoveragePeriod, location: ReturnType<typeof coverageLocation>, designatedLead: boolean) {
  const inputs = facts.employees.map(employee => {
    let priorUnderTargetWeeks = 0;
    if (employee.targetWeeklyHours !== undefined) for (let i = 1; i <= 3; i++) {
      const week = addDays(locator.weekStart, -i * 7);
      const minutes = facts.ledger.filter(s => s.employeeId === employee.id && !s.isCalloutApproved).reduce((sum, s) => sum + minutesInWorkweek(shiftPeriod(s), week), 0);
      if (minutes >= employee.targetWeeklyHours * 60) break;
      priorUnderTargetWeeks++;
    }
    return { employeeName: `${employee.firstName} ${employee.lastName}`, role: employee.role, primaryLocationId: employee.primaryLocationId, priorUnderTargetWeeks,
      rules: { candidate: { employeeId: employee.id, locationId: locator.locationId, date: locator.date, startTime: locator.startTime, endTime: locator.endTime, positionId: locator.positionId, isDesignatedLead: designatedLead },
        workspace: facts.workspace, location, position: facts.positions.find(p => p.id === locator.positionId), employee,
        existingShifts: facts.ledger, availability: employee.availability, weeklyAvailability: employee.weeklyAvailability,
        managementRestrictions: employee.managementRestrictions,
        availabilityExceptions: employee.availabilityExceptions, approvedTimeOff: employee.approvedTimeOff, operationalProfile: employee.operationalProfile, policy: facts.policy } };
  });
  return rankCoverageCandidates(inputs);
}

type Review = { version: 1; locator: CoverageRepairLocator; employeeId: string; actorEmployeeId: string; workspaceId: string; sourceVersion: string };
/** Untrusted retained review hint. Live authority, current exact gap and qualification are always checked independently. */
export function createCoverageRepairReview(source: GenerationSource, locator: CoverageRepairLocator, employeeId: string, proof: SessionMutationProof): string {
  assertManagementProof(proof, proof.employee.id);
  const result = deriveCoverageRepair(source, locator);
  if (result.status !== 'READY' || !result.candidates.some(c => c.employeeId === employeeId)) throw new CoverageRepairConflictError();
  return encodeCoverageRepairReview(result, employeeId, proof);
}

function encodeCoverageRepairReview(result: Pick<ReturnType<typeof deriveCoverageRepair>, 'locator'|'workspaceId'|'sourceVersion'>, employeeId: string, proof: SessionMutationProof) {
  const review: Review = {version:1,locator:result.locator,employeeId,actorEmployeeId:proof.employee.id,workspaceId:result.workspaceId,sourceVersion:result.sourceVersion};
  return Buffer.from(JSON.stringify(review)).toString('base64url');
}
export function decodeCoverageRepairReview(token: string, proof: SessionMutationProof): Review {
  try {
    assertManagementProof(proof, proof.employee.id);
    if (token.length > 16384) throw new Error();
    if (!/^[A-Za-z0-9_-]+$/.test(token)) throw new Error();
    const review = JSON.parse(Buffer.from(token, 'base64url').toString());
    if (review.version !== 1 || review.actorEmployeeId !== proof.employee.id || typeof review.employeeId !== 'string' || !review.employeeId || typeof review.workspaceId !== 'string' || !/^[a-f0-9]{64}$/.test(review.sourceVersion)) throw new Error();
    return { ...review, locator: parseCoverageRepairLocator(JSON.stringify(review.locator)) };
  } catch { throw new CoverageRepairConflictError(); }
}
export function assertCoverageRepairReview(source: GenerationSource | undefined, token: string, proof: SessionMutationProof) {
  const review = decodeCoverageRepairReview(token, proof);
  if (!source || sourceVersion(source) !== review.sourceVersion) throw new CoverageRepairConflictError();
  const result = deriveCoverageRepair(source, review.locator);
  if (result.status !== 'READY' || result.workspaceId !== review.workspaceId || !result.candidates.some(c => c.employeeId === review.employeeId)) throw new CoverageRepairConflictError();
  return { ...review, result };
}

async function protectedSource(proof: SessionMutationProof, executor: SqlExecutor): Promise<GenerationSource> {
  assertManagementProof(proof, proof.employee.id);
  const {workspace}=await assertOperationalAccess(proof,{kind:'COMPANY'},executor);
  const guards=[...workspaceReadGuard(workspace),
    {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
    ...operationalScopeStatements(proof,workspace,{kind:'COMPANY'})];
  const results=await executor.transaction([...guards,
    {text:`SELECT ${generationSourceSql} AS source`,values:[]},
    ...operationalScopeStatements(proof,workspace,{kind:'COMPANY'})]);
  const source=(results[guards.length]?.[0] as {source?:GenerationSource}|undefined)?.source;
  if (!source) throw new CoverageRepairConflictError();
  return source;
}
export async function readCoverageRepair(locator: CoverageRepairLocator, proof: SessionMutationProof, refresh = false, executor: SqlExecutor = neonNotificationExecutor()) {
  const source = await protectedSource(proof, executor); const result = deriveCoverageRepair(source, locator, refresh);
  // Never return the source or server proof to page/form callers.
  return { ...result, candidates: result.candidates.map(c => ({ employeeId: c.employeeId, employeeName: c.employeeName, role: c.role, primaryLocationId: c.primaryLocationId, scheduledHours: c.scheduledHours, targetHours: c.targetHours, hoursNeeded: c.hoursNeeded, priorUnderTargetWeeks: c.priorUnderTargetWeeks,
    review: createCoverageRepairReview(source, result.locator, c.employeeId, proof) })) };
}
export async function readCoverageRepairSelection(token: string, proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()) {
  const source = await protectedSource(proof, executor); const review = assertCoverageRepairReview(source, token, proof);
  return projectCoverageSelection(source, review);
}

function projectCoverageSelection(source: GenerationSource, review: ReturnType<typeof assertCoverageRepairReview>) {
  const candidate = review.result.candidates.find(c => c.employeeId === review.employeeId)!;
  const publication = source.schedules.find(s => s.location_id === review.locator.locationId && s.week_start === review.locator.weekStart)?.status === 'PUBLISHED' ? 'PUBLISHED' as const : 'DRAFT' as const;
  return { locator: review.locator, employeeId: candidate.employeeId, employeeName: candidate.employeeName, locationName: review.result.location.shortName, positionName: review.result.position?.name, isDesignatedLead: review.result.designatedLead, publication };
}

/** Recheck the original scope before and after reading, and again after projection.
 * The complete ledger remains server-private to check conflicts across locations. */
async function scopedCoverageRead<T>(
  proof: SessionMutationProof,
  locationId: string | undefined,
  load: (source: GenerationSource, locationIds: string[], workspaceId: string) => T,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<OperationalRead<T>> {
  try {
    const access = await assertOperationalAccess(proof, locationId === undefined ? undefined : {kind:'LOCATIONS',locationIds:[locationId]}, executor);
    if (access.scope.mode !== 'LOCATIONS') return {state:'unavailable',reason:'access_denied'};
    const locationIds = locationId === undefined ? access.scope.locationIds : [locationId];
    const footprint = {kind:'LOCATIONS' as const,locationIds};
    const fence = operationalScopeStatements(proof, access.workspace, footprint, access.authority);
    const guards = [...workspaceReadGuard(access.workspace),
      {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
      ...fence];
    const rows = await executor.transaction([...guards, {text:`SELECT ${generationSourceSql} AS source`,values:[]}, ...fence]);
    const source = (rows[guards.length]?.[0] as {source?:GenerationSource}|undefined)?.source;
    if (!source) return {state:'unavailable',reason:'read_failed'};
    const data = load(source, locationIds, access.workspace.id);
    await assertOriginalOperationalAccess(proof, access, executor);
    return {state:'ready',data,coverage:footprint,authority:access.authority,observedAt:access.observedAt,validForMs:access.validForMs};
  } catch (error) {
    if (isOperationalAuthorizationError(error)) return {state:'unavailable',reason:'access_denied'};
    if (error instanceof OperationalUnavailableError && error.reason === 'not_configured') return {state:'unavailable',reason:'not_configured'};
    return {state:'unavailable',reason:'read_failed'};
  }
}

export async function readScopedCoverageGaps(proof: SessionMutationProof, weekStart: string, locationId?: string, executor?: SqlExecutor) {
  if (!isValidWeekStart(weekStart)) return {state:'unavailable' as const,reason:'access_denied' as const};
  return scopedCoverageRead(proof, locationId, (source, locationIds, workspaceId) => {
    const facts = coverageFacts(source, weekStart, workspaceId);
    const today = businessDate(new Date(), facts.workspace.timeZone);
    const gaps = coverageHealth(facts, weekStart, locationIds).coverageBlocks
      .filter(block => !block.covered && block.gap !== null && block.requiresLead !== null && block.date >= today)
      .map(block => ({...block,requiresLead:block.requiresLead && !block.leadCovered}));
    return buildManagerActionItems({weekStart,coverageGaps:gaps,availabilityDeadlineSet:true,coverageRulesConfigured:true})
      .filter(item => item.type === 'COVERAGE_GAP')
      .map(({id,title,detail,href}) => ({id,title,detail,href}));
  }, executor);
}

function safeCandidates(facts: SchedulingSourceFacts, locationId: string, candidates: ReturnType<typeof rankForPeriod>) {
  const allowed = new Set(facts.employees.filter(employee => facts.locations.some(location => location.id === employee.primaryLocationId) &&
    employee.eligibleLocationIds.includes(locationId)).map(employee => employee.id));
  return candidates.filter(candidate => allowed.has(candidate.employeeId));
}

function draftCover(source: GenerationSource, period: CoveragePeriod) {
  const schedule = source.schedules.find(row => row.location_id === period.locationId && row.week_start === period.weekStart);
  return !schedule || schedule.status === 'DRAFT';
}

export async function readScopedCoverageRepair(locator: CoverageRepairLocator, proof: SessionMutationProof, refresh: boolean, executor?: SqlExecutor) {
  return scopedCoverageRead(proof, locator.locationId, (source, _ids, workspaceId) => {
    const facts = coverageFacts(source, locator.weekStart, workspaceId);
    const location = coverageLocation(facts, locator);
    const review = deriveCoverageRepair(source, locator, refresh);
    const candidates = safeCandidates(facts,locator.locationId,review.candidates)
      .map(({employeeId,employeeName}): {employeeId:string;employeeName:string;review:string;scheduledHours?:never;targetHours?:never} =>
        ({employeeId,employeeName,review:encodeCoverageRepairReview(review,employeeId,proof)}));
    return {status:review.status,locator:review.locator,targets:review.targets,designatedLead:review.designatedLead,
      location:{shortName:location.shortName},position:review.position ? {name:review.position.name} : undefined,
      draft:draftCover(source,locator),candidates,
    };
  }, executor);
}

export async function readScopedCoverageSuggestions(period: CoveragePeriod, proof: SessionMutationProof, designatedLead: boolean, executor?: SqlExecutor) {
  return scopedCoverageRead(proof, period.locationId, (source, _ids, workspaceId) => {
    const facts = coverageFacts(source, period.weekStart, workspaceId), location = coverageLocation(facts, period);
    const candidates = safeCandidates(facts, period.locationId, rankForPeriod(facts, period, location, designatedLead));
    const positionName = candidates.length ? facts.positions.find(item => item.id === period.positionId && item.active)?.name : undefined;
    return {locationName:location.shortName,positionName,draft:draftCover(source,period),
      candidates:candidates.map(({employeeId,employeeName}) => ({employeeId,employeeName}))};
  }, executor);
}

export async function readScopedCoverageRepairSelection(token: string, proof: SessionMutationProof, executor?: SqlExecutor) {
  let locator;
  try { ({locator} = decodeCoverageRepairReview(token, proof)); }
  catch (error) {
    if (!(error instanceof CoverageRepairConflictError)) throw error;
    return {state:'unavailable' as const,reason:'access_denied' as const};
  }
  return scopedCoverageRead(proof, locator.locationId, (source, _ids, workspaceId) => {
    try {
      const review = assertCoverageRepairReview(source, token, proof);
      const facts = coverageFacts(source, locator.weekStart, workspaceId);
      if (review.workspaceId !== workspaceId || !safeCandidates(facts,locator.locationId,review.result.candidates).some(item => item.employeeId === review.employeeId)) {
        throw new OperationalAuthorizationError();
      }
      return {...projectCoverageSelection(source, review), draft:draftCover(source,locator)};
    } catch (error) {
      if (!(error instanceof CoverageRepairConflictError)) throw error;
      return null;
    }
  }, executor);
}
