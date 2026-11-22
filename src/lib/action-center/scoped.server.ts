import 'server-only';
import { businessDate } from '../business-time';
import { buildManagerActionItems, markUpcomingCoverage } from '../assistance/manager-actions';
import { assertOriginalOperationalAccess, isOperationalAuthorizationError } from '../company-access/operational-scope.server';
import { readScopedCoverageActions } from '../data/coverage-repair.server';
import { listWorkforceLeave } from '../data/requests';
import { readManagerTimeCorrections } from '../data/time-corrections.server';
import { assertWorkforcePermission, listWorkforcePermissions } from '../workforce/authority.server';
import { readActivePresentation } from '../workspace-presentation/service';
import { isValidWeekStart } from '../date-utils';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { combineManagerActions, type ActionCenter } from './project';

/** Each source authorizes its own footprint. A company-only workflow never
 * contributes data or links to the location Manager's inbox. */
export async function readScopedActionCenter(proof: SessionMutationProof, weekStart: string, expectedAuthority: string, executor: SqlExecutor): Promise<ActionCenter> {
  if (!isValidWeekStart(weekStart)) return { state: 'unavailable', reason: 'read_failed' };
  try {
    const started = performance.now();
    const { access, permissions } = await listWorkforcePermissions(proof, executor);
    if (access.scope.mode !== 'LOCATIONS' || access.authority !== expectedAuthority) {
      return { state: 'unavailable', reason: 'access_denied' };
    }

    const leaveIds = permissions.filter(grant => grant.permission === 'APPROVE_LEAVE').map(grant => grant.locationId);
    const reviewIds = permissions.filter(grant => grant.permission === 'REVIEW_TIME_EXCEPTION').map(grant => grant.locationId);
    const { modules } = await readActivePresentation(access.workspace.id, executor);
    const [coverage, corrections, leave] = await Promise.all([
      readScopedCoverageActions(proof, weekStart, undefined, executor),
      readManagerTimeCorrections(proof, executor, { allowEmptyWithoutGrant: true, expectedReview: { authority: access.authority, locations: reviewIds } }),
      modules.timeOff && leaveIds.length ? listWorkforceLeave(proof, 'PENDING', executor) : null,
    ]);
    if (coverage.state !== 'ready' || corrections.state !== 'ready' || (leave && leave.state !== 'ready')) {
      return { state: 'unavailable', reason: 'read_failed' };
    }
    if (coverage.authority !== access.authority || (leave && (
      leave.authority !== access.authority ||
      JSON.stringify([...leave.coverage.locationIds].sort()) !== JSON.stringify([...leaveIds].sort())
    ))) {
      return { state: 'unavailable', reason: 'access_denied' };
    }

    const leaveItems = buildManagerActionItems({
      weekStart, availabilityDeadlineSet: true, coverageRulesConfigured: true,
      pendingRequests: (leave?.data ?? []).map(({ id, employeeName, createdAt }) => ({
        id, employeeName, createdAt, kind: 'TIME_OFF',
      })),
    });
    const businessDay = businessDate(new Date(access.observedAt), access.workspace.timeZone);
    const items = combineManagerActions(
      [...markUpcomingCoverage(coverage.data, businessDay), ...leaveItems],
      { groups: [], labels: { employees: [], locations: [] } },
      corrections, { cards: [] }, proof.employee.id,
    ).map(item => item.type === 'TIME_CORRECTION'
      ? { ...item, href: '/app/timecards/corrections#correction-' + encodeURIComponent(item.id.slice('TIME_CORRECTION:'.length)) }
      : item);

    if (leave) await assertWorkforcePermission(proof, 'APPROVE_LEAVE', leaveIds, executor, access);
    if (reviewIds.length) await assertWorkforcePermission(proof, 'REVIEW_TIME_EXCEPTION', reviewIds, executor, access);
    await assertOriginalOperationalAccess(proof, access, executor);
    const validForMs = Math.floor(Math.min(
      access.validForMs - Math.max(0, Date.now() - Date.parse(access.observedAt)),
      coverage.validForMs, corrections.validForMs, leave?.validForMs ?? Infinity,
    ) - (performance.now() - started));
    if (validForMs < 1) return { state: 'unavailable', reason: 'read_failed' };
    return {
      state: 'ready', weekStart, observedAt: access.observedAt, validForMs, items, limitedAttendance: false,
      counts: { total: items.length, scheduling: coverage.data.length, requests: leaveItems.length, timekeeping: corrections.requests.length },
    };
  } catch (error) {
    return { state: 'unavailable', reason: isOperationalAuthorizationError(error) ? 'access_denied' : 'read_failed' };
  }
}
