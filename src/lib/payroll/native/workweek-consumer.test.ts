import { it, expect } from 'vitest';
import { input, entry } from './fixtures.test-support';
import { fictionalWorkweekPolicy } from './workweek-fixtures.test-support';
import { classifyRecordedTime, HOUR } from './time';
import { calculateNativePayroll } from './calculate';
import type { NativePayrollInput } from './contracts';
import { add, multiply, ratio, serialized } from './money';
function example(alternate = false): NativePayrollInput {
    const i = input();
    i.period = { startDate: '2026-09-21', endDate: '2026-09-27' };
    i.timecards[0].period = { startDate: '2026-09-01', endDate: '2026-10-01' };
    i.timecards[0].entries = [];
    i.wages[0].hourlyRateMinor = '1200';
    i.wages[0].workweekAnchorDate = alternate ? '2026-01-06' : '2026-01-05';
    i.wages[0].workweekStartTime = alternate ? '06:30' : '00:01';
    i.wages[0].workweekPolicy = fictionalWorkweekPolicy(i.employeeId, { weekday: alternate ? 2 : 1, startTime: alternate ? '06:30' : '00:01', timeZone: 'America/Puerto_Rico' }, !alternate);
    return i;
}
const result = (i: NativePayrollInput) => { const r = calculateNativePayroll(i); expect(r.state, JSON.stringify(r)).toBe('ready'); if (r.state !== 'ready')
    throw Error('Blocked fixture'); return r; };
