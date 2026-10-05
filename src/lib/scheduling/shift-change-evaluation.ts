import { shiftBoundaryInstants } from '../business-time';
import { unknownOperationalRuleProfile } from '../shift-changes/policy';
import { sameShiftTerms, shiftTermsFingerprint } from '../shift-changes/terms';
import type { ShiftChangeSnapshot, ShiftChangeCommand, ShiftChangeEvaluation, ShiftTerms, ShiftChangeIssue } from '../shift-changes/types';
import { affectedWorkweeks, businessDateStart, periodsOverlap, shiftPeriod, splitBusinessDays, timeMinutes } from './periods';
import { evaluateLocationReadiness } from './location-readiness';
import { calculateScheduleHealth, type CoverageBlock } from './schedule-health';
import { validateShift } from './validate-shift';
import { compareEmployeeFairness } from './generation/fairness';
import { weekStartFor } from '../date-utils';
export type ShiftChangeCandidateSnapshot = Omit<ShiftChangeSnapshot,'actor'>;
const empty = (decision: ShiftChangeEvaluation['decision'], code: ShiftChangeIssue['code'], message: string): ShiftChangeEvaluation => ({ decision, issues: [{ code, message }], affectedWeeks: [], proposedAssignments: [], scheduledProjections: [] });
function affectedHealth(snapshot: ShiftChangeCandidateSnapshot, terms: ShiftTerms[], final: ShiftChangeSnapshot['facts']['ledger']): ShiftChangeIssue[] {
    const f = snapshot.facts, ids = new Set(terms.map(t => t.locationId));
    const common = { workspace: f.workspace, positions: f.positions, locations: f.locations.filter(l => ids.has(l.id)).map(l => ({ id: l.id, name: l.name, minimumStaffPerShift: f.staffing.find(s => s.locationId === l.id)?.minimumStaffPerShift ?? null, requiresDesignatedLead: f.staffing.find(s => s.locationId === l.id)?.requiresDesignatedLead ?? null })), employees: f.employees.map(e => ({ ...e, name: `${e.firstName} ${e.lastName}` })), coverageWindows: f.coverageWindows, weekDates: [...new Set(terms.flatMap(t => splitBusinessDays(shiftPeriod(t)).map(d => d.date)))] };
    const before = calculateScheduleHealth({ ...common, shifts: f.ledger }).coverageBlocks, after = calculateScheduleHealth({ ...common, shifts: final }).coverageBlocks;
    const period = (b: CoverageBlock) => ({ start: businessDateStart(b.date) + timeMinutes(b.startTime), end: businessDateStart(b.date) + timeMinutes(b.endTime, true) });
    const issues: ShiftChangeIssue[] = [];
    for (const a of after)
        for (const b of before) {
            if (a.locationId !== b.locationId || !periodsOverlap(period(a), period(b)) || !terms.some(t => t.locationId === a.locationId && periodsOverlap(shiftPeriod(t), { start: Math.max(period(a).start, period(b).start), end: Math.min(period(a).end, period(b).end) })))
                continue;
            if ((a.gap ?? 0) > (b.gap ?? 0))
                issues.push({ code: 'STAFFING_GAP', message: 'This change worsens staffing coverage.' });
            if (a.requiresLead && !a.leadCovered && b.leadCovered)
                issues.push({ code: 'LEAD_COVERAGE_GAP', message: 'This change removes required Lead coverage.' });
            if (a.positionCoverage.some(p => p.missing > (b.positionCoverage.find(q => q.positionId === p.positionId)?.missing ?? 0)))
                issues.push({ code: 'POSITION_COVERAGE_GAP', message: 'This change worsens required position coverage.' });
        }
    return issues;
}
/** Eligibility of a proposed final ledger, independent of who volunteers first. No writes. */
function evaluateAssignments(snapshot: ShiftChangeCandidateSnapshot, source: ShiftTerms, target: ShiftTerms | null, incomingId: string): ShiftChangeEvaluation {
    const f = snapshot.facts;
    const terms = target ? [source, target] : [source];
    const proposedAssignments = [{ shiftId: source.shiftId, employeeId: incomingId }, ...(target ? [{ shiftId: target.shiftId, employeeId: source.employeeId }] : [])];
    if (incomingId === source.employeeId || target?.shiftId === source.shiftId)
        return empty('BLOCKED', 'CONSENT_REQUIRED', 'A change needs different participating employees and shifts.');
    const issues: ShiftChangeIssue[] = [], scheduledProjections: ShiftChangeEvaluation['scheduledProjections'][number][] = [];
    let hard = false, unknown = false, review = false;
    const reject = (code: ShiftChangeIssue['code'], message: string, unverified = false) => { issues.push({ code, message }); if (unverified)
        unknown = true;
    else
        hard = true; };
    const outgoing = new Set(terms.map(t => t.shiftId)), retained = f.ledger.filter(s => !outgoing.has(s.id));
    const final = [...retained, ...terms.map(t => ({ ...f.ledger.find(s => s.id === t.shiftId)!, id: t.shiftId, scheduleId: t.scheduleId, employeeId: proposedAssignments.find(p => p.shiftId === t.shiftId)!.employeeId, locationId: t.locationId, date: t.date, startTime: t.startTime, endTime: t.endTime, positionId: t.positionId ?? undefined, isDesignatedLead: t.isDesignatedLead, isCalloutApproved: false, scheduleStatus: 'PUBLISHED' as const, hasExchangeHistory: true, hasCalloutHistory: false, hasPublicationHistory: true }))];
    const weeks = new Set<string>();
    try {
        for (const t of terms) {
            for (const week of affectedWorkweeks(shiftPeriod(t)))
                weeks.add(week);
            const current = snapshot.ledger.find(s => s.shiftId === t.shiftId);
            if (!current || !sameShiftTerms(current, t) || t.workspaceId !== f.workspace.id || snapshot.publication.find(p => p.scheduleId === t.scheduleId)?.status !== 'PUBLISHED')
                reject('STALE_TERMS', 'The published assignment changed; review its current terms.');
            if (Date.parse(shiftBoundaryInstants(t, f.workspace.timeZone).startAt) <= Date.parse(snapshot.observedAt) || !Number.isFinite(Date.parse(snapshot.observedAt)))
                reject('STALE_TERMS', 'This assignment is no longer available.');
            const owner = f.employees.find(e => e.id === t.employeeId);
            if (!owner?.active)
                reject('EMPLOYEE_INACTIVE', 'A participating employee is inactive.');
            const employeeId = proposedAssignments.find(p => p.shiftId === t.shiftId)!.employeeId, e = f.employees.find(e => e.id === employeeId), location = f.locations.find(l => l.id === t.locationId);
            if (!e || !location) {
                reject('LOCATION_INACTIVE', 'Assignment facts are unavailable.');
                continue;
            }
            const ready = evaluateLocationReadiness({ workspace: f.workspace, location, staffing: f.staffing.find(s => s.locationId === t.locationId) ?? null, coverageWindows: f.coverageWindows, positions: f.positions, eligibleEmployees: f.employees });
            if (ready.state !== 'READY')
                reject('INVALID_SCHEDULING_INPUT', 'The requested location needs current scheduling setup.', ready.state === 'NEEDS_SETUP');
            const result = validateShift({ candidate: { ...t, employeeId, positionId: t.positionId ?? undefined }, employee: e, workspace: f.workspace, location, position: f.positions.find(p => p.id === t.positionId), existingShifts: final.filter(s => s.id !== t.shiftId), availability: e.availability, weeklyAvailability: e.weeklyAvailability, availabilityExceptions: e.availabilityExceptions, approvedTimeOff: e.approvedTimeOff, policy: f.policy, mode: 'AUTOMATIC', operationalProfile: snapshot.profiles.find(p => p.employeeId === employeeId)?.profile ?? unknownOperationalRuleProfile(), scheduledBreaks: t.scheduledBreaks });
            issues.push(...result.issues.map(i => ({ code: i.code, message: i.message })));
            hard ||= result.blockers.some(i => i.code !== 'RULE_UNVERIFIABLE');
            unknown ||= result.operational.unverifiable.length > 0;
            review ||= result.operational.warnings.length > 0;
            scheduledProjections.push(...result.projectedHours.map(p => ({ ...p, employeeId })));
        }
        const health = affectedHealth(snapshot, terms, final);
        issues.push(...health);
        hard ||= health.length > 0;
    }
    catch {
        reject('INVALID_TIME_RANGE', 'Assignment boundaries cannot be verified.');
    }
    const workflow = target ? 'swap' : 'coverage', policy = snapshot.policy?.[workflow];
    if (!policy?.mode || policy.submissionAdvanceMinutes === null || policy.completionAdvanceMinutes === null)
        reject('POLICY_UNKNOWN', 'The workflow policy needs review.', true);
    review ||= policy?.mode === 'MANAGER_REVIEW' || snapshot.request?.recordedApprovalMode === 'MANAGER_REVIEW' || snapshot.request?.effectiveApprovalMode === 'MANAGER_REVIEW';
    return { decision: hard ? 'BLOCKED' : unknown ? 'UNVERIFIED' : review ? 'MANAGER_REVIEW' : 'ELIGIBLE', issues, affectedWeeks: [...weeks].sort(), proposedAssignments, scheduledProjections };
}
export function evaluateShiftChange(snapshot: ShiftChangeSnapshot, command: ShiftChangeCommand): ShiftChangeEvaluation {
    const actor = snapshot.facts.employees.find(e => e.id === snapshot.actor.employee.id);
    if (!actor?.active || !snapshot.facts.workspace.active)
        return empty('BLOCKED', 'EMPLOYEE_INACTIVE', 'An active participant and workspace are required.');
    if (command.kind === 'PROPOSE_SWAP' || command.kind === 'OFFER_COVERAGE') {
        const source = snapshot.ledger.find(t => t.shiftId === command.sourceShiftId);
        if (!source || source.employeeId !== actor.id || source.assignmentEpisodeId !== command.sourceEpisodeId || shiftTermsFingerprint(source) !== command.sourceTermsFingerprint)
            return empty('BLOCKED', 'STALE_TERMS', 'Review the current source assignment.');
        if (command.kind === 'OFFER_COVERAGE')
            return empty('UNVERIFIED', 'CONSENT_REQUIRED', 'A volunteer is required before assignment eligibility can be established.');
        const target = snapshot.ledger.find(t => t.shiftId === command.targetShiftId);
        if (!target || target.assignmentEpisodeId !== command.targetEpisodeId || shiftTermsFingerprint(target) !== command.targetTermsFingerprint)
            return empty('BLOCKED', 'STALE_TERMS', 'Review the current target assignment.');
        return evaluateAssignments(snapshot, source, target, target.employeeId);
    }
    if (command.kind !== 'ACCEPT' && command.kind !== 'MANAGER_APPROVE')
        return empty('UNVERIFIED', 'CONSENT_REQUIRED', 'This command does not propose an assignment.');
    const r = snapshot.request;
    if (!r || r.id !== command.requestId || r.revision !== command.expectedRevision || (!r.requesterConsent && !r.releaseAuthorization) || r.legacyManual)
        return empty('UNVERIFIED', 'CONSENT_REQUIRED', 'Current reviewed request consent is required.');
    if (!['OPEN', 'EMPLOYEE_PENDING', 'MANAGER_PENDING'].includes(r.status))
        return empty('BLOCKED', 'STALE_TERMS', 'This request no longer accepts assignments.');
    const reviewedSource=r.requesterConsent?.source??r.releaseAuthorization!.source;
    if ((r.requesterConsent && r.requesterConsent.employeeId !== r.requestedByEmployeeId) || reviewedSource.employeeId !== r.requestedByEmployeeId)
        return empty('BLOCKED', 'CONSENT_REQUIRED', 'The requester must own the reviewed assignment.');
    const target = r.kind === 'SWAP' ? r.requesterConsent?.target : null;
    if (r.kind === 'SWAP' && (!target || target.employeeId !== r.targetEmployeeId))
        return empty('BLOCKED', 'CONSENT_REQUIRED', 'Both reviewed assignments are required.');
    const incoming = command.kind === 'ACCEPT' ? actor.id : r.targetEmployeeId;
    if (!incoming || (target && target.employeeId !== incoming) || command.kind === 'MANAGER_APPROVE' && !['OWNER', 'MANAGER'].includes(actor.role))
        return empty('BLOCKED', 'CONSENT_REQUIRED', 'An authorized participating employee is required.');
    if (command.kind === 'MANAGER_APPROVE' && (!r.targetConsent || r.targetConsent.employeeId !== incoming || !sameShiftTerms(r.targetConsent.source, reviewedSource) || (target && (!r.targetConsent.target || !sameShiftTerms(r.targetConsent.target, target)))))
        return empty('BLOCKED', 'CONSENT_REQUIRED', 'Current participant consent is required.');
    return evaluateAssignments(snapshot, reviewedSource, target??null, incoming);
}
export type CoverageCandidate = {
    employeeId: string;
    employeeName: string;
    evaluation: ShiftChangeEvaluation;
};
/** Coverage suggestions are private management data, not consent or assignment authority.
 * Swap discovery must evaluate each concrete pair through PROPOSE_SWAP. */
