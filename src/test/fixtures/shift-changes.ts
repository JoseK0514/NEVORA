import { automaticWeek, automaticAssignment } from './automatic-week';
import type { OperationalRuleProfile, RuleSetting, ShiftTerms, ShiftChangeSnapshot } from '../../lib/shift-changes/types';
export const configured = <T>(value: T): RuleSetting<T> => ({ status: 'CONFIGURED', revision: 1, value });
/** Fictional reviewed settings only; never customer defaults. */
export function fictionalProfile(): OperationalRuleProfile {
    const na = { status: 'NOT_APPLICABLE' as const, reviewedBy: 'fictional-owner', reviewedAt: '2026-10-01T00:00:00Z' };
    return { version: 1, revision: 1, reviewedBy: na.reviewedBy, reviewedAt: na.reviewedAt, minimumRest: na, maximumShift: na, maximumDaily: na, breaks: na, projectedOvertime: na };
}
export function fictionalTerms(id = 'source', employeeId = 'e1', patch: Partial<ShiftTerms> = {}): ShiftTerms {
    return { shiftId: id, scheduleId: 's-loc-1', workspaceId: 'work', timeZone:'America/Puerto_Rico', weekStart: '2026-10-05', date: '2026-10-05', startTime: '08:00', endTime: '16:00', locationId: 'loc-1', employeeId, assignmentEpisodeId: `episode-${id}`, termsRevision:1, positionId: 'barista', isDesignatedLead: false, scheduledBreaks: { status: 'UNKNOWN' }, ...patch };
}
export function fictionalSnapshot(): ShiftChangeSnapshot {
    const facts = automaticWeek(2);
    facts.schedules.forEach(s => s.status = 'PUBLISHED');
    facts.employees.forEach(e => { e.availability = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: '00:00', endTime: '24:00' })); });
    const source = fictionalTerms();
    facts.ledger = [automaticAssignment('source', 'e1', { positionId: 'barista', scheduleStatus: 'PUBLISHED' })];
    const scope = { revision: 1, mode: 'AUTOMATIC_WHEN_VALID' as const, submissionAdvanceMinutes: 0, completionAdvanceMinutes: 0 };
    return { source: {} as ShiftChangeSnapshot['source'], facts, observedAt: '2026-10-01T00:00:00Z', actor: { employee: facts.employees[1], sessionTokenHash: 'a'.repeat(64) }, request: { id: 'request', kind: 'COVERAGE', status: 'OPEN', revision: 1, legacyManual: false, requestedByEmployeeId: 'e1', targetEmployeeId: null, requesterConsent: { employeeId: 'e1', consentedAt: '2026-10-01T00:00:00Z', source, target: null }, targetConsent: null, recordedApprovalMode: 'AUTOMATIC_WHEN_VALID', effectiveApprovalMode: 'AUTOMATIC_WHEN_VALID' }, policy: { version: 1, revision: 1, swap: scope, coverage: scope }, profiles: facts.employees.map(e => ({ employeeId: e.id, profile: fictionalProfile() })), ledger: [source], publication: facts.schedules.map(s => ({ scheduleId: s.id, status: s.status })) };
}