// Conditional component arithmetic for boundary-sensitive inputs; a live full result must block.
function classifiedPay(i: NativePayrollInput) { const c = classifyRecordedTime(i); return serialized(c.pieces.filter(p => p.start >= c.payLeft && p.end <= c.payRight).reduce((total, p) => add(total, multiply(p.rate, ratio((p.end - p.start) * (p.overtime ? BigInt(3) : BigInt(2)), HOUR * BigInt(2)))), ratio(BigInt(0)))); }
it('G01 separates the statutory weekly minute and retains literal conditional50-cent gross while blocking unresolved daily sensitivity', () => {
    const i = example();
    i.timecards[0].entries = [14, 15, 16, 17, 18].map(d => entry('G1-' + d, `2026-09-${d}T08:00:00-04:00`, `2026-09-${d}T16:00:00-04:00`));
    i.timecards[0].entries.push(entry('G1-edge', '2026-09-20T23:59:00-04:00', '2026-09-21T00:02:00-04:00'));
    const c = classifyRecordedTime(i), paid = c.pieces.filter(p => p.start >= c.payLeft && p.end <= c.payRight);
    expect(paid.filter(p => p.overtime).reduce((n, p) => n + p.end - p.start, BigInt(0))).toBe(BigInt(60000000000));
    expect(paid.filter(p => !p.overtime).reduce((n, p) => n + p.end - p.start, BigInt(0))).toBe(BigInt(60000000000));
    expect(classifiedPay(i)).toEqual({ numerator: '50', denominator: '1' });
    expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'DAILY_BOUNDARY_SENSITIVE' }] });
});
it('G02 uses an evidenced Tuesday06:30 instant without resetting at Monday or midnight', () => {
    const i = example(true);
    i.period = { startDate: '2026-09-22', endDate: '2026-09-22' };
    i.timecards[0].entries = [15, 16, 17, 18, 19].map(d => entry('G2-' + d, `2026-09-${d}T08:00:00-04:00`, `2026-09-${d}T16:00:00-04:00`));
    i.timecards[0].entries.push(entry('G2-edge', '2026-09-22T06:29:00-04:00', '2026-09-22T06:31:00-04:00'));
    expect(result(i).row.grossMinor).toBe('50');
    const c = classifyRecordedTime(i);
    expect(c.pieces.filter(p => p.start >= c.payLeft).map(p => p.week)).toEqual(['2026-09-15T10:30:00Z', '2026-09-22T10:30:00Z']);
});
it('G03/D03 preserves the daily accumulator through an internal06:30 weekly reset', () => {
    const i = example(true);
    i.period = { startDate: '2026-09-22', endDate: '2026-09-22' };
    const e = entry('G3', '2026-09-22T00:05:00-04:00', '2026-09-22T08:36:00-04:00');
    e.breaks = [{ id: 'G3-meal', typeId: 'MEAL', startAt: '2026-09-22T04:05:00-04:00', endAt: '2026-09-22T04:35:00-04:00' }];
    i.timecards[0].entries = [e];
    expect(result(i).row.grossMinor).toBe('9630');
    expect(result(i).breakdown.overtimeNanoseconds).toBe('60000000000');
});
it('G04 keeps all180seconds and independent daily/weekly source cuts rather than dropping the first minute', () => {
    const i = example();
    i.timecards[0].entries = [entry('G4', '2026-09-20T23:59:00-04:00', '2026-09-21T00:02:00-04:00')];
    const p = classifyRecordedTime(i).pieces;
    expect(p.reduce((n, p) => n + p.end - p.start, BigInt(0))).toBe(BigInt(180000000000));
    expect(p.filter(p => p.week === '2026-09-14T04:01:00Z').reduce((n, p) => n + p.end - p.start, BigInt(0))).toBe(BigInt(120000000000));
    expect(p.filter(p => p.date === '2026-09-20').reduce((n, p) => n + p.end - p.start, BigInt(0))).toBe(BigInt(60000000000));
});
function mixed() { const i = example(); i.wages.push({ ...i.wages[0], id: 'G5-W2', locationIds: ['L2'], hourlyRateMinor: '2400' }); i.timecards[0].entries = [21, 22, 23, 24, 25, 26].map(d => entry('G5-' + d, `2026-09-${d}T08:00:00-04:00`, `2026-09-${d}T16:00:00-04:00`, d === 26 ? 'L2' : 'L1')); return i; }
it('G05 preserves full48-hour weighted denominator despite pay/rate/location boundaries', () => { const i = mixed(); expect(result(i).row.grossMinor).toBe('72800'); i.period = { startDate: '2026-09-26', endDate: '2026-09-26' }; const r = result(i); expect(r.row.grossMinor).toBe('24800'); expect(r.breakdown.earnings[0].premiumBasisMinorPerHour).toEqual({ numerator: '1400', denominator: '1' }); });
it('G06 keeps six prior worked days across the Monday weekly reset and blocks incomplete rest evidence', () => { const i = example(); i.period = { startDate: '2026-09-21', endDate: '2026-09-21' }; i.timecards[0].entries = [15, 16, 17, 18, 19, 20, 21].map(d => entry('G6-' + d, `2026-09-${d}T12:00:00-04:00`, `2026-09-${d}T13:00:00-04:00`)); expect(result(i).row.grossMinor).toBe('1800'); i.timecards[0].entries = i.timecards[0].entries.filter(e => e.id !== 'G6-17'); expect(result(i).row.grossMinor).toBe('1200'); i.timecards[0].period.startDate = '2026-09-18'; expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'COMPLETE_CONTEXT_REQUIRED' }] }); });
it('G07 inspects the terminal context minute but never pays it in the preceding pay window', () => { const i = example(); i.timecards[0].entries = [entry('G7', '2026-09-28T00:00:00-04:00', '2026-09-28T00:01:00-04:00')]; const c = classifyRecordedTime(i); expect(classifiedPay(i)).toEqual({ numerator: '0', denominator: '1' }); expect(c.pieces[0].week).toBe('2026-09-21T04:01:00Z'); expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'DAILY_BOUNDARY_SENSITIVE' }] }); i.timecards[0].period.endDate = '2026-09-27'; expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'COMPLETE_CONTEXT_REQUIRED' }] }); i.period = { startDate: '2026-09-28', endDate: '2026-10-04' }; i.timecards[0].period = { startDate: '2026-09-15', endDate: '2026-10-05' }; expect(classifiedPay(i)).toEqual({ numerator: '20', denominator: '1' }); expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'DAILY_BOUNDARY_SENSITIVE' }] }); });
it('G08 retains exact half-second pieces and conditional1/4+1/6-cent money without minute rounding', () => { const i = example(); i.timecards[0].entries = [14, 15, 16, 17, 18].map(d => entry('G8-' + d, `2026-09-${d}T08:00:00-04:00`, `2026-09-${d}T16:00:00-04:00`)); i.timecards[0].entries.push(entry('G8-edge', '2026-09-21T00:00:59.500-04:00', '2026-09-21T00:01:00.500-04:00')); const c = classifyRecordedTime(i), paid = c.pieces.filter(p => p.start >= c.payLeft && p.end <= c.payRight); expect(paid.map(p => (p.end - p.start).toString())).toEqual(['500000000', '500000000']); expect(paid.map(p => p.premiumReason)).toEqual(['WEEKLY', null]); expect(classifiedPay(i)).toEqual({ numerator: '5', denominator: '12' }); expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'DAILY_BOUNDARY_SENSITIVE' }] }); });
it('G09 pays partitioned windows48000+24800 once with identical complete rate context', () => { const i = mixed(); i.period = { startDate: '2026-09-21', endDate: '2026-09-25' }; const a = result(i); i.period = { startDate: '2026-09-26', endDate: '2026-09-27' }; const b = result(i); expect(a.row.grossMinor).toBe('48000'); expect(b.row.grossMinor).toBe('24800'); expect(BigInt(a.row.grossMinor) + BigInt(b.row.grossMinor)).toBe(BigInt(72800)); });
it.each(['RECORDED', 'ADJUSTMENT'] as const)('D01/D02/D06 blocks any positive first-minute %s duration even when rounded money or rest gross would match', kind => { const i = example(); const e = entry('D-edge', '2026-09-20T00:00:59.999999999-04:00', '2026-09-20T00:01:00-04:00'); e.sourceKind = kind; e.adjustmentId = kind === 'ADJUSTMENT' ? 'D-approved' : null; i.timecards[0].entries = [e]; expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'DAILY_BOUNDARY_SENSITIVE' }] }); });
it('D04 allows exact midnight end and00:01 start equality while preserving unresolved/invariant metadata', () => { const i = example(); i.timecards[0].entries = [entry('D4-a', '2026-09-21T23:00:00-04:00', '2026-09-22T00:00:00-04:00'), entry('D4-b', '2026-09-22T00:01:00-04:00', '2026-09-22T01:01:00-04:00')]; const r = result(i); expect(r.row.grossMinor).toBe('2400'); expect(r.provenance.boundaryEvidence).toMatchObject({ dailyInterpretation: 'UNRESOLVED', dailyInputDisposition: 'INVARIANT_NO_FIRST_MINUTE_ENTRIES', dailyModels: ['CIVIL_MIDNIGHT_24H', 'CIVIL_00_01_24H'] }); });
it('D05/D07 rejects cross-location or context-only ambiguity rather than checking payable earnings alone', () => { const i = example(); i.wages.push({ ...i.wages[0], id: 'D7-W', locationIds: ['L2'] }); i.timecards[0].entries = [entry('D7', '2026-09-09T00:00:30-04:00', '2026-09-09T00:00:31-04:00', 'L2')]; expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'DAILY_BOUNDARY_SENSITIVE' }] }); });
it('D07 conservatively blocks ambiguity inside a wholly unpaid break instead of subtracting it as proof', () => { const i = example(); const e = entry('D7-break', '2026-09-20T23:30:00-04:00', '2026-09-21T00:30:00-04:00'); e.breaks = [{ id: 'D7-meal', typeId: 'MEAL', startAt: e.startAt, endAt: e.endAt }]; i.timecards[0].entries = [e]; expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'DAILY_BOUNDARY_SENSITIVE' }] }); });
it.each(['DRAFT', 'REOPENED', 'APPROVED'] as const)('D08 never equates unfinished %s coverage to absence', state => { const i = example(); i.timecards[0].state = state; expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'FINALIZED_TIME_REQUIRED' }] }); });
it('D10/D11 keeps daily-cycle and alternate-week exceptions unsupported despite a valid weekly notice', () => { const i = example(true); i.wages[0].dailyBasis = 'SHIFT_START' as never; expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'UNSUPPORTED_WAGE_PROFILE' }] }); });
it('D12/D14 invalidates the proof and input identity after an effective correction enters a sensitive minute', () => { const i = example(); i.timecards[0].entries = [entry('D12', '2026-09-21T12:00:00-04:00', '2026-09-21T13:00:00-04:00')]; const r = result(i); expect(r.provenance.boundaryEvidence.sourceSha256).toMatch(/^[a-f0-9]{64}$/); i.timecards[0].entries.push({ ...entry('D12-correction', '2026-09-20T00:00:30-04:00', '2026-09-20T00:00:30.500-04:00'), sourceKind: 'ADJUSTMENT', adjustmentId: 'D12-actual-approved' }); expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'DAILY_BOUNDARY_SENSITIVE' }] }); });
it('N02/N10 preserves unknown legacy policy as a visible blocker rather than inferring a written midnight notice', () => { const i = input(); delete i.wages[0].workweekPolicy; expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'WORKWEEK_EVIDENCE_REQUIRED' }] }); });
it('N07 requires effective rate coverage for full weekly context outside pay window', () => { const i = example(); i.period = { startDate: '2026-09-26', endDate: '2026-09-26' }; i.timecards[0].entries = [entry('N07', '2026-09-21T12:00:00-04:00', '2026-09-21T13:00:00-04:00')]; i.wages[0].effectiveFrom = '2026-09-26T00:00:00-04:00'; expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'WAGE_PROFILE_REQUIRED' }] }); });
it('N12 preserves bounded source limits and never truncates oversized evidence into absence', () => { const i = example(); i.timecards = Array.from({ length: 65 }, () => structuredClone(i.timecards[0])); expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'NATIVE_SOURCE_LIMIT' }] }); });
it('N08 blocks conflicting logical entry duplicates before absence can be proven', () => { const i = example(); i.timecards[0].entries = [entry('N08', '2026-09-21T12:00:00-04:00', '2026-09-21T13:00:00-04:00')]; i.timecards.push({ ...i.timecards[0], entries: [entry('N08', '2026-09-21T12:00:00-04:00', '2026-09-21T13:00:01-04:00')] }); expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'CONFLICTING_RECORDED_SOURCE' }] }); });
