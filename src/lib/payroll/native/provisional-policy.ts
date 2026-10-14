import { createHash } from 'node:crypto';
import { stableExportJson } from '../../payroll-export/json';
import type { NativePayrollInput } from './contracts';
import { usesAcceptedProfessionalPrCents } from './pr-income-cent-policy';
import { add, halfUp, ratio, serialized, subtract, type Rational } from './money';

/** Owner waiver of calculation-policy dependencies; no statutory/actual-fact certification. */
export const OWNER_PAYROLL_POLICY = Object.freeze({
  id: 'OWNER_AUTHORIZED_PROVISIONAL_PR_STANDARD_2026_20261014',
  kind: 'OWNER_AUTHORIZED_PROVISIONAL_POLICY' as const,
  taxYear: 2026,
  jurisdiction: 'PR',
  coverage: 'Existing standard hourly PR private nonexempt resident/FICA/SINOT scope with separately supported facts',
  ownerThreadId: '01a132e3-c924-7ec3-bcdc-61eaa1f96bd3',
  ownerMessageId: '01a13b8e-c5ec-75c1-9d5b-8f19f302a37f',
  wages: 'Exact paid earning groups including weighted full-week overtime/true-up; HALF_UP paycheck total once; floor groups then largest remainders, binary key ties',
  employerFica: 'Separate SS/Medicare exact accruals; per-payment HALF_UP cash; retain signed residuals for period reconciliation; no employer Additional Medicare',
  sinot: 'Cap taxable wages at900000 before exact rates; HALF_UP combined60bp and employee0..30bp; employer receives combined cash minus employee cash',
  employerAssessments: 'Program-specific attested rate and wage basis/cap; FUTA/PR_UI700000 annual base; per-payment HALF_UP accrual; no inferred credit/classification/agency return',
  deductions: 'Separately authorized exact percentage/fixed amount; clamp to nonnegative remaining signed cap; HALF_UP once; retain employer-match and negative-net guards',
  daily: 'Civil midnight half-open24h days; seventh and later consecutive worked civil days premium until full civil day off; separate evidenced168h weekly boundary',
  reconciliation: 'Retain exact amount, recorded cash and signed cash-minus-exact difference; no hidden carry or retroactive approved cash changes',
  reviewTrigger: 'Expiry after2026; official requirement contradicts choice; independent defect; changed scope/actual facts',
});
export const OWNER_PAYROLL_POLICY_SHA256 = createHash('sha256').update(stableExportJson(OWNER_PAYROLL_POLICY)).digest('hex');
export type NativePolicyOperation = {
  operation: string;
  reference: string | null;
  stage: 'HALF_UP' | 'LARGEST_REMAINDER_ALLOCATION' | 'COMBINED_SHARE_RESIDUAL' | 'CAP_THEN_HALF_UP';
  exactAmount: { numerator: string; denominator: string };
  amountMinor: string;
  differenceMinor: { numerator: string; denominator: string };
  uncappedExactAmount?: { numerator: string; denominator: string };
};
export type NativeCalculationPolicyEvidence = {
  id: string;
  sha256: string;
  kind: 'OWNER_AUTHORIZED_PROVISIONAL_POLICY';
  operations: NativePolicyOperation[];
};

export function usesOwnerPayrollPolicy(input: Pick<NativePayrollInput, 'calculationPolicyReference' | 'tax' | 'wages' | 'payday'>): boolean {
  if (input.calculationPolicyReference === undefined || input.calculationPolicyReference === null) return false;
  if (input.calculationPolicyReference !== OWNER_PAYROLL_POLICY.id || !usesAcceptedProfessionalPrCents(input.tax, input.payday) ||
      !Array.isArray(input.wages) || !input.wages.length || input.wages.some(w => w.wageCentRounding !== 'UNVERIFIED'))
    throw Error('OWNER_CALCULATION_POLICY_REQUIRED');
  return true;
}

export function recordPolicyAmount(exact: Rational, cash: bigint, operations: NativePolicyOperation[], operation: string, reference: string | null, stage: NativePolicyOperation['stage'], uncapped?: Rational): bigint {
  if (exact.numerator < BigInt(0) || cash < BigInt(0)) throw Error('INVALID_NATIVE_MONEY');
  if (operations.length >= 20000) throw Error('POLICY_EVIDENCE_LIMIT');
  operations.push({ operation, reference, stage, exactAmount: serialized(exact), amountMinor: cash.toString(), differenceMinor: serialized(subtract(ratio(cash), exact)), ...(uncapped ? { uncappedExactAmount: serialized(uncapped) } : {}) });
  return cash;
}
export function collectPolicyAmount(exact: Rational, operations: NativePolicyOperation[], operation: string, reference: string | null = null): bigint {
  return recordPolicyAmount(exact, halfUp(exact), operations, operation, reference, 'HALF_UP');
}

/** Sum once, then allocate that cash; entry/group count cannot inflate the paycheck. */
export function allocatePolicyEarnings(groups: { key: string; amount: Rational }[], operations: NativePolicyOperation[]): bigint[] {
  if (groups.length > 100) throw Error('NATIVE_EARNINGS_LIMIT');
  const exact = groups.reduce((sum, g) => add(sum, g.amount), ratio(BigInt(0)));
  const total = collectPolicyAmount(exact, operations, 'WAGE_PAYCHECK');
  const cash = groups.map(g => {
    if (g.amount.numerator < BigInt(0)) throw Error('INVALID_NATIVE_MONEY');
    return g.amount.numerator / g.amount.denominator;
  });
  const ranks = groups.map((g, index) => ({ index, key: g.key, remainder: ratio(g.amount.numerator % g.amount.denominator, g.amount.denominator) })).sort((a, b) => {
    const difference = a.remainder.numerator * b.remainder.denominator - b.remainder.numerator * a.remainder.denominator;
    return difference === BigInt(0) ? (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) : difference > BigInt(0) ? -1 : 1;
  });
  const left = total - cash.reduce((sum, n) => sum + n, BigInt(0));
  if (left < BigInt(0) || left > BigInt(groups.length)) throw Error('INVALID_NATIVE_MONEY');
  for (let n = 0; n < Number(left); n++) cash[ranks[n].index] += BigInt(1);
  groups.forEach((g, index) => recordPolicyAmount(g.amount, cash[index], operations, 'WAGE_ALLOCATION', g.key, 'LARGEST_REMAINDER_ALLOCATION'));
  return cash;
}
