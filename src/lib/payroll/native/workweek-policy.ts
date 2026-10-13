import { createHash } from 'node:crypto';
import { Temporal } from '@js-temporal/polyfill';
import { stableExportJson } from '../../payroll-export/json';
import { PR_STATUTORY_WORKWEEK_SOURCE, weekContainingInstant, workweeksForPayPeriod } from './workweek-boundaries';
import type { NativeWageProfile } from './contracts';
import type { RecurringWorkweekBoundary, WorkweekPayContext, WorkweekInterval, WorkweekPayPeriod } from './workweek-boundaries';
export type NativeWorkweekPolicy = {
    version: 'PR_WORKWEEK_POLICY_V1';
    id: string;
    revision: number;
    employeeId: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    boundary: RecurringWorkweekBoundary;
    federalWorkweek: 'SAME_VERIFIED_BOUNDARY';
    federalEvidenceReference: string;
    origin: {
        kind: 'STATUTORY_DEFAULT';
        noticeAbsenceConfirmed: true;
        evidenceReference: string;
    } | {
        kind: 'EMPLOYER_NOTICE';
        noticeReference: string;
        deliveredAt: string;
        deliveryMethod: 'POSTED_ACCESSIBLE' | 'WRITTEN_EMPLOYEE' | 'ELECTRONIC_ACCESSIBLE';
        employeeCoverageConfirmed: true;
        noticeKind: 'INITIAL' | 'CHANGE';
        previousPolicyReference: string | null;
    };
};
export type ResolvedNativeWorkweek = WorkweekPayContext & {
    policy: NativeWorkweekPolicy;
    policySha256: string;
    sourceWindow: WorkweekInterval;
    coveragePeriod: WorkweekPayPeriod;
};
export type NativeBoundaryEvidence = {
    version: 'NATIVE_BOUNDARY_EVIDENCE_V1';
    workweekPolicy: NativeWorkweekPolicy;
    workweekPolicySha256: string;
    sourceWindow: WorkweekInterval;
    fullWeekWindow: WorkweekInterval;
    dailyInterpretation: 'UNRESOLVED';
    dailyInputDisposition: 'INVARIANT_NO_FIRST_MINUTE_ENTRIES' | 'BOUNDARY_SENSITIVE';
    dailyModels: readonly [
        'CIVIL_MIDNIGHT_24H',
        'CIVIL_00_01_24H'
    ];
    sourceSha256: string;
};
/** Pinned primary-source facts and explicit unresolved precision, not an accepted daily election. */
export const NATIVE_BOUNDARY_RULE_SOURCES = Object.freeze({
    workweek: { ...PR_STATUTORY_WORKWEEK_SOURCE, sha256: 'cd1d9a0600e42a03768b01d23be2379aa1dd5611cda240e25409e2b5e6ebb896' },
    regulation: { id: 'DTRH_9017_2018', article: 'VI', pdfPage: 8, sha256: '9cae76ec16e25c9de3f613e0d10c9845d9f9dfc3f46146def69a565d2a007b43' },
    dailyPrecision: { interpretation: 'UNRESOLVED', guide2019: { pdfPages: [59, 73], sha256: 'dff56a2e4467a756c76e5cc4a64533af396e310232de6e08c874b7ad079aa60d' }, consultaC15824: { date: '2017-06-28', pdfPage: 4, sha256: 'ec776fc15e7510a965b35a69f79a8840786f5b322fbfadff622626ca228915f4' }, models: ['CIVIL_MIDNIGHT_24H', 'CIVIL_00_01_24H'] },
});
const ZONE = 'America/Puerto_Rico';
const MINUTE = BigInt(60000000000);
const fail = (code: string): never => { throw Error(code); };
function record(value: unknown, keys: string[]): Record<string, unknown> {
    if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
        return fail('INVALID_WORKWEEK_POLICY');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(value).length !== keys.length || keys.some(key => !Object.hasOwn(descriptors, key) || !Object.hasOwn(descriptors[key], 'value')))
        return fail('INVALID_WORKWEEK_POLICY');
    return value as Record<string, unknown>;
}
function check(condition: unknown): asserts condition { if (!condition)
    fail('INVALID_WORKWEEK_POLICY'); }
