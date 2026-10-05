import { shiftBoundaryInstants } from '../business-time';
import { evaluateRequestDeadlines } from './policy';
import type { NotificationPolicy } from '../notifications/types';
import type { ShiftChangePolicy, ShiftTerms } from './types';
export type MaintenanceSnapshot = {
    id: string;
    kind: 'EXCHANGE' | 'CALLOUT';
    workflow: 'SWAP' | 'COVERAGE';
    status: string;
    revision: number;
    legacyManual: boolean;
    completionDeadline: string | null;
    source: ShiftTerms | null;
    target: ShiftTerms | null;
    policy: ShiftChangePolicy | null;
    escalatedAt: string | null;
    escalatedStages?: ('INITIAL' | 'URGENT')[];
    eligibleCount?: number;
    eligibilityUnverified?: boolean;
    unfilled?: boolean;
    termsCurrent: boolean;
};
export type EffectiveRequestState = {
    status: string;
    actionable: boolean;
    completionDeadline: string | null;
    attention: 'URGENT_UNCOVERED' | 'NO_ELIGIBLE_CANDIDATES' | 'CONFIGURATION_REQUIRED' | 'NO_VOLUNTEER' | 'MANAGER_REVIEW' | null;
};
export type MaintenanceIntent = {
    kind: 'EXPIRE' | 'ESCALATE' | 'INVITE';
    requestId: string;
    revision: number;
    reason: string;
    stage?: 'INITIAL' | 'URGENT';
};
export function projectShiftChangeState(snapshot: MaintenanceSnapshot, now: Date): EffectiveRequestState {
    const result: EffectiveRequestState = { status: snapshot.status, actionable: false, completionDeadline: null, attention: null };
    if (!['OPEN', 'EMPLOYEE_PENDING', 'MANAGER_PENDING', 'PENDING'].includes(snapshot.status))
        return result;
    if (snapshot.kind === 'CALLOUT')
        return { ...result, actionable: snapshot.termsCurrent, attention: 'MANAGER_REVIEW' };
    const recorded = snapshot.completionDeadline ? Date.parse(snapshot.completionDeadline) : NaN;
    if (Number.isFinite(recorded) && now.getTime() >= recorded)
        return { ...result, status: 'EXPIRED', completionDeadline: new Date(recorded).toISOString() };
    let start: number;
    try {
        start = Math.min(...[snapshot.source, ...(snapshot.target ? [snapshot.target] : [])].map(t => t ? Date.parse(shiftBoundaryInstants(t, t.timeZone).startAt) : NaN));
    }
    catch {
        return { ...result, attention: 'CONFIGURATION_REQUIRED' };
    }
    const scope = snapshot.policy?.[snapshot.workflow === 'SWAP' ? 'swap' : 'coverage'];
    const deadline = evaluateRequestDeadlines({ stage: 'COMPLETE', now: now.toISOString(), earliestShiftStart: Number.isFinite(start) ? new Date(start).toISOString() : '', currentSubmissionAdvanceMinutes: scope?.submissionAdvanceMinutes ?? null, currentCompletionAdvanceMinutes: scope?.completionAdvanceMinutes ?? null, recordedCompletionDeadline: snapshot.completionDeadline });
    // Even an unknown current policy cannot revive recorded expiry or a started shift.
    const bound = Math.min(start, snapshot.completionDeadline ? Date.parse(snapshot.completionDeadline) : Infinity, deadline.status === 'READY' ? Date.parse(deadline.completionDeadline) : Infinity);
    if (Number.isFinite(bound))
        result.completionDeadline = new Date(bound).toISOString();
    if (Number.isFinite(bound) && now.getTime() >= bound)
        return { ...result, status: 'EXPIRED' };
    if (!Number.isFinite(start) || !scope?.mode || deadline.status !== 'READY' || snapshot.legacyManual || !snapshot.termsCurrent)
        return { ...result, attention: 'CONFIGURATION_REQUIRED' };
    return { ...result, actionable: true, attention: snapshot.eligibilityUnverified && snapshot.eligibleCount === 0 ? 'CONFIGURATION_REQUIRED' : snapshot.status === 'MANAGER_PENDING' ? 'MANAGER_REVIEW' : snapshot.workflow === 'COVERAGE' ? (snapshot.eligibleCount === 0 ? 'NO_ELIGIBLE_CANDIDATES' : 'NO_VOLUNTEER') : null };
}
export function planShiftChangeMaintenance(snapshot: MaintenanceSnapshot, now: Date, notificationPolicy: NotificationPolicy): readonly MaintenanceIntent[] {
    if (!['OPEN', 'EMPLOYEE_PENDING', 'MANAGER_PENDING', 'PENDING'].includes(snapshot.status))
        return [];
    const state = projectShiftChangeState(snapshot, now);
    const intent = (kind: MaintenanceIntent['kind'], reason: string): MaintenanceIntent => ({ kind, requestId: snapshot.id, revision: snapshot.revision, reason });
    if (state.status === 'EXPIRED')
        return [intent('EXPIRE', 'COMPLETION_DEADLINE')];
    let urgent = false;
    try {
        urgent = !!snapshot.source && Date.parse(shiftBoundaryInstants(snapshot.source, snapshot.source.timeZone).startAt) - now.getTime() <= notificationPolicy.urgentLeadHours * 3600000;
    }
    catch { /* Unverified boundary is management work. */ }
    const result: MaintenanceIntent[] = [];
    const stage = urgent ? 'URGENT' : 'INITIAL';
    if ((!snapshot.escalatedAt || snapshot.escalatedStages && !snapshot.escalatedStages.includes(stage)) && state.attention && (urgent || state.attention !== 'NO_VOLUNTEER'))
        result.push({ ...intent('ESCALATE', urgent && snapshot.unfilled === true ? 'URGENT_UNCOVERED' : state.attention), stage });
    if (snapshot.kind === 'EXCHANGE' && snapshot.status === 'OPEN' && state.actionable && snapshot.eligibleCount !== 0)
        result.push(intent('INVITE', 'ELIGIBLE_AUDIENCE'));
    return result;
}