/** All candidate evaluations are server-private; keep unknown rules distinct from
 * a verified empty eligible audience. No actor proof or consent is manufactured. */
export function evaluateCoverageCandidates(snapshot:ShiftChangeCandidateSnapshot):readonly CoverageCandidate[]{
 const source=snapshot.request?.requesterConsent?.source??snapshot.request?.releaseAuthorization?.source;
 if(!source||snapshot.request?.kind!=='COVERAGE')return [];
 return snapshot.facts.employees.filter(e=>e.id!==source.employeeId&&['EMPLOYEE','LEAD'].includes(e.role)).map(e=>({employeeId:e.id,employeeName:`${e.firstName} ${e.lastName}`,evaluation:evaluateAssignments(snapshot,source,null,e.id)}));
}
export function rankShiftChangeCandidates(snapshot: ShiftChangeCandidateSnapshot): readonly CoverageCandidate[] {
 const source=snapshot.request?.requesterConsent?.source??snapshot.request?.releaseAuthorization?.source;
 if(!source)return [];
 const f=snapshot.facts,weekStart=weekStartFor(source.date);
 const context={weekStart,ledger:f.ledger.filter(s=>s.id!==source.shiftId),confirmedEmployeeIds:new Set(f.employees.filter(e=>affectedWorkweeks(shiftPeriod(source)).every(week=>e.weeklyAvailability.some(w=>w.weekStart===week&&w.submitted))).map(e=>e.id)),employeeIds:f.employees.map(e=>e.id)};
 return evaluateCoverageCandidates(snapshot).filter(c=>c.evaluation.decision==='ELIGIBLE'||c.evaluation.decision==='MANAGER_REVIEW').sort((a,b)=>compareEmployeeFairness(f.employees.find(e=>e.id===a.employeeId)!,f.employees.find(e=>e.id===b.employeeId)!,context));
}
