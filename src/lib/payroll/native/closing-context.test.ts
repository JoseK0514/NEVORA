import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { calculateNativePayroll } from './calculate';
import { classifyRecordedTime, HOUR } from './time';
import { input, entry } from './fixtures.test-support';
import { fictionalWorkweekPolicy } from './workweek-fixtures.test-support';
import { closingContextWindow, resolveNativeWorkweek } from './workweek-policy';
import { nativeSourceRequest } from './source.server';
import { projectRecordedSourceCapture } from './recorded-source.server';
import { newRun } from '../service';
import type { NativeClosingContextEvidence, NativePayrollInput, NativePayrollReady } from './contracts';

// Fictional week N = Monday 2026-10-05 .. Sunday 2026-10-11 under the documented
// statutory Monday 00:01 boundary. Workweek N therefore ends Monday 2026-10-12 00:01,
// one minute after the civil pay window, and no card for Monday 2026-10-12 exists yet.
const WEEK_N = { startDate: '2026-10-05', endDate: '2026-10-11' };
const WEEK_N_START = '2026-10-05T04:01:00Z';
const CLOSING = { startAt: '2026-10-12T04:00:00Z', endAt: '2026-10-12T04:01:00Z' };
const reference = 'OWNER_AUTHORIZED_PROVISIONAL_PR_STANDARD_2026_20261014';
const prReference = 'OWNER_ATTESTED_ACCOUNTANT_PR_2026_FINAL_PERIODIC_HALF_UP_20261014';
const evidence = (over: Partial<NativeClosingContextEvidence> = {}): NativeClosingContextEvidence => ({ version: 'NATIVE_CLOSING_CONTEXT_V1', ...CLOSING, observedAt: '2026-10-13T12:00:00Z', captureFence: 'c'.repeat(64), ...over });

function weekN(owner = false): NativePayrollInput {
    const i = input();
    i.period = { ...WEEK_N };
    i.wages[0].hourlyRateMinor = '1200';
    i.wages[0].workweekStartTime = '00:01';
    i.wages[0].workweekPolicy = fictionalWorkweekPolicy(i.employeeId, { weekday: 1, startTime: '00:01', timeZone: 'America/Puerto_Rico' }, true);
    // Finalized context through the period's own last date (Sunday) and nothing later.
    i.timecards[0].period = { startDate: '2026-09-15', endDate: '2026-10-11' };
    i.timecards[0].entries = [entry('N-mon', '2026-10-05T08:00:00-04:00', '2026-10-05T16:00:00-04:00')];
    if (owner) {
        i.calculationPolicyReference = reference;
        i.wages[0].wageCentRounding = 'UNVERIFIED';
        i.tax!.prCentRounding = 'HALF_UP';
        i.tax!.ruleEvidenceReference = prReference;
    }
    return i;
}
function ready(i: NativePayrollInput): NativePayrollReady {
    const r = calculateNativePayroll(i);
    expect(r.state, JSON.stringify(r)).toBe('ready');
    if (r.state !== 'ready') throw Error('Blocked fictional fixture');
    return r;
}
const paidNanoseconds = (i: NativePayrollInput) => { const c = classifyRecordedTime(i); return c.pieces.filter(p => p.start >= c.payLeft && p.end <= c.payRight).reduce((n, p) => n + p.end - p.start, BigInt(0)); };

