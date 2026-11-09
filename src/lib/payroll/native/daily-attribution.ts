/**
 * Client-safe daily attribution identity for native payroll boundary evidence.
 *
 * Current calculations (owner rule approved 2026-10-25, confirmed for Release 1 on
 * 2026-10-30) attribute every recorded entry wholly to the America/Puerto_Rico civil
 * day on which it starts. Daily overtime and consecutive-day rest use those attributed
 * days, each instant counted once. The 168h workweek, weekly/FLSA overtime and pay-period
 * cuts stay on actual instants.
 *
 * Saved runs keep the daily evidence they were calculated with. The superseded values
 * below are accepted only when reading those stored artifacts; no calculation produces
 * them again. No database migration rewrites them.
 */
export const SHIFT_START_DAY_EVIDENCE = Object.freeze({
    dailyInterpretation: 'OWNER_AUTHORIZED_SHIFT_START_DAY' as const,
    dailyInputDisposition: 'SHIFT_START_DAY_APPLIED_ALL_ENTRIES' as const,
    dailyModels: Object.freeze(['SHIFT_START_DAY'] as const),
});
/** Stored owner-policy results calculated with civil-midnight daily cuts before 2026-10-30. */
export const SUPERSEDED_OWNER_CIVIL_MIDNIGHT_EVIDENCE = Object.freeze({
    dailyInterpretation: 'OWNER_AUTHORIZED_CIVIL_MIDNIGHT_24H' as const,
    dailyInputDisposition: 'OWNER_POLICY_APPLIED_ALL_INSTANTS' as const,
    dailyModels: Object.freeze(['CIVIL_MIDNIGHT_24H'] as const),
});
/** Stored non-policy results proven invariant under both civil-day models before 2026-10-30. */
export const SUPERSEDED_UNRESOLVED_INVARIANT_EVIDENCE = Object.freeze({
    dailyInterpretation: 'UNRESOLVED' as const,
    dailyInputDisposition: 'INVARIANT_NO_FIRST_MINUTE_ENTRIES' as const,
    dailyModels: Object.freeze(['CIVIL_MIDNIGHT_24H', 'CIVIL_00_01_24H'] as const),
});
/** SHA-256 of each owner provisional policy record revision (same policy id). The current
 * value must equal OWNER_PAYROLL_POLICY_SHA256; provisional-policy.test.ts pins both. */
export const OWNER_PAYROLL_POLICY_RECORD_SHA256 = Object.freeze({
    shiftStartDay: '099f20d3af063cdbcf60415bfd5c88b5cee654fcd984b1913448cf037baecedb',
    civilMidnight: 'ff3320154b9dfea688cc4ff76337910b1fccb16aca451e4af92883149a128d60',
});
type DailyTriple = { dailyInterpretation: string; dailyInputDisposition: string; dailyModels: readonly string[] };
const same = (value: Record<string, unknown>, expected: DailyTriple) => value.dailyInterpretation === expected.dailyInterpretation &&
    value.dailyInputDisposition === expected.dailyInputDisposition && Array.isArray(value.dailyModels) &&
    value.dailyModels.length === expected.dailyModels.length && value.dailyModels.every((model, index) => model === expected.dailyModels[index]);
/** Verify one saved daily evidence triple against the policy that produced it.
 * policySha256 is null for results without the owner provisional policy. */
export function acceptedDailyEvidence(value: Record<string, unknown>, policySha256: string | null): boolean {
    if (same(value, SHIFT_START_DAY_EVIDENCE))
        return policySha256 === null || policySha256 === OWNER_PAYROLL_POLICY_RECORD_SHA256.shiftStartDay;
    if (same(value, SUPERSEDED_OWNER_CIVIL_MIDNIGHT_EVIDENCE))
        return policySha256 === OWNER_PAYROLL_POLICY_RECORD_SHA256.civilMidnight;
    if (same(value, SUPERSEDED_UNRESOLVED_INVARIANT_EVIDENCE))
        return policySha256 === null;
    return false;
}
