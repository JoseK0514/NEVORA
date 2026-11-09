import { halfUp, minor, ratio, serialized, subtract } from './money';
export type FederalEmployeeTaxCode = 'SOCIAL_SECURITY' | 'MEDICARE' | 'ADDITIONAL_MEDICARE';
export type NativeFederalEmployeeTaxOperation = {
    code: FederalEmployeeTaxCode;
    taxableMinor: string;
    basisPoints: number;
    exactAmount: { numerator: string; denominator: string };
    /** Calculated statutory collection for this payroll; does not attest a payment or remittance. */
    collectedMinor: string;
    /** Signed collected cents minus exact employee-tax cents; retained for later reconciliation. */
    roundingDifference: { numerator: string; denominator: string };
    ruleId: '26_CFR_31_3102_1_D';
};
export const FEDERAL_EMPLOYEE_CENT_RULE_SOURCE = Object.freeze({
    id: '26_CFR_31_3102_1_D', edition: 'OFFICIAL_2025_ANNUAL', page: 2, applicableFrom: '1955-01-01',
    url: 'https://www.govinfo.gov/content/pkg/CFR-2025-title26-vol17/pdf/CFR-2025-title26-vol17-sec31-3102-1.pdf',
    sha256: '6aa9dc7b2f966a46c726d4bc4658b4a90804f3cfc9d69abb862f2ad3f5786980',
    rule: 'BELOW_HALF_DOWN_HALF_OR_MORE_UP', scope: 'STANDARD_FEDERAL_EMPLOYEE_TAX_COLLECTION_ONLY',
    additionalMedicare: { url: 'https://www.govinfo.gov/content/pkg/CFR-2025-title26-vol17/pdf/CFR-2025-title26-vol17-sec31-3102-4.pdf', edition: 'OFFICIAL_2025_ANNUAL', paragraph: 'a', applicableFrom: '2013-11-29', sha256: 'e56d551dc1b234348eae5462cb62517076cc9af90078e5cccba0173dd4329a7b' },
    corroboration: { url: 'https://www.irs.gov/publications/p15', pdfUrl: 'https://www.irs.gov/pub/irs-pdf/p15.pdf', taxYear: 2026, sections: [9,13], sha256: 'b46c3622439d8521e3a0faca4cd5b5ece3451b526f65f06a5e38d5c9f804c88b' },
});
const rates = { SOCIAL_SECURITY: 620, MEDICARE: 145, ADDITIONAL_MEDICARE: 90 } as const;
/** Call after applying the supported covered-wage cap or withholding threshold. */
export function collectFederalEmployeeTax(code: FederalEmployeeTaxCode, taxableMinor: string): NativeFederalEmployeeTaxOperation {
    if (!Object.hasOwn(rates, code)) throw Error('INVALID_NATIVE_RULE_INPUT');
    const basisPoints = rates[code];
    const exact = ratio(minor(taxableMinor) * BigInt(basisPoints), BigInt(10000));
    const collected = halfUp(exact);
    return { code, taxableMinor, basisPoints, exactAmount: serialized(exact), collectedMinor: collected.toString(), roundingDifference: serialized(subtract(ratio(collected), exact)), ruleId: '26_CFR_31_3102_1_D' };
}
