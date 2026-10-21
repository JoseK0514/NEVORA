import { it, expect } from 'vitest';
import references from './federal-employee-fixtures.test-support.json';
import { fica2026 } from './rules/pr-2026';
import { calculateNativePayroll } from './calculate';
import { input, entry } from './fixtures.test-support';
const codes = { socialSecurityMinor: 'SOCIAL_SECURITY', medicareMinor: 'MEDICARE', additionalMedicareMinor: 'ADDITIONAL_MEDICARE' } as const;

it.each(references.cases)('retains statutory collection and the independent exact fraction for $id', c => {
    const r = fica2026({ ...c, payday: '2026-10-16' });
    expect(r[c.field as keyof typeof codes]).toBe(c.expected);
    expect(r).toHaveProperty('employeeTaxOperations', expect.arrayContaining([expect.objectContaining({ code: codes[c.field as keyof typeof codes], collectedMinor: c.expected, ruleId: '26_CFR_31_3102_1_D' })]));
    const records = r.employeeTaxOperations;
    const record = records.find((v: { code: string }) => v.code === codes[c.field as keyof typeof codes]);
    if (!record) throw Error('Missing employee collection operation');
    const [numerator, denominator] = c.rawCents.split('/');
    expect(BigInt(record.exactAmount.numerator) * BigInt(denominator)).toBe(BigInt(numerator) * BigInt(record.exactAmount.denominator));
});

it('retains literal F08 employee collection separately for each check, including signed differences', () => {
    const request = { grossMinor: '199', socialSecurityWagesBeforeMinor: '0', medicareWagesBeforeMinor: '0', payday: '2026-10-16' };
    const r = fica2026(request);
    expect(r).toMatchObject({ socialSecurityMinor: '12', medicareMinor: '3', additionalMedicareMinor: '0', employeeTaxOperations: [
        { code: 'SOCIAL_SECURITY', taxableMinor: '199', basisPoints: 620, exactAmount: { numerator: '6169', denominator: '500' }, collectedMinor: '12', roundingDifference: { numerator: '-169', denominator: '500' } },
        { code: 'MEDICARE', taxableMinor: '199', basisPoints: 145, exactAmount: { numerator: '5771', denominator: '2000' }, collectedMinor: '3', roundingDifference: { numerator: '229', denominator: '2000' } },
        { code: 'ADDITIONAL_MEDICARE', taxableMinor: '0', basisPoints: 90, exactAmount: { numerator: '0', denominator: '1' }, collectedMinor: '0', roundingDifference: { numerator: '0', denominator: '1' } }
    ] });
    expect(fica2026(request)).toEqual(r);
    expect(BigInt(r.socialSecurityMinor) + BigInt(fica2026(request).socialSecurityMinor)).toBe(BigInt(24));
});
it.each([
    ['18449995','19990500','0','500','5'],
    ['18450000','19990000','0','0','0'],
    ['18460000','20000000','0','10000','90'],
] as const)('applies caps/threshold before employee collection at SS=%s and Medicare=%s', (ss, med, ssCollected, additionalBase, additionalCollected) => {
    const r = fica2026({ grossMinor:'10000',socialSecurityWagesBeforeMinor:ss,medicareWagesBeforeMinor:med,payday:'2026-10-16' });
    expect(r).toMatchObject({ socialSecurityMinor:ssCollected,additionalMedicareTaxableMinor:additionalBase,additionalMedicareMinor:additionalCollected });
    expect(r).toHaveProperty('employeeTaxOperations',expect.arrayContaining([expect.objectContaining({ code:'ADDITIONAL_MEDICARE',taxableMinor:additionalBase,collectedMinor:additionalCollected })]));
});
function cappedInput() {
    const i=input(); i.wages[0].hourlyRateMinor='2500'; i.wages[0].wageCentRounding='UNVERIFIED'; i.tax!.prCentRounding='UNVERIFIED'; i.tax!.ruleEvidenceReference=null;
    i.timecards[0].entries=[5,6,7,8,9].map(d=>entry('FE-'+d,`2026-10-0${d}T08:00:00-04:00`,`2026-10-0${d}T16:00:00-04:00`));
    i.ytd = {...i.ytd!,grossMinor:'19900500',netMinor:'19900500',socialSecurityWagesMinor:'18450000',medicareWagesMinor:'19900500',sinotWagesMinor:'900000',locationIds:['L1']};
    return i;
}
it('collects the employee Additional Medicare half-cent operation without an invented PR or wage election', () => {
    const i=cappedInput(); const r=calculateNativePayroll(i);
    expect(r).toMatchObject({state:'ready',row:{grossMinor:'100000',netMinor:'88580'},provenance:{rounding:'EXACT_CENT_NO_ROUNDING_REQUIRED',taxRounding:'EXACT_CENT_NO_ROUNDING_REQUIRED',federalEmployeeTax:{version:'NATIVE_FEDERAL_EMPLOYEE_COLLECTION_V1',ruleId:'26_CFR_31_3102_1_D',operations:expect.arrayContaining([expect.objectContaining({code:'ADDITIONAL_MEDICARE',taxableMinor:'500',exactAmount:{numerator:'9',denominator:'2'},collectedMinor:'5',roundingDifference:{numerator:'1',denominator:'2'}})])}}});
    expect(r).toMatchObject({breakdown:{taxes:expect.arrayContaining([expect.objectContaining({code:'ADDITIONAL_MEDICARE',amountMinor:'5',exactAmount:{numerator:'9',denominator:'2'}})])}});
    expect(calculateNativePayroll(i)).toEqual(r); expect(i.tax!.prCentRounding).toBe('UNVERIFIED');expect(i.wages[0].wageCentRounding).toBe('UNVERIFIED');
});
it('retains the employer federal exact-operation guard for the otherwise law-rounded F08 amounts', () => {
    const i=cappedInput();i.wages[0].hourlyRateMinor='1194';i.timecards[0].entries=[entry('F08','2026-10-05T08:00:00-04:00','2026-10-05T08:10:00-04:00')];i.ytd!.socialSecurityWagesMinor='0';i.ytd!.medicareWagesMinor='0';
    expect(calculateNativePayroll(i)).toMatchObject({state:'blocked',issues:[{code:'EMPLOYER_FICA_SOCIAL_SECURITY_CENT_RULE_UNVERIFIED'}]});
});