describe('Monday 00:01 closing context (calculation)', () => {
    it('derives exactly the one boundary minute after a Monday-Sunday pay window, and nothing for a midnight boundary', () => {
        const i = weekN();
        expect(closingContextWindow(resolveNativeWorkweek('E1', i.wages, WEEK_N))).toEqual(CLOSING);
        expect(closingContextWindow(resolveNativeWorkweek('E1', input().wages, WEEK_N))).toBeNull();
    });
    it('still refuses week N without closing evidence: a card ending Sunday says nothing about Monday 00:00-00:01', () => {
        expect(calculateNativePayroll(weekN())).toMatchObject({ state: 'blocked', issues: [{ code: 'COMPLETE_CONTEXT_REQUIRED', reference: '2026-10-12' }] });
    });
    it('calculates week N with finalized time inside the period and no card for the next Monday when the boundary minute is evidenced', () => {
        const i = weekN(); i.closingContextEvidence = evidence();
        const r = ready(i);
        expect(r.row.grossMinor).toBe('9600');
        expect(r.provenance.boundaryEvidence).toMatchObject({ dailyInputDisposition: 'INVARIANT_NO_FIRST_MINUTE_ENTRIES', sourceWindow: { endAt: CLOSING.endAt } });
        // The same week N with a finalized Monday card yields identical money: the evidence replaces only the missing minute.
        const withCard = weekN(); withCard.timecards[0].period.endDate = '2026-10-12';
        expect(ready(withCard).row).toEqual(r.row);
    });
    it('refuses time that starts inside the boundary minute while its own card is missing', () => {
        const i = weekN(); i.closingContextEvidence = evidence();
        i.timecards[0].entries.push(entry('N-edge', '2026-10-12T00:00:30-04:00', '2026-10-12T06:00:00-04:00'));
        expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'COMPLETE_CONTEXT_REQUIRED', reference: '2026-10-12' }] });
    });
    it('refuses an open entry in the boundary window with its own reason', () => {
        const i = weekN(); i.closingContextEvidence = evidence();
        i.timecards[0].entries.push({ ...entry('N-open', '2026-10-11T23:30:00-04:00', '2026-10-12T00:00:30-04:00'), endAt: null as never });
        expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'OPEN_RECORDED_TIME', reference: 'N-open' }] });
    });
    it.each([
        ['another window', { startAt: '2026-10-12T04:00:00Z', endAt: '2026-10-12T04:00:30Z' }],
        ['an observation before the minute elapsed', { observedAt: '2026-10-12T04:00:59Z' }],
        ['an unfenced capture', { captureFence: 'not-a-fence' }],
    ])('rejects closing evidence for %s', (_label, over) => {
        const i = weekN(); i.closingContextEvidence = evidence(over);
        expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'CLOSING_CONTEXT_EVIDENCE_INVALID' }] });
    });
    it('rejects closing evidence where the policy leaves no partial closing day', () => {
        const i = input(); i.closingContextEvidence = evidence();
        expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'CLOSING_CONTEXT_EVIDENCE_INVALID' }] });
    });
    it('counts time crossing Monday 00:00 once: the minute is week N context, paid only by the next civil pay window', () => {
        const crossing = entry('X', '2026-10-11T23:00:00-04:00', '2026-10-12T00:00:30-04:00');
        const n = weekN(true); n.closingContextEvidence = evidence(); n.timecards[0].entries = [crossing];
        const c = classifyRecordedTime(n);
        const tail = c.pieces.filter(p => p.start >= c.payRight);
        expect(tail.map(p => [p.week, p.date, (p.end - p.start).toString()])).toEqual([[WEEK_N_START, '2026-10-12', '30000000000']]);
        expect(paidNanoseconds(n)).toBe(HOUR);
        expect(ready(n).row.grossMinor).toBe('1200');
        const next = weekN(true); next.period = { startDate: '2026-10-12', endDate: '2026-10-18' }; next.payday = '2026-10-23';
        next.timecards[0].period = { startDate: '2026-09-22', endDate: '2026-10-19' }; next.timecards[0].entries = [crossing];
        const later = classifyRecordedTime(next).pieces.filter(p => p.start >= ns('2026-10-12T04:00:00Z') && p.end <= ns('2026-10-19T04:00:00Z'));
        expect(later.map(p => [p.week, (p.end - p.start).toString()])).toEqual([[WEEK_N_START, '30000000000']]);
        expect(paidNanoseconds(n) + paidNanoseconds(next)).toBe(HOUR + BigInt(30000000000));
    });
    it('never blocks payroll N on a Sunday-night overnight shift finalized on the week N card', () => {
        const shift = entry('S', '2026-10-11T22:00:00-04:00', '2026-10-12T06:00:00-04:00');
        const n = weekN(true); n.closingContextEvidence = evidence(); n.timecards[0].entries = [shift];
        const r = ready(n);
        expect(r.provenance.boundaryEvidence.dailyInterpretation).toBe('OWNER_AUTHORIZED_CIVIL_MIDNIGHT_24H');
        const next = weekN(true); next.period = { startDate: '2026-10-12', endDate: '2026-10-18' }; next.payday = '2026-10-23';
        next.timecards[0].period = { startDate: '2026-09-22', endDate: '2026-10-19' }; next.timecards[0].entries = [shift];
        // Every one of the eight hours is paid exactly once across the two periods.
        expect(paidNanoseconds(n) + paidNanoseconds(next)).toBe(HOUR * BigInt(8));
        expect(BigInt(r.row.grossMinor) + BigInt(ready(next).row.grossMinor)).toBe(BigInt(9600));
    });
    // KNOWN GAP, not fixed here: Jose's rule 1 (Oct 25) attributes an overnight shift wholly to the
    // workday and workweek it starts in. This engine still splits at civil midnight and at the
    // recorded weekly boundary (pinned by G04 in workweek-consumer.test.ts). Changing that is a
    // calculation-policy change with cut-over risk and is left for Jose and labor counsel.
    // it.fails passes only while the gap exists, so implementing rule 1 will flag this test.
    it.fails('rule 1 gap: attributes a Sunday-night overnight shift wholly to Sunday and pays it all in week N', () => {
        const n = weekN(true); n.closingContextEvidence = evidence();
        n.timecards[0].entries = [entry('S1', '2026-10-11T22:00:00-04:00', '2026-10-12T06:00:00-04:00')];
        const c = classifyRecordedTime(n);
        expect(c.pieces.every(p => p.date === '2026-10-11' && p.week === WEEK_N_START)).toBe(true);
        expect(paidNanoseconds(n)).toBe(HOUR * BigInt(8));
    });
});

