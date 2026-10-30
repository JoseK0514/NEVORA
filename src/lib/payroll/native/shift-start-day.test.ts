import { describe, expect, it } from 'vitest';
import { calculateNativePayroll } from './calculate';
import { classifyRecordedTime, HOUR, ns } from './time';
import { input, entry } from './fixtures.test-support';
import type { NativePayrollInput, NativePayrollReady } from './contracts';

// Fictional data only. input(): 2000 cents/h, TIME_AND_HALF, Monday 00:00 workweek,
// Monday-Sunday pay period 2026-10-05..2026-10-11 and finalized time from 2026-09-28.
const reference = 'OWNER_AUTHORIZED_PROVISIONAL_PR_STANDARD_2026_20261014';
function owner(i = input()): NativePayrollInput {
    i.calculationPolicyReference = reference; i.wages[0].wageCentRounding = 'UNVERIFIED';
    i.tax!.prCentRounding = 'HALF_UP'; i.tax!.ruleEvidenceReference = 'OWNER_ATTESTED_ACCOUNTANT_PR_2026_FINAL_PERIODIC_HALF_UP_20261014';
    return i;
}
function ready(i: NativePayrollInput): NativePayrollReady {
    const r = calculateNativePayroll(i); expect(r.state, JSON.stringify(r)).toBe('ready');
    if (r.state !== 'ready') throw Error('Blocked fictional fixture'); return r;
}
const hours = (n: bigint) => (n / HOUR).toString();
const paid = (i: NativePayrollInput) => { const c = classifyRecordedTime(i); return c.pieces.filter(p => p.start >= c.payLeft && p.end <= c.payRight); };
const total = (pieces: { start: bigint; end: bigint }[]) => pieces.reduce((n, p) => n + p.end - p.start, BigInt(0));
const classes = (pieces: ReturnType<typeof paid>) => pieces.map(p => [p.date, p.premiumReason, p.federalOvertime, hours(p.end - p.start)]);