const text = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 300 && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
function instant(value: unknown): Temporal.Instant {
    check(typeof value === 'string' && /^(?:\d{4}|[+-]\d{6})-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value));
    try {
        return Temporal.Instant.from(value);
    }
    catch {
        return fail('INVALID_WORKWEEK_POLICY');
    }
}
export function parseNativeWorkweekPolicy(value: unknown): NativeWorkweekPolicy {
    const p = record(value, ['version', 'id', 'revision', 'employeeId', 'effectiveFrom', 'effectiveTo', 'boundary', 'federalWorkweek', 'federalEvidenceReference', 'origin']);
    check(p.version === 'PR_WORKWEEK_POLICY_V1' && text(p.id) && text(p.employeeId) && typeof p.revision === 'number' && Number.isSafeInteger(p.revision) && p.revision >= 1 && p.revision <= 2147483646);
    check(p.federalWorkweek === 'SAME_VERIFIED_BOUNDARY' && text(p.federalEvidenceReference));
    const from = instant(p.effectiveFrom);
    check(p.effectiveTo === null || instant(p.effectiveTo).epochNanoseconds > from.epochNanoseconds);
    try {
        weekContainingInstant(p.boundary as RecurringWorkweekBoundary, from.toString());
    }
    catch {
        return fail('INVALID_WORKWEEK_POLICY');
    }
    const boundary = p.boundary as RecurringWorkweekBoundary;
    if (!p.origin || typeof p.origin !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(p.origin)))
        fail('INVALID_WORKWEEK_POLICY');
    const kind = Object.getOwnPropertyDescriptor(p.origin, 'kind');
    check(kind && Object.hasOwn(kind, 'value'));
    if (kind.value === 'STATUTORY_DEFAULT') {
        const origin = record(p.origin, ['kind', 'noticeAbsenceConfirmed', 'evidenceReference']);
        check(origin.noticeAbsenceConfirmed === true && text(origin.evidenceReference) && boundary.weekday === 1 && boundary.startTime === '00:01');
    }
    else if (kind.value === 'EMPLOYER_NOTICE') {
        const origin = record(p.origin, ['kind', 'noticeReference', 'deliveredAt', 'deliveryMethod', 'employeeCoverageConfirmed', 'noticeKind', 'previousPolicyReference']);
        check(text(origin.noticeReference) && origin.employeeCoverageConfirmed === true && ['POSTED_ACCESSIBLE', 'WRITTEN_EMPLOYEE', 'ELECTRONIC_ACCESSIBLE'].includes(origin.deliveryMethod as string));
        const delivered = instant(origin.deliveredAt);
        check(delivered.epochNanoseconds <= from.epochNanoseconds);
        if (origin.noticeKind === 'INITIAL')
            check(origin.previousPolicyReference === null);
        else if (origin.noticeKind === 'CHANGE') {
            check(text(origin.previousPolicyReference));
            const deliveryDate = delivered.toZonedDateTimeISO(ZONE).toPlainDate(), effectiveDate = from.toZonedDateTimeISO(ZONE).toPlainDate();
            check(deliveryDate.until(effectiveDate).days >= 5);
        }
        else
            fail('INVALID_WORKWEEK_POLICY');
    }
    else
        fail('INVALID_WORKWEEK_POLICY');
    return structuredClone(value) as NativeWorkweekPolicy;
}
const ns = (value: string) => Temporal.Instant.from(value).epochNanoseconds;
const serialize = (value: bigint) => Temporal.Instant.fromEpochNanoseconds(value).toString();
const localDate = (value: bigint) => Temporal.Instant.fromEpochNanoseconds(value).toZonedDateTimeISO(ZONE).toPlainDate();
const midnight = (date: Temporal.PlainDate) => date.toZonedDateTime(ZONE).epochNanoseconds;
export function resolveNativeWorkweek(employeeId: string, wages: NativeWageProfile[], period: WorkweekPayPeriod): ResolvedNativeWorkweek {
    const payLeft = midnight(Temporal.PlainDate.from(period.startDate)), payRight = midnight(Temporal.PlainDate.from(period.endDate).add({ days: 1 }));
    const intersects = (w: NativeWageProfile, left: bigint, right: bigint) => ns(w.effectiveFrom) < right && (w.effectiveTo === null || ns(w.effectiveTo) > left);
    const first = wages.find(wage => intersects(wage, payLeft, payRight));
    if (!first)
        return fail('WAGE_PROFILE_REQUIRED');
    if (!first.workweekPolicy)
        return fail('WORKWEEK_EVIDENCE_REQUIRED');
    const policy = parseNativeWorkweekPolicy(first.workweekPolicy);
    const context = workweeksForPayPeriod(policy.boundary, period), fullLeft = ns(context.fullWeekWindow.startAt), fullRight = ns(context.fullWeekWindow.endAt);
    // Union of both complete six-cycle rest dependencies and initial daily seeds.
    const date = localDate(fullLeft), zero = midnight(date);
    const earlierCycle = fullLeft < zero + MINUTE ? date.subtract({ days: 1 }) : date;
    const leftA = midnight(date.subtract({ days: 6 })), leftB = midnight(earlierCycle.subtract({ days: 6 })) + MINUTE;
    const sourceLeft = leftA < leftB ? leftA : leftB;
    for (const wage of wages.filter(w => intersects(w, sourceLeft, fullRight))) {
        if (!wage.workweekPolicy)
            return fail('WORKWEEK_EVIDENCE_REQUIRED');
        const candidate = parseNativeWorkweekPolicy(wage.workweekPolicy);
        if (candidate.employeeId !== employeeId)
            return fail('WORKWEEK_EMPLOYEE_COVERAGE_REQUIRED');
        if (stableExportJson(candidate) !== stableExportJson(policy))
            return fail('WORKWEEK_POLICY_TRANSITION_UNSUPPORTED');
        // Explicit policy owns the recurring boundary; legacy coordinates are optional corroboration.
        if (wage.workweekAnchorDate !== null || wage.workweekStartTime !== null) {
            if (wage.workweekAnchorDate === null || wage.workweekStartTime === null)
                return fail('WORKWEEK_PROFILE_CONFLICT');
            if (Temporal.PlainDate.from(wage.workweekAnchorDate).dayOfWeek !== candidate.boundary.weekday || wage.workweekStartTime !== candidate.boundary.startTime)
                return fail('WORKWEEK_PROFILE_CONFLICT');
        }
    }
    if (policy.employeeId !== employeeId)
        return fail('WORKWEEK_EMPLOYEE_COVERAGE_REQUIRED');
    if (ns(policy.effectiveFrom) > sourceLeft || (policy.effectiveTo !== null && ns(policy.effectiveTo) < fullRight))
        return fail('WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED');
    return { ...context, policy, policySha256: createHash('sha256').update(stableExportJson({ policy, statutorySource: PR_STATUTORY_WORKWEEK_SOURCE })).digest('hex'), sourceWindow: { startAt: serialize(sourceLeft), endAt: serialize(fullRight) }, coveragePeriod: { startDate: localDate(sourceLeft).toString(), endDate: localDate(fullRight - BigInt(1)).toString() } };
}
