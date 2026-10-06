import { it, expect } from 'vitest';
import { evaluateOperationalRules } from './operational-rules';
import { fictionalProfile, configured } from '../../test/fixtures/shift-changes';
import type { OperationalRuleInput } from '../shift-changes/types';
const input = (): OperationalRuleInput => ({ candidate: { employeeId: 'e2', locationId: 'loc-1', date: '2026-10-05', startTime: '08:00', endTime: '16:00' }, existingShifts: [], timeZone: 'America/Puerto_Rico', profile: fictionalProfile(), scheduledBreaks: { status: 'UNKNOWN' } });
it.each(['prior', 'next'])('A090 rejects insufficient %s cross-location rest', side => { const i = input(); i.profile.minimumRest = configured({ minutes: 600, timeBasis: 'ELAPSED' }); i.existingShifts = [{ ...i.candidate, locationId: 'loc-2', date: side === 'prior' ? '2026-10-04' : '2026-10-06', startTime: side === 'prior' ? '20:00' : '00:00', endTime: side === 'prior' ? '23:00' : '04:00' }]; expect(evaluateOperationalRules(i).blockers.map(x => x.code)).toContain('MIN_REST'); });
it('A090 removes outgoing shifts before rest', () => { const i = input(); i.profile.minimumRest = configured({ minutes: 600, timeBasis: 'ELAPSED' }); i.existingShifts = [{ ...i.candidate, id: 'out', startTime: '17:00', endTime: '18:00' }]; i.excludedShiftIds = ['out']; expect(evaluateOperationalRules(i).blockers).toEqual([]); });
it('A091 enforces per-shift cap independently', () => { const i = input(); i.profile.maximumShift = configured({ minutes: 420, timeBasis: 'WALL_CLOCK' }); expect(evaluateOperationalRules(i).blockers.map(x => x.code)).toContain('MAX_SHIFT_HOURS'); });
it.each(['BUSINESS_CALENDAR_DAY', 'ROLLING_24_HOURS'] as const)('A091 checks %s daily cap', window => { const i = input(); i.profile.maximumDaily = configured({ minutes: 600, timeBasis: 'WALL_CLOCK', window }); i.existingShifts = [{ ...i.candidate, startTime: '19:00', endTime: '23:00' }]; expect(evaluateOperationalRules(i).blockers.map(x => x.code)).toContain('MAX_DAILY_HOURS'); });
it('A091 distinguishes rolling from calendar days', () => { const i = input(); i.candidate.startTime = '00:00'; i.candidate.endTime = '06:00'; i.existingShifts = [{ ...i.candidate, date: '2026-10-04', startTime: '18:00', endTime: '24:00' }]; i.profile.maximumDaily = configured({ minutes: 600, timeBasis: 'WALL_CLOCK', window: 'BUSINESS_CALENDAR_DAY' }); expect(evaluateOperationalRules(i).blockers).toEqual([]); i.profile.maximumDaily = configured({ minutes: 600, timeBasis: 'WALL_CLOCK', window: 'ROLLING_24_HOURS' }); expect(evaluateOperationalRules(i).blockers.map(x => x.code)).toContain('MAX_DAILY_HOURS'); });
it('A092 distinguishes missing break evidence, unmet break and valid scheduled break without deducting hours', () => { const i = input(); i.profile.breaks = configured({ afterMinutes: 300, minimumMinutes: 30, paid: false, timeBasis: 'ELAPSED' }); expect(evaluateOperationalRules(i).unverifiable.map(x => x.code)).toContain('RULE_UNVERIFIABLE'); i.scheduledBreaks = { status: 'KNOWN', breaks: [] }; expect(evaluateOperationalRules(i).blockers.map(x => x.code)).toContain('BREAK_REQUIREMENT'); i.scheduledBreaks = { status: 'KNOWN', breaks: [{ start: '2026-10-05T12:00:00-04:00', end: '2026-10-05T12:30:00-04:00', paid: false }] }; expect(evaluateOperationalRules(i)).toEqual({ blockers: [], unverifiable: [], warnings: [] }); });
it('A093 unknown rule differs from reviewed not applicable', () => { const i = input(); i.profile.minimumRest = { status: 'UNKNOWN' }; expect(evaluateOperationalRules(i).unverifiable.map(x => x.code)).toContain('RULE_UNVERIFIABLE'); i.profile = fictionalProfile(); expect(evaluateOperationalRules(i).unverifiable).toEqual([]); });
it('A094 routes scheduled overtime threshold separately', () => { const i = input(); i.profile.projectedOvertime = configured({ weeklyMinutes: 2400, routing: 'MANAGER_REVIEW', timeBasis: 'WALL_CLOCK' }); i.existingShifts = [{ ...i.candidate, date: '2026-10-06', startTime: '00:00', endDate: '2026-10-07', endTime: '10:00' }]; expect(evaluateOperationalRules(i).warnings.map(x => x.code)).toContain('PROJECTED_OVERTIME_REVIEW'); });
it('A098 elapsed DST rest differs from nominal and scheduled duration remains explicit', () => { const i = input(); i.timeZone = 'America/New_York'; i.candidate = { ...i.candidate, date: '2026-03-08', startTime: '08:00', endTime: '16:00' }; i.existingShifts = [{ ...i.candidate, date: '2026-03-07', startTime: '16:00', endTime: '22:00' }]; i.profile.minimumRest = configured({ minutes: 600, timeBasis: 'ELAPSED' }); expect(evaluateOperationalRules(i).blockers.map(x => x.code)).toContain('MIN_REST'); i.profile.minimumRest = configured({ minutes: 600, timeBasis: 'WALL_CLOCK' }); expect(evaluateOperationalRules(i).blockers).toEqual([]); });
it('A091 unsupported daily semantics become unverifiable rather than a guessed calendar day', () => { const i = input(); i.profile.maximumDaily = configured({ minutes: 600, timeBasis: 'WALL_CLOCK', window: 'UNSPECIFIED' as 'BUSINESS_CALENDAR_DAY' }); expect(evaluateOperationalRules(i).unverifiable.map(x => x.code)).toContain('RULE_UNVERIFIABLE'); });
it('A098 fall-back elapsed daily/per-shift duration exceeds nominal scheduled duration', () => { const i = input(); i.timeZone = 'America/New_York'; i.candidate = { ...i.candidate, date: '2026-11-01', startTime: '00:00', endTime: '04:00' }; i.profile.maximumShift = configured({ minutes: 240, timeBasis: 'ELAPSED' }); expect(evaluateOperationalRules(i).blockers.map(x => x.code)).toContain('MAX_SHIFT_HOURS'); i.profile.maximumShift = configured({ minutes: 240, timeBasis: 'WALL_CLOCK' }); expect(evaluateOperationalRules(i).blockers).toEqual([]); i.profile.maximumDaily = configured({ minutes: 240, timeBasis: 'ELAPSED', window: 'BUSINESS_CALENDAR_DAY' }); expect(evaluateOperationalRules(i).blockers.map(x => x.code)).toContain('MAX_DAILY_HOURS'); });
it('A092 wrong paid treatment, late timing and short duration each fail known breaks', () => { const i = input(); i.profile.breaks = configured({ afterMinutes: 300, minimumMinutes: 30, paid: false, timeBasis: 'WALL_CLOCK' }); for (const b of [{ start: '12:00', end: '12:30', paid: true }, { start: '14:00', end: '14:30', paid: false }, { start: '12:00', end: '12:20', paid: false }]) {
    i.scheduledBreaks = { status: 'KNOWN', breaks: [{ ...b, start: `2026-10-05T${b.start}:00-04:00`, end: `2026-10-05T${b.end}:00-04:00` }] };
    expect(evaluateOperationalRules(i).blockers.map(x => x.code)).toContain('BREAK_REQUIREMENT');
} });

