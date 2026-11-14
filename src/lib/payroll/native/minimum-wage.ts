import type { NativeWageProfile } from './contracts';
import { hourlyRate } from './money';

/** Explicit ordinary Act47/FLSA-covered, untipped scope without a higher decree.
 * No exemption, alternate sector or higher agreed right is inferred. */
export const ORDINARY_PR_MINIMUM_2026 = Object.freeze({ scope: 'PR_ACT_47_STANDARD_2026', minorPerHour: '1050', effectiveFrom: '2024-07-01', source: 'https://www.dol.gov/agencies/whd/mw-consolidated', sourceEffectiveDate: '2026-07-01' });
const reject = (code:string,reference:string):never=>{throw Object.assign(Error(code),{reference});};
export function validateNativeMinimumWage(wage: Pick<NativeWageProfile, 'hourlyRateMinor' | 'minimumWageCoverage' | 'id'>) {
    if (wage.minimumWageCoverage !== ORDINARY_PR_MINIMUM_2026.scope)
        reject('MINIMUM_WAGE_COVERAGE_REQUIRED', wage.id);
    const rate = hourlyRate(wage.hourlyRateMinor);
    if (rate.numerator < BigInt(1050) * rate.denominator)
        reject('BELOW_APPLICABLE_MINIMUM_WAGE', wage.id);
}