const ns = (value: string) => BigInt(new Date(value).getTime()) * BigInt(1000000);
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;
type RawEntry = ReturnType<typeof rawEntry>;
const rawEntry = (id: string, startAt: string, endAt: string | null) => ({ id, locationId: 'L1', locationName: 'Fictional', positionId: null, positionName: null, sourceKind: 'RECORDED', adjustmentId: null, recordedVersion: 1, startAt, endAt, rawStartAt: startAt, rawEndAt: endAt, breaks: [] as never[] });
function card(period: { startDate: string; endDate: string }, entries: RawEntry[], n: number) {
    const snapshot = { ...period, employeeId: 'E1', employeeName: 'Fictional Worker', timeZone: 'America/Puerto_Rico', pendingCorrections: 0, entries, corrections: [] };
    return { period, action: 'FINALIZE', operationId: uuid(n + 1), revision: 2, sourceHash: 'a'.repeat(32), currentSourceHash: 'b'.repeat(32), occurredAt: '2026-10-12T20:00:00Z', approvalOccurredAt: '2026-10-12T19:00:00Z',
        actorEmployeeId: 'reviewer', approvalRevision: 1, approvalOperationId: uuid(n), approvalSourceHash: 'a'.repeat(32), approvalActorEmployeeId: 'reviewer', snapshot, currentSource: structuredClone(snapshot) };
}
const earlier = { startDate: '2026-09-15', endDate: '2026-10-04' };
function capture(live: (RawEntry & { status?: string })[], weekEntries: RawEntry[] = live, observedAt = '2026-10-13T12:00:00Z') {
    return { capture: { observedAt, limitExceeded: false, workspace: { id: 'workspace-fuel', timeZone: 'America/Puerto_Rico', active: true }, employee: { id: 'E1', workspaceId: 'workspace-fuel' },
        cards: [card(earlier, [], 10), card(WEEK_N, weekEntries, 20)],
        entries: live.map(e => ({ status: 'CLOCKED_OUT', ...e, employeeId: 'E1' })),
        lineage: { requests: [], adjustments: [], events: [], locations: [{ id: 'L1', workspaceId: 'workspace-fuel' }] } } };
}
function request() {
    const run = newRun('11111111-1111-4111-8111-111111111111', WEEK_N, '2026-10-16');
    return nativeSourceRequest('workspace-fuel', run, 'E1', weekN().wages, [earlier, WEEK_N].map(p => ({ employeeId: 'E1', ...p })));
}
const inside = rawEntry('in', '2026-10-06T12:00:00Z', '2026-10-06T20:00:00Z');