describe('shift start day daily attribution', () => {
    it.each([['without', false], ['with', true]] as const)('counts a 22:00-07:00 overnight shift as nine hours on its start day %s the owner policy', (_label, selected) => {
        const i = selected ? owner() : input();
        i.timecards[0].entries = [entry('N', '2026-10-05T22:00:00-04:00', '2026-10-06T07:00:00-04:00')];
        expect(classes(paid(i))).toEqual([['2026-10-05', null, false, '8'], ['2026-10-05', 'DAILY', false, '1']]);
        const r = ready(i);
        expect(r.row.grossMinor).toBe('19000');
        expect(r.breakdown).toMatchObject({ regularNanoseconds: (HOUR * BigInt(8)).toString(), overtimeNanoseconds: HOUR.toString() });
        expect(r.provenance.boundaryEvidence).toMatchObject({ dailyInterpretation: 'OWNER_AUTHORIZED_SHIFT_START_DAY', dailyInputDisposition: 'SHIFT_START_DAY_APPLIED_ALL_ENTRIES', dailyModels: ['SHIFT_START_DAY'] });
    });
    it('adds two same-day shifts and the overnight tail into one day, and starts the next day at zero', () => {
        const i = input();
        i.timecards[0].entries = [
            entry('D-a', '2026-10-06T06:00:00-04:00', '2026-10-06T10:00:00-04:00'),
            entry('D-b', '2026-10-06T12:00:00-04:00', '2026-10-06T15:00:00-04:00'),
            entry('D-night', '2026-10-06T22:00:00-04:00', '2026-10-07T03:00:00-04:00'),
            entry('D1', '2026-10-07T08:00:00-04:00', '2026-10-07T16:00:00-04:00'),
        ];
        // Tuesday: 4h + 3h + 1h regular, then 4h daily overtime (23:00-03:00) on Tuesday.
        // Wednesday 08:00-16:00 starts its own day: a rolling 24h window would wrongly count it again.
        expect(classes(paid(i))).toEqual([
            ['2026-10-06', null, false, '4'], ['2026-10-06', null, false, '3'], ['2026-10-06', null, false, '1'], ['2026-10-06', 'DAILY', false, '4'],
            ['2026-10-07', null, false, '8'],
        ]);
        const r = ready(i);
        expect(r.breakdown).toMatchObject({ regularNanoseconds: (HOUR * BigInt(16)).toString(), overtimeNanoseconds: (HOUR * BigInt(4)).toString() });
        expect(r.row.grossMinor).toBe('44000');
    });
    it('treats the start day, not the tail day, as the worked day for consecutive-day rest', () => {
        const i = input(); i.period = { startDate: '2026-10-05', endDate: '2026-10-18' }; i.timecards[0].period.endDate = '2026-10-18';
        // Six one-hour days Monday-Saturday, then a Saturday-night shift that ends Sunday morning.
        i.timecards[0].entries = [5, 6, 7, 8, 9].map(d => entry('R' + d, `2026-10-${String(d).padStart(2, '0')}T12:00:00-04:00`, `2026-10-${String(d).padStart(2, '0')}T13:00:00-04:00`));
        i.timecards[0].entries.push(entry('R10', '2026-10-10T22:00:00-04:00', '2026-10-11T02:00:00-04:00'));
        // Sunday has no entry of its own, so it is a full attributed day off: Monday 10-12 is day one again.
        i.timecards[0].entries.push(entry('R12', '2026-10-12T12:00:00-04:00', '2026-10-12T13:00:00-04:00'));
        expect(paid(i).filter(p => p.premiumReason === 'REST_DAY')).toEqual([]);
        // A Sunday entry of its own makes Sunday the seventh consecutive worked day.
        i.timecards[0].entries = [...i.timecards[0].entries.filter(e => e.id !== 'R12'), entry('R11', '2026-10-11T12:00:00-04:00', '2026-10-11T13:00:00-04:00')];
        expect(classes(paid(i).filter(p => p.premiumReason === 'REST_DAY'))).toEqual([['2026-10-11', 'REST_DAY', false, '1']]);
    });
    it('pays a shift crossing the pay-period end once across both runs with the start day classification in each', () => {
        const shift = [entry('P-day', '2026-10-07T09:00:00-04:00', '2026-10-07T13:00:00-04:00'), entry('P-night', '2026-10-07T20:00:00-04:00', '2026-10-08T04:00:00-04:00')];
        const first = input(); first.period = { startDate: '2026-10-05', endDate: '2026-10-07' }; first.timecards[0].entries = structuredClone(shift);
        const second = input(); second.period = { startDate: '2026-10-08', endDate: '2026-10-11' }; second.timecards[0].entries = structuredClone(shift);
        const whole = input(); whole.timecards[0].entries = structuredClone(shift);
        // Wednesday reaches 8h at midnight: the run ending Wednesday pays 8h regular, the next pays
        // the 00:00-04:00 tail as Wednesday daily overtime. Neither run pays a minute twice.
        expect(classes(paid(first))).toEqual([['2026-10-07', null, false, '4'], ['2026-10-07', null, false, '4']]);
        expect(classes(paid(second))).toEqual([['2026-10-07', 'DAILY', false, '4']]);
        expect(total(paid(first)) + total(paid(second))).toBe(total(paid(whole)));
        const tail = (i: NativePayrollInput) => classifyRecordedTime(i).pieces.filter(p => p.start >= ns('2026-10-08T00:00:00-04:00')).map(p => [p.start, p.end, p.date, p.premiumReason, p.overtime]);
        expect(tail(first)).toEqual(tail(second));
        const [a, b, all] = [ready(first), ready(second), ready(whole)];
        expect([a.row.grossMinor, b.row.grossMinor]).toEqual(['16000', '12000']);
        expect(BigInt(a.row.grossMinor) + BigInt(b.row.grossMinor)).toBe(BigInt(all.row.grossMinor));
        expect(BigInt(a.breakdown.overtimeNanoseconds) + BigInt(b.breakdown.overtimeNanoseconds)).toBe(BigInt(all.breakdown.overtimeNanoseconds));
    });
    it('keeps weekly and federal overtime on actual instants for a shift crossing the workweek boundary', () => {
        const week = [5, 6, 7, 8, 9].map(d => entry('W' + d, `2026-10-${String(d).padStart(2, '0')}T08:00:00-04:00`, `2026-10-${String(d).padStart(2, '0')}T16:00:00-04:00`));
        const night = entry('W-night', '2026-10-11T22:00:00-04:00', '2026-10-12T06:00:00-04:00'), monday = entry('W-mon', '2026-10-12T08:00:00-04:00', '2026-10-12T16:00:00-04:00');
        const first = input(); first.timecards[0].entries = [...week, night];
        const second = input(); second.period = { startDate: '2026-10-12', endDate: '2026-10-18' }; second.payday = '2026-10-23';
        second.timecards[0].period = { startDate: '2026-09-28', endDate: '2026-10-18' }; second.timecards[0].entries = [...week, night, monday];
        // Sunday 22:00-24:00 is in the 40h week: weekly and federal overtime. The 00:00-06:00 tail
        // is in the next workweek by instant, while its daily total still belongs to Sunday.
        expect(classes(paid(first)).slice(-1)).toEqual([['2026-10-11', 'WEEKLY', true, '2']]);
        expect(classes(paid(second))).toEqual([['2026-10-11', null, false, '6'], ['2026-10-12', null, false, '8']]);
        expect(paid(second).map(p => p.week)).toEqual(['2026-10-12T04:00:00Z', '2026-10-12T04:00:00Z']);
        const [a, b] = [ready(first), ready(second)];
        expect(a.row.grossMinor).toBe('86000'); expect(a.breakdown.overtimeNanoseconds).toBe((HOUR * BigInt(2)).toString());
        expect(b.row.grossMinor).toBe('28000'); expect(b.breakdown.overtimeNanoseconds).toBe('0');
        expect(b.breakdown.earnings.some(e => e.kind === 'FLSA_TRUE_UP')).toBe(false);
    });
    it.each([['without', false], ['with', true]] as const)('calculates an entry starting at 00:00:30 on its own day %s the owner policy instead of blocking', (_label, selected) => {
        const i = selected ? owner() : input();
        i.timecards[0].entries = [entry('M', '2026-10-06T00:00:30-04:00', '2026-10-06T08:00:30-04:00')];
        expect(classes(paid(i))).toEqual([['2026-10-06', null, false, '8']]);
        const r = ready(i);
        expect(r.row.grossMinor).toBe('16000');
        expect(r.provenance.boundaryEvidence.dailyInterpretation).toBe('OWNER_AUTHORIZED_SHIFT_START_DAY');
    });
    it('never blocks on recorded time that touches 00:00-00:01 or ends exactly at midnight', () => {
        const i = input();
        i.timecards[0].entries = [entry('Z1', '2026-10-05T16:00:00-04:00', '2026-10-06T00:00:00-04:00'), entry('Z2', '2026-10-06T00:00:00-04:00', '2026-10-06T00:00:59.5-04:00'), entry('Z3', '2026-10-06T23:59:59-04:00', '2026-10-07T00:01:01-04:00')];
        expect(paid(i).map(p => p.date)).toEqual(['2026-10-05', '2026-10-06', '2026-10-06']);
        expect(ready(i).breakdown.overtimeNanoseconds).toBe('0');
    });
    it('requires the whole start day when an entry from before the recorded context reaches the classified week', () => {
        const i = input(); i.timecards[0].period.startDate = '2026-09-20';
        // The recorded context starts 2026-09-28 00:01; an implausible eight-day entry starting the day before
        // would otherwise be classified without its whole start day.
        i.timecards[0].entries = [entry('LONG', '2026-09-27T12:00:00-04:00', '2026-10-05T01:00:00-04:00')];
        expect(calculateNativePayroll(i)).toMatchObject({ state: 'blocked', issues: [{ code: 'COMPLETE_CONTEXT_REQUIRED', reference: '2026-09-27' }] });
    });
});
