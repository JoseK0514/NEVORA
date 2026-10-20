import { it, expect } from 'vitest';
import { calculateNativePayroll } from './calculate';
import { parseYtd } from './model';
import type { NativePayrollInput } from './contracts';
import fixtures from './employer-counter-fixtures.test-support.json';
import { fictionalWorkweekPolicy } from './workweek-fixtures.test-support';
import { projectEmployerYtdCounters } from './obligations';
for (const fixture of fixtures.cases) {
    it(`retains literal independent employer-counter oracle ${fixture.id}`, () => {
        const input = structuredClone(fixture.input) as NativePayrollInput;
        // Original custodied inputs/oracles stay unchanged. The later consumer requires additional explicit fictional notice facts.
        input.wages.forEach(w => { w.workweekPolicy = fictionalWorkweekPolicy(input.employeeId); });
        const before = structuredClone(input);
        expect(parseYtd(input.ytd)).toEqual(input.ytd);
        const result = calculateNativePayroll(input);
        expect(result.state).toBe(fixture.expectation.state);
        expect(input).toEqual(before);
        if (result.state === 'ready') {
            const actual = {
                grossMinor: result.row.grossMinor, netMinor: result.row.netMinor,
                socialSecurityMinor: result.row.employeeDeductions.find(d => d.code === 'SOCIAL_SECURITY')?.amountMinor,
                medicareMinor: result.row.employeeDeductions.find(d => d.code === 'MEDICARE')?.amountMinor,
                additionalMedicareMinor: result.row.employeeDeductions.find(d => d.code === 'ADDITIONAL_MEDICARE')?.amountMinor,
                sinotEmployeeMinor: result.row.employeeDeductions.find(d => d.code === 'SINOT')?.amountMinor,
                futaEmployerMinor: result.row.employerContributions.find(d => d.code === 'FUTA')?.amountMinor,
                prUiEmployerMinor: result.row.employerContributions.find(d => d.code === 'PR_UI')?.amountMinor,
                cfseEmployerMinor: result.row.employerContributions.find(d => d.code === 'CFSE')?.amountMinor,
                ytdGrossAfterMinor: result.breakdown.ytdAfter.grossMinor, ytdNetAfterMinor: result.breakdown.ytdAfter.netMinor,
                ytdFutaAfterMinor: result.breakdown.ytdAfter.employerWagesMinor.FUTA,
                ytdPrUiAfterMinor: result.breakdown.ytdAfter.employerWagesMinor.PR_UI,
            };
            expect(actual).toMatchObject('fields' in fixture.expectation ? fixture.expectation.fields ?? {} : {});
        }
    });
}

it('validates the retained opening before advancing a consistent profile from immutable projected YTD', () => {
    const fixture = fixtures.cases.find(c => c.id === 'YP_ZERO_FUTA')!;
    const input = structuredClone(fixture.input) as NativePayrollInput;
    const projected = { ...input.ytd!, grossMinor: '100000', netMinor: '82085', employerWagesMinor: { ...input.ytd!.employerWagesMinor, FUTA: '100000' } };
    const result = projectEmployerYtdCounters(input.tax!, input.ytd!, projected);
    expect(result.employerContributions.find(c => c.code === 'FUTA')!.wagesBeforeMinor).toBe('100000');
    expect(input.tax!.employerContributions.find(c => c.code === 'FUTA')!.wagesBeforeMinor).toBe('0');
    input.tax!.employerContributions.find(c => c.code === 'FUTA')!.wagesBeforeMinor = '700000';
    expect(() => projectEmployerYtdCounters(input.tax!, input.ytd!, projected)).toThrow('EMPLOYER_YTD_BASE_CONFLICT');
});
it('requires an explicitly attested applicable-code counter, including zero', () => {
    const fixture = fixtures.cases.find(c => c.id === 'YP_ZERO_FUTA')!;
    const input = structuredClone(fixture.input) as NativePayrollInput;
    delete input.ytd!.employerWagesMinor.FUTA;
    expect(calculateNativePayroll(input)).toMatchObject({ state: 'blocked', issues: [{ code: 'EMPLOYER_YTD_BASE_REQUIRED' }] });
});
