import { createHash } from 'node:crypto';
import { Temporal } from '@js-temporal/polyfill';
import { stableExportJson } from '../../payroll-export/json';
import type { NativePayrollReady, NativeTaxProfile } from './contracts';

/** Scoped owner-attested professional direction, not a retrieved CPA document or universal mandate. */
export const PR_FINAL_PERIODIC_HALF_UP_GUIDANCE = Object.freeze({
  id: 'OWNER_ATTESTED_ACCOUNTANT_PR_2026_FINAL_PERIODIC_HALF_UP_20261014',
  kind: 'OWNER_ATTESTED_ACCOUNTANT_GUIDANCE' as const,
  taxYear: 2026,
  coverage: 'PR_REGULAR_TAXABLE_RESIDENT',
  method: 'HALF_UP',
  stage: 'FINAL_PERIODIC_WITHHOLDING',
  scope: 'Existing standard recurring percentage-table withholding; separately supported certificate facts required',
  date: '2026-10-14',
  ownerThreadId: '01a132e3-c924-7ec3-bcdc-61eaa1f96bd3',
  methodMessageId: '01a13b33-1e6f-7b33-9bd5-e0c3452ef4bf',
  originMessageId: '01a13b33-c7ac-7f40-8338-fc79c2cb0010',
  personallyRetrievedProfessionalDocument: false,
  universalStatutoryMandateClaimed: false,
});
export const PR_FINAL_PERIODIC_GUIDANCE_SHA256 = createHash('sha256').update(stableExportJson(PR_FINAL_PERIODIC_HALF_UP_GUIDANCE)).digest('hex');

export function usesAcceptedProfessionalPrCents(tax: NativeTaxProfile | null | undefined, payday: string): boolean {
  if (tax?.prCentRounding !== 'HALF_UP' || tax.coverage !== PR_FINAL_PERIODIC_HALF_UP_GUIDANCE.coverage || tax.ruleEvidenceReference !== PR_FINAL_PERIODIC_HALF_UP_GUIDANCE.id)
    return false;
  try {
    const date = Temporal.PlainDate.from(payday, { overflow: 'reject' });
    return date.toString() === payday && date.year === PR_FINAL_PERIODIC_HALF_UP_GUIDANCE.taxYear;
  } catch {
    return false;
  }
}

export function acceptsNativePrCentProfile(tax: NativeTaxProfile | null, payday: string): boolean {
  return tax?.prCentRounding === 'UNVERIFIED' || usesAcceptedProfessionalPrCents(tax, payday);
}

export function acceptsNativePrCentResult(rounding: NativePayrollReady['provenance']['taxRounding'], tax: NativeTaxProfile | null | undefined, payday: string): boolean {
  return tax?.prCentRounding === 'UNVERIFIED'
    ? rounding === 'EXACT_CENT_NO_ROUNDING_REQUIRED'
    : rounding === 'HALF_UP' && usesAcceptedProfessionalPrCents(tax, payday);
}