function withDistantAmbiguousHistory(): OperationalRuleInput {
    const value = input();
    value.timeZone = 'America/New_York';
    value.existingShifts = [{
        ...value.candidate,
        id: 'unrelated-history',
        date: '2025-11-02',
        startTime: '01:30',
        endTime: '04:00',
    }];
    return value;
}

it('I1 reviewed non-applicability requires no historical elapsed evidence', () => {
    expect(evaluateOperationalRules(withDistantAmbiguousHistory())).toEqual({
        blockers: [], unverifiable: [], warnings: [],
    });
});

it.each(['WALL_CLOCK', 'ELAPSED'] as const)('I1 %s per-shift limit only requires candidate facts', timeBasis => {
    const value = withDistantAmbiguousHistory();
    value.profile.maximumShift = configured({ minutes: 480, timeBasis });
    expect(evaluateOperationalRules(value)).toEqual({
        blockers: [], unverifiable: [], warnings: [],
    });
});

it.each(['rest', 'calendar', 'rolling', 'weekly', 'break'] as const)('I1 elapsed %s ignores ambiguity outside its relevant boundaries/window', rule => {
    const value = withDistantAmbiguousHistory();
    if (rule === 'rest') {
        value.profile.minimumRest = configured({ minutes: 600, timeBasis: 'ELAPSED' });
        value.existingShifts = [...value.existingShifts, {
            ...value.candidate, date: '2026-10-04', startTime: '08:00', endTime: '16:00',
        }];
    }
    if (rule === 'calendar' || rule === 'rolling') {
        value.profile.maximumDaily = configured({
            minutes: 600, timeBasis: 'ELAPSED',
            window: rule === 'calendar' ? 'BUSINESS_CALENDAR_DAY' : 'ROLLING_24_HOURS',
        });
    }
    if (rule === 'weekly') {
        value.profile.projectedOvertime = configured({ weeklyMinutes: 2400, routing: 'MANAGER_REVIEW', timeBasis: 'ELAPSED' });
    }
    if (rule === 'break') {
        value.profile.breaks = configured({ afterMinutes: 600, minimumMinutes: 30, paid: false, timeBasis: 'ELAPSED' });
    }
    expect(evaluateOperationalRules(value)).toEqual({ blockers: [], unverifiable: [], warnings: [] });
});

