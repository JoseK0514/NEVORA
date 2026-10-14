import { describe, expect, it } from 'vitest';
import vectors from './sr01-cent-vectors.test-support.json';
import { prIncomeWithholding } from './rules/pr-2026';
import { acceptsNativePrCentProfile, acceptsNativePrCentResult, PR_FINAL_PERIODIC_HALF_UP_GUIDANCE, usesAcceptedProfessionalPrCents } from './pr-income-cent-policy';
import { input } from './fixtures.test-support';

describe('independently derived SR01 final periodic HALF_UP', () => {
  it.each(vectors.vectors)('$id', vector => {
    const actual = prIncomeWithholding({ ...vector.input, rounding: 'HALF_UP' });
    expect(actual.amountMinor).toBe(vector.expectedCollectedMinor);
    expect(actual.rounding).toBe('HALF_UP');
    expect(BigInt(actual.exactTax.numerator) * BigInt(vector.finalExactMinor.denominator)).toBe(BigInt(vector.finalExactMinor.numerator) * BigInt(actual.exactTax.denominator));
    const residual = BigInt(actual.amountMinor) * BigInt(actual.exactTax.denominator) - BigInt(actual.exactTax.numerator);
    expect(residual * BigInt(vector.roundingDifferenceMinor.denominator)).toBe(BigInt(vector.roundingDifferenceMinor.numerator) * BigInt(actual.exactTax.denominator));
  });

  it.each(['2027-01-01', '2025-12-31', '2026-02-29', '2026-2-1', 'not-a-date'])('does not extend professional acceptance to %s', payday => {
    const tax = input().tax!; tax.prCentRounding = 'HALF_UP'; tax.ruleEvidenceReference = PR_FINAL_PERIODIC_HALF_UP_GUIDANCE.id;
    expect(usesAcceptedProfessionalPrCents(tax, payday)).toBe(false);
  });
  it('requires exact mode/reference/result identity and retains the unverified exact path', () => {
    const tax = input().tax!; tax.prCentRounding = 'HALF_UP'; tax.ruleEvidenceReference = PR_FINAL_PERIODIC_HALF_UP_GUIDANCE.id;
    expect(acceptsNativePrCentProfile(tax, '2026-10-05')).toBe(true);
    expect(acceptsNativePrCentResult('HALF_UP', tax, '2026-10-05')).toBe(true);
    expect(acceptsNativePrCentResult('TRUNCATE', tax, '2026-10-05')).toBe(false);
    expect(acceptsNativePrCentResult('EXACT_CENT_NO_ROUNDING_REQUIRED', tax, '2026-10-05')).toBe(false);
    tax.ruleEvidenceReference += ':unrecognized';
    expect(acceptsNativePrCentProfile(tax, '2026-10-05')).toBe(false);
    tax.prCentRounding = 'UNVERIFIED'; tax.ruleEvidenceReference = null;
    expect(acceptsNativePrCentResult('HALF_UP', tax, '2026-10-05')).toBe(false);
    expect(acceptsNativePrCentResult('EXACT_CENT_NO_ROUNDING_REQUIRED', tax, '2026-10-05')).toBe(true);
    expect(acceptsNativePrCentProfile(null, '2026-10-05')).toBe(false);
  });
});
