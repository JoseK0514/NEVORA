import { Temporal } from '@js-temporal/polyfill';
import { formatBusinessDateTimeInput, localDateTimeToInstant, shiftBoundaryInstants } from '../business-time';
import { addDays } from '../date-utils';
import { resolveOperationalRuleProfile } from '../shift-changes/policy';
import type { OperationalRuleInput, OperationalRuleResult, ShiftChangeIssue, RuleTimeBasis } from '../shift-changes/types';
import { affectedWorkweeks, businessDateStart, periodsOverlap, shiftPeriod, splitBusinessDays, type BusinessPeriod } from './periods';
/** Scheduled projections only. Break facts never reduce scheduled minutes. */
export function evaluateOperationalRules(input: OperationalRuleInput): OperationalRuleResult {
    const blockers: ShiftChangeIssue[] = [], unverifiable: ShiftChangeIssue[] = [], warnings: ShiftChangeIssue[] = [];
    const unknown = (rule: string) => unverifiable.push({
        code: 'RULE_UNVERIFIABLE', message: `Required scheduling rule cannot be verified (${rule}).`
    });
    const block = (code: ShiftChangeIssue['code'], message: string) => blockers.push({
        code, message
    });
    const profile = resolveOperationalRuleProfile(input.profile);
    for (const key of ['minimumRest', 'maximumShift', 'maximumDaily', 'breaks', 'projectedOvertime'] as const)
        if (profile[key].status === 'UNKNOWN')
            unknown(key);
    const ruleKeys = ['minimumRest', 'maximumShift', 'maximumDaily', 'breaks', 'projectedOvertime'] as const;
    if (!ruleKeys.some(key => profile[key].status === 'CONFIGURED')) {
        return { blockers, unverifiable, warnings };
    }
    try {
        const seen = new Set<string>(), excluded = new Set(input.excludedShiftIds);
        const ledger = input.existingShifts.filter(s => {
            if (s.employeeId !== input.candidate.employeeId || s.isCalloutApproved || (s.id && (seen.has(s.id) || excluded.has(s.id))))
                return false;
            if (s.id)
                seen.add(s.id);
            return true;
        });
        const nominal = shiftPeriod(input.candidate);
        const resolved = (s: OperationalRuleInput['candidate']) => { const b = shiftBoundaryInstants(s, input.timeZone); return {
            start: Date.parse(b.startAt) / 60000, end: Date.parse(b.endAt) / 60000
        }; };
        const localBoundary = (n: number) => new Date(n * 60000).toISOString().slice(0, 16);
        const coordinate = (n: number, basis: RuleTimeBasis) => basis === 'WALL_CLOCK'
            ? n
            : Date.parse(localDateTimeToInstant(localBoundary(n), input.timeZone)) / 60000;
        const period = (p: BusinessPeriod, basis: RuleTimeBasis): BusinessPeriod => ({
            start: coordinate(p.start, basis), end: coordinate(p.end, basis),
        });
        // Candidate-only rules must not demand any historical temporal evidence.
        const candidate = (basis: RuleTimeBasis) => basis === 'WALL_CLOCK' ? nominal : resolved(input.candidate);
        const duration = (basis: RuleTimeBasis) => {
            const value = candidate(basis);
            return value.end - value.start;
        };
        const nominalRecords = () => ledger.map(shift => shiftPeriod(shift));
        const clipped = (p: BusinessPeriod, window: BusinessPeriod) => ({
            start: Math.max(p.start, window.start), end: Math.min(p.end, window.end),
        });
        const boundaryBounds = (n: number) => {
            const local = Temporal.PlainDateTime.from(localBoundary(n));
            const earlier = local.toZonedDateTime(input.timeZone, { disambiguation: 'earlier' }).epochMilliseconds / 60000;
            const later = local.toZonedDateTime(input.timeZone, { disambiguation: 'later' }).epochMilliseconds / 60000;
            return { minimum: Math.min(earlier, later), maximum: Math.max(earlier, later) };
        };
        const windowRecords = (window: BusinessPeriod, basis: RuleTimeBasis): BusinessPeriod[] => {
            return [...nominalRecords(), nominal].flatMap(row => {
                if (basis === 'WALL_CLOCK') {
                    return periodsOverlap(row, window) ? [clipped(row, window)] : [];
                }
                const start = boundaryBounds(row.start), end = boundaryBounds(row.end);
                // These are uncertainty bounds, never selected actual offsets. Only discard
                // or clip a boundary when every interpretation is outside the window.
                // Any possibly contributing ambiguous/skipped boundary still uses strict
                // resolution below and therefore returns UNVERIFIED; no offset is guessed.
                if (end.maximum <= window.start || start.minimum >= window.end) return [];
                const relevant = {
                    start: start.maximum <= window.start ? window.start : coordinate(row.start, basis),
                    end: end.minimum >= window.end ? window.end : coordinate(row.end, basis),
                };
                return periodsOverlap(relevant, window) ? [clipped(relevant, window)] : [];
            });
        };
        const windowMinutes = (rows: BusinessPeriod[], window: BusinessPeriod) => rows.reduce(
            (sum, row) => sum + Math.max(0, Math.min(window.end, row.end) - Math.max(window.start, row.start)), 0,
        );
        if (profile.minimumRest.status === 'CONFIGURED') {
            const rule = profile.minimumRest.value, current = candidate(rule.timeBasis);
            const rows = nominalRecords();
            const precedingEnd = Math.max(...rows.filter(row => row.end <= nominal.start).map(row => row.end));
            const followingStart = Math.min(...rows.filter(row => row.start >= nominal.end).map(row => row.start));
            // Only the immediately adjacent retained endpoints establish rest. The
            // other endpoint of each adjacent shift is not a required rest fact.
            const insufficientBefore = Number.isFinite(precedingEnd)
                && current.start - coordinate(precedingEnd, rule.timeBasis) < rule.minutes;
            const insufficientAfter = Number.isFinite(followingStart)
                && coordinate(followingStart, rule.timeBasis) - current.end < rule.minutes;
            if (insufficientBefore || insufficientAfter)
                block('MIN_REST', 'Insufficient rest under the configured rule.');
        }
        if (profile.maximumShift.status === 'CONFIGURED' && duration(profile.maximumShift.value.timeBasis) > profile.maximumShift.value.minutes)
            block('MAX_SHIFT_HOURS', 'Exceeds configured per-shift maximum.');
        if (profile.maximumDaily.status === 'CONFIGURED') {
            const rule = profile.maximumDaily.value;
            let exceeded = false;
            if (rule.window === 'BUSINESS_CALENDAR_DAY') {
                exceeded = splitBusinessDays(nominal).some(day => {
                    const start = businessDateStart(day.date);
                    const window = period({ start, end: start + 1440 }, rule.timeBasis);
                    return windowMinutes(windowRecords(window, rule.timeBasis), window) > rule.minutes;
                });
            } else if (rule.window === 'ROLLING_24_HOURS') {
                const current = candidate(rule.timeBasis);
                const horizon = { start: current.start - 1440, end: current.end + 1440 };
                const rows = windowRecords(horizon, rule.timeBasis);
                // The maximum of a moving integral occurs at a shift boundary or boundary minus window.
                const starts = new Set(rows.flatMap(row => [row.start, row.end, row.start - 1440, row.end - 1440]));
                exceeded = [...starts].some(start => {
                    const window = { start, end: start + 1440 };
                    return periodsOverlap(window, current) && windowMinutes(rows, window) > rule.minutes;
                });
            } else {
                unknown('maximumDaily.window');
            }
            if (exceeded)
                block('MAX_DAILY_HOURS', 'Exceeds configured daily maximum.');
        }
        if (profile.breaks.status === 'CONFIGURED') {
            const r = profile.breaks.value, c = candidate(r.timeBasis);
            if (duration(r.timeBasis) > r.afterMinutes) {
                if (input.scheduledBreaks.status !== 'KNOWN')
                    unknown('scheduled breaks');
                else {
                    const breaks = input.scheduledBreaks.breaks.map(b => {
                        if (!/(Z|[+-]\d\d:\d\d)$/.test(b.start) || !/(Z|[+-]\d\d:\d\d)$/.test(b.end))
                            throw new Error('Break needs instants');
                        const value = (v: string) => r.timeBasis === 'ELAPSED' ? Date.parse(v) / 60000 : Date.parse(`${formatBusinessDateTimeInput(v, input.timeZone)}Z`) / 60000;
                        return {
                            start: value(b.start), end: value(b.end), paid: b.paid
                        };
                    });
                    if (breaks.some(b => !Number.isFinite(b.start) || !Number.isFinite(b.end) || b.start < c.start || b.end > c.end || b.end <= b.start))
                        unknown('scheduled break boundaries');
                    else if (!breaks.some(b => b.paid === r.paid && b.end - b.start >= r.minimumMinutes && b.start - c.start <= r.afterMinutes))
                        block('BREAK_REQUIREMENT', 'Required scheduled break is not satisfied.');
                }
            }
        }
        if (profile.projectedOvertime.status === 'CONFIGURED') {
            const rule = profile.projectedOvertime.value;
            let exceeded = false;
            // A soft threshold crossing cannot skip mandatory facts in later weeks.
            for (const week of affectedWorkweeks(nominal)) {
                const window = period({
                    start: businessDateStart(week), end: businessDateStart(addDays(week, 7)),
                }, rule.timeBasis);
                const minutes = windowMinutes(windowRecords(window, rule.timeBasis), window);
                if (minutes > rule.weeklyMinutes) exceeded = true;
            }
            if (exceeded && rule.routing === 'MANAGER_REVIEW')
                warnings.push({
                    code: 'PROJECTED_OVERTIME_REVIEW', message: 'Projected scheduled overtime needs manager review.'
                });
        }
    }
    catch {
        unknown('dated scheduling facts');
    }
    return {
        blockers, unverifiable, warnings
    };
}