describe('Monday 00:01 closing context (recorded source capture)', () => {
    it('asks for the full week N context and names only the boundary minute as closing context', () => {
        expect(request().contexts.at(-1)!.endAt).toBe(CLOSING.endAt);
        expect(request().closingContext).toEqual(CLOSING);
    });
    it('captures week N without a next-Monday card when no recorded time touches the elapsed minute', () => {
        const c = projectRecordedSourceCapture(request(), capture([inside]));
        expect(c).toMatchObject({ state: 'ready', closingContext: { ...CLOSING, observedAt: '2026-10-13T12:00:00Z' } });
    });
    it('keeps the recapture fence independent of observation time', () => {
        const a = projectRecordedSourceCapture(request(), capture([inside])), b = projectRecordedSourceCapture(request(), capture([inside], [inside], '2026-10-14T12:00:00Z'));
        expect(a.state === 'ready' && b.state === 'ready' && a.sourceFence === b.sourceFence).toBe(true);
    });
    it('accepts finalized week N time that crosses into the minute', () => {
        const crossing = rawEntry('cross', '2026-10-12T03:00:00Z', '2026-10-12T04:00:30Z');
        expect(projectRecordedSourceCapture(request(), capture([inside, crossing]))).toMatchObject({ state: 'ready' });
    });
    it('refuses closed time starting inside the minute without its own finalized card', () => {
        const edge = rawEntry('edge', '2026-10-12T04:00:30Z', '2026-10-12T10:00:00Z');
        expect(projectRecordedSourceCapture(request(), capture([inside, edge], [inside]))).toEqual({ state: 'blocked', reason: 'coverage_missing' });
    });
    it('refuses an open entry reaching the minute as unresolved time', () => {
        const open = { ...rawEntry('open', '2026-10-12T04:00:10Z', null), status: 'CLOCKED_IN' };
        expect(projectRecordedSourceCapture(request(), capture([inside, open], [inside]))).toEqual({ state: 'blocked', reason: 'unresolved_time' });
    });
    it('refuses to treat a minute that has not elapsed yet as empty', () => {
        expect(projectRecordedSourceCapture(request(), capture([inside], [inside], '2026-10-12T04:00:59Z'))).toEqual({ state: 'blocked', reason: 'coverage_missing' });
    });
    it('still refuses a missing card for any earlier context day', () => {
        const r = request(); r.coverage = [WEEK_N];
        const raw = capture([inside]); raw.capture.cards = [raw.capture.cards[1]];
        expect(projectRecordedSourceCapture(r, raw)).toEqual({ state: 'blocked', reason: 'coverage_missing' });
    });
    it('uses an actual finalized Monday card when one exists instead of closing evidence', () => {
        const monday = { startDate: '2026-10-12', endDate: '2026-10-18' }, edge = rawEntry('edge', '2026-10-12T04:00:30Z', '2026-10-12T10:00:00Z');
        const r = request(); r.coverage = [...r.coverage, monday];
        const raw = capture([inside, edge], [inside], '2026-10-20T12:00:00Z'); raw.capture.cards.push(card(monday, [edge], 30));
        const c = projectRecordedSourceCapture(r, raw);
        expect(c.state, JSON.stringify(c)).toBe('ready');
        expect(c).not.toHaveProperty('closingContext');
    });
    it('does not let an approved but unfinalized next-week card hide time in the minute', () => {
        const monday = { startDate: '2026-10-12', endDate: '2026-10-18' }, edge = rawEntry('edge', '2026-10-12T04:00:30Z', '2026-10-12T10:00:00Z');
        const r = request(); r.coverage = [...r.coverage, monday];
        const approved = (entries: RawEntry[]) => ({ ...card(monday, entries, 40), action: 'APPROVE', revision: 1, occurredAt: '2026-10-19T12:00:00Z' });
        const empty = capture([inside], [inside], '2026-10-20T12:00:00Z'); empty.capture.cards.push(approved([]));
        expect(projectRecordedSourceCapture(r, empty)).toMatchObject({ state: 'ready', closingContext: CLOSING });
        const worked = capture([inside, edge], [inside], '2026-10-20T12:00:00Z'); worked.capture.cards.push(approved([edge]));
        expect(projectRecordedSourceCapture(r, worked)).toEqual({ state: 'blocked', reason: 'coverage_missing' });
    });
});