it.each(['priorRest', 'nextRest', 'calendar', 'rolling', 'weekly'] as const)('I1 relevant ambiguous elapsed %s facts remain unverifiable', rule => {
    const value = input();
    value.timeZone = 'America/New_York';
    value.candidate = { ...value.candidate, date: '2026-11-01', startTime: '08:00', endTime: '12:00' };
    value.existingShifts = [{ ...value.candidate, startTime: '00:00', endTime: '01:30' }];
    if (rule === 'priorRest' || rule === 'nextRest') {
        value.profile.minimumRest = configured({ minutes: 600, timeBasis: 'ELAPSED' });
        if (rule === 'nextRest') {
            value.candidate = { ...value.candidate, date: '2026-10-31', startTime: '16:00', endTime: '20:00' };
            value.existingShifts = [{ ...value.candidate, date: '2026-11-01', startTime: '01:30', endTime: '04:00' }];
        }
    }
    if (rule === 'calendar' || rule === 'rolling') {
        value.profile.maximumDaily = configured({ minutes: 600, timeBasis: 'ELAPSED', window: rule === 'calendar' ? 'BUSINESS_CALENDAR_DAY' : 'ROLLING_24_HOURS' });
    }
    if (rule === 'weekly') {
        value.profile.projectedOvertime = configured({ weeklyMinutes: 2400, routing: 'MANAGER_REVIEW', timeBasis: 'ELAPSED' });
    }
    expect(evaluateOperationalRules(value).unverifiable.map(issue => issue.code)).toContain('RULE_UNVERIFIABLE');
});

it('I1 elapsed rest only requires the adjacent end, not its unrelated ambiguous start', () => {
    const value = withDistantAmbiguousHistory();
    value.profile.minimumRest = configured({ minutes: 600, timeBasis: 'ELAPSED' });
    expect(evaluateOperationalRules(value)).toEqual({ blockers: [], unverifiable: [], warnings: [] });
});

it.each(['calendar', 'weekly', 'rolling'] as const)('I1 %s clips an ambiguous start wholly outside the contributing elapsed window', rule => {
    const value = input();
    value.timeZone = 'America/New_York';
    value.candidate = { ...value.candidate, date: '2026-11-02', startTime: '08:00', endTime: '12:00' };
    value.existingShifts = [{ ...value.candidate, date: '2026-11-01', startTime: '01:30', endDate: '2026-11-02', endTime: '04:00' }];
    if (rule === 'weekly') {
        value.profile.projectedOvertime = configured({ weeklyMinutes: 480, routing: 'MANAGER_REVIEW', timeBasis: 'ELAPSED' });
    } else {
        value.profile.maximumDaily = configured({ minutes: rule === 'rolling' ? 1440 : 480, timeBasis: 'ELAPSED', window: rule === 'rolling' ? 'ROLLING_24_HOURS' : 'BUSINESS_CALENDAR_DAY' });
    }
    expect(evaluateOperationalRules(value)).toEqual({ blockers: [], unverifiable: [], warnings: [] });
});

it('I1 an ambiguous endpoint straddling the elapsed window is not discarded using one offset', () => {
    const value = input();
    value.timeZone = 'America/New_York';
    value.candidate = { ...value.candidate, date: '2026-11-02', startTime: '00:15', endTime: '00:45' };
    value.existingShifts = [{ ...value.candidate, date: '2026-11-01', startTime: '00:00', endTime: '01:30' }];
    value.profile.maximumDaily = configured({ minutes: 1440, timeBasis: 'ELAPSED', window: 'ROLLING_24_HOURS' });
    expect(evaluateOperationalRules(value).unverifiable.map(issue => issue.code)).toContain('RULE_UNVERIFIABLE');
});

it('I1 a contributing skipped endpoint stays unverifiable rather than normalized', () => {
    const value = input();
    value.timeZone = 'America/New_York';
    value.candidate = { ...value.candidate, date: '2026-03-08', startTime: '08:00', endTime: '12:00' };
    value.existingShifts = [{ ...value.candidate, startTime: '00:00', endTime: '02:30' }];
    value.profile.maximumDaily = configured({ minutes: 600, timeBasis: 'ELAPSED', window: 'BUSINESS_CALENDAR_DAY' });
    expect(evaluateOperationalRules(value).unverifiable.map(issue => issue.code)).toContain('RULE_UNVERIFIABLE');
});

it.each([60, 240])('I2 every overtime week must be verified even when an earlier week exceeds threshold %s', weeklyMinutes => {
    const value = input();
    value.timeZone = 'America/New_York';
    value.candidate = { ...value.candidate, date: '2026-10-25', startTime: '20:00', endTime: '04:00' };
    value.existingShifts = [{ ...value.candidate, date: '2026-11-01', startTime: '01:30', endTime: '04:00' }];
    value.profile.projectedOvertime = configured({ weeklyMinutes, routing: 'MANAGER_REVIEW', timeBasis: 'ELAPSED' });

    expect(evaluateOperationalRules(value).unverifiable.map(issue => issue.code)).toContain('RULE_UNVERIFIABLE');
});
