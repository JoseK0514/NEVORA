import { createHash } from 'node:crypto';
import type { SessionMutationProof } from '../shift-changes/types';
import type { SqlExecutor } from '../notifications/types';
import { addDays } from '../date-utils';
import { shiftBoundaryInstants } from '../business-time';
import { minutesInWorkweek, shiftPeriod } from '../scheduling/periods';
import { calculateScheduleHealth } from '../scheduling/schedule-health';
import { rankCoverageCandidates } from '../scheduling/coverage-ranking';
import { CoverageRepairConflictError, parseCoverageRepairLocator, reportedCoverageState, type CoverageRepairLocator } from '../scheduling/coverage-repair';
import { generationSourceSql, type GenerationSource } from './generation-guards';
import { mapSchedulingSourceFacts } from './scheduling-source-facts';
import { assertManagementProof, managementSessionStatements } from './management-session';
import { neonNotificationExecutor } from './notification-transactions';

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
function sourceVersion(source: GenerationSource) { return createHash('sha256').update(stable(source)).digest('hex'); }

/** Derive health and candidates from the SAME complete scheduling source as the write guard. */
export function deriveCoverageRepair(source: GenerationSource, supplied: CoverageRepairLocator, refresh = false) {
  const locator = parseCoverageRepairLocator(JSON.stringify(supplied));
  const workspaceId = String(source.workspaces.find(w => w.singleton === true)?.id ?? source.workspaces[0]?.id);
  const facts = mapSchedulingSourceFacts(source, { workspaceId, startDate: locator.weekStart, endDate: addDays(locator.weekStart, 7), retainAdjacentCommitments: true });
  const location = facts.locations.find(l => l.id === locator.locationId && l.active);
  if (!facts.workspace.active || !location) throw new CoverageRepairConflictError();
  try { shiftBoundaryInstants(locator, facts.workspace.timeZone); } catch { throw new CoverageRepairConflictError(); }
  const health = calculateScheduleHealth({ workspace: facts.workspace, positions: facts.positions, shifts: facts.ledger,
    locations: facts.locations.filter(l => l.active).map(l => ({ id: l.id, name: l.shortName, minimumStaffPerShift: facts.staffing.find(s => s.locationId === l.id)?.minimumStaffPerShift ?? null, requiresDesignatedLead: facts.staffing.find(s => s.locationId === l.id)?.requiresDesignatedLead ?? null })),
    employees: facts.employees.map(e => ({ ...e, name: `${e.firstName} ${e.lastName}` })), coverageWindows: facts.coverageWindows,
    weekDates: Array.from({ length: 7 }, (_, i) => addDays(locator.weekStart, i)) });
  const block = health.coverageBlocks.find(b => b.key === locator.gapKey && b.locationId === locator.locationId && b.date === locator.date && b.startTime === locator.startTime && b.endTime === locator.endTime);
  const targets = block ? [
    ...block.positionCoverage.filter(p => p.missing > 0).map(p => ({ target: 'POSITION' as const, positionId: p.positionId, label: `${p.positionName}: ${p.missing} missing` })),
    ...(block.gap && block.gap > 0 ? [{ target: 'STAFFING' as const, label: `${block.gap} employees missing` }] : []),
    ...(block.requiresLead && !block.leadCovered ? [{ target: 'LEAD' as const, label: 'Designated Lead missing' }] : []),
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
  const inputs = status === 'READY' ? facts.employees.map(employee => {
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
        availabilityExceptions: employee.availabilityExceptions, approvedTimeOff: employee.approvedTimeOff, operationalProfile: employee.operationalProfile, policy: facts.policy } };
  }) : [];
  return { status, locator: currentLocator, block, targets, location, position: facts.positions.find(p => p.id === currentLocator.positionId), designatedLead, candidates: rankCoverageCandidates(inputs), sourceVersion: sourceVersion(source), workspaceId };
}

type Review = { version: 1; locator: CoverageRepairLocator; employeeId: string; actorEmployeeId: string; workspaceId: string; sourceVersion: string };
/** Untrusted retained review hint. Live authority, current exact gap and qualification are always checked independently. */
export function createCoverageRepairReview(source: GenerationSource, locator: CoverageRepairLocator, employeeId: string, proof: SessionMutationProof): string {
  assertManagementProof(proof, proof.employee.id);
  const result = deriveCoverageRepair(source, locator);
  if (result.status !== 'READY' || !result.candidates.some(c => c.employeeId === employeeId)) throw new CoverageRepairConflictError();
  const review: Review = { version: 1, locator: result.locator, employeeId, actorEmployeeId: proof.employee.id, workspaceId: result.workspaceId, sourceVersion: result.sourceVersion };
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
  const statements = [
    { text: 'SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR SHARE', values: [] },
    { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [proof.employee.id] },
    ...managementSessionStatements(proof, proof.employee.id),
    { text: `SELECT ${generationSourceSql} AS source`, values: [] },
    ...managementSessionStatements(proof, proof.employee.id),
  ];
  const results = await executor.transaction(statements); const source = (results[4]?.[0] as { source?: GenerationSource } | undefined)?.source;
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
  const candidate = review.result.candidates.find(c => c.employeeId === review.employeeId)!;
  return { locator: review.locator, employeeId: candidate.employeeId, employeeName: candidate.employeeName, locationName: review.result.location.shortName, positionName: review.result.position?.name, isDesignatedLead: review.result.designatedLead };
}
