import { createHash } from 'node:crypto';
import type { ShiftTerms } from './types';
import type { GenerationSourceRow } from '../data/generation-guards';
import type { Schedule } from '../domain';
/** Fixed field order, excluding labels/notes. The stored JSON is also usable by SQL guards. */
export function materialShiftTerms(t: ShiftTerms) {
    return { shiftId: t.shiftId, scheduleId: t.scheduleId, workspaceId: t.workspaceId, timeZone:t.timeZone, weekStart: t.weekStart, date: t.date, startTime: t.startTime, endTime: t.endTime, locationId: t.locationId, employeeId: t.employeeId, assignmentEpisodeId: t.assignmentEpisodeId, termsRevision:t.termsRevision, positionId: t.positionId, isDesignatedLead: t.isDesignatedLead, scheduledBreaks: t.scheduledBreaks.status === 'KNOWN' ? { status: 'KNOWN' as const, breaks: t.scheduledBreaks.breaks.map(b => ({ start: b.start, end: b.end, paid: b.paid })) } : { status: 'UNKNOWN' as const } };
}
export function shiftTermsFingerprint(t: ShiftTerms): string { return 'v1:' + createHash('sha256').update(JSON.stringify(materialShiftTerms(t))).digest('hex'); }
export function sameShiftTerms(a: ShiftTerms, b: ShiftTerms): boolean { return shiftTermsFingerprint(a) === shiftTermsFingerprint(b); }
export function sourceShiftTerms(s: GenerationSourceRow, parent: Schedule, workspaceId: string, timeZone: string): ShiftTerms {
    return { shiftId: String(s.id), scheduleId: parent.id, workspaceId, timeZone, weekStart: parent.weekStart, date: String(s.date), startTime: String(s.start_time).slice(0, 5), endTime: String(s.end_time).slice(0, 5), locationId: parent.locationId, employeeId: String(s.employee_id), assignmentEpisodeId: String(s.assignment_episode_id ?? ''), termsRevision:Number(s.terms_revision), positionId: s.position_id == null ? null : String(s.position_id), isDesignatedLead: s.is_designated_lead === true, scheduledBreaks: { status: 'UNKNOWN' } };
}
/** Approval releases only the reviewed assignment episode and exact material terms, never a later reassignment. */
export function calloutReleasesShift(c: GenerationSourceRow, s: GenerationSourceRow, parent: Schedule, workspaceId: string, timeZone: string): boolean {
    if (c.status !== 'APPROVED' || c.shift_id !== s.id || c.employee_id !== s.employee_id || !s.assignment_episode_id || c.assignment_episode_id !== s.assignment_episode_id || !c.source_terms)
        return false;
    try {
        const terms = sourceShiftTerms(s, parent, workspaceId, timeZone);
        return sameShiftTerms(c.source_terms as ShiftTerms, terms) && c.reviewed_terms_fingerprint === shiftTermsFingerprint(terms);
    }
    catch {
        return false;
    }
}
