import type { NativeBreakTreatment, NativeCompanyPayrollFacts, NativeEmployerProgramCode, NativePlainOpening, NativePlainPayFacts } from '@/lib/payroll/native/contracts';
import { dollarsToMinor } from './money';

/* Plain payroll setup (Oct 25 2026): the Owner types ordinary facts only. The
 * server records who saved them, when and a fingerprint; nothing here asks for an
 * evidence reference, attestation flag or SHA-256. */
const raw = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const list = (f: FormData, k: string) => f.getAll(k).map(v => String(v).trim());
function locations(f: FormData, key: string, required = true) { const v = list(f, key); if ((required && !v.length) || v.some(id => !id || id === '*') || new Set(v).size !== v.length) throw Error('Choose explicit payroll locations.'); return v; }
export function scopeFromForm(f: FormData) { const review = f.has('review'), approve = f.has('approve'); if (approve && !review) throw Error('Approval requires review permission.'); return { review, approve, locationIds: review ? locations(f, 'scopeLocations') : [] }; }

function amount(f: FormData, key: string, label: string, optional = false) {
  const v = raw(f, key).replace(/^\$/, '').replaceAll(',', '');
  if (!v && optional) return '0';
  try { return dollarsToMinor(v); } catch { throw Error(`Enter ${label} in dollars and cents, like 1250.00.`); }
}
function whole(f: FormData, key: string, label: string, max: number) {
  const v = raw(f, key) || '0';
  if (!/^\d+$/.test(v) || Number(v) > max) throw Error(`Enter ${label} as a whole number from 0 to ${max}.`);
  return Number(v);
}
/** Dollars per hour with up to six decimal places → cents with up to four decimal places. */
export function hourlyRateMinor(value: string) {
  const v = value.trim().replace(/^\$/, '');
  if (!/^(0|[1-9]\d*)(\.\d{1,6})?$/.test(v)) throw Error('Enter the hourly rate in dollars, like 12.50.');
  const [dollars, decimal = ''] = v.split('.'); const fraction = decimal.padEnd(6, '0');
  const cents = (BigInt(dollars) * BigInt(100) + BigInt(fraction.slice(0, 2))).toString(), sub = fraction.slice(2).replace(/0+$/, '');
  if (/^0$/.test(cents) && !sub) throw Error('Enter an hourly rate above zero.');
  return cents + (sub ? `.${sub}` : '');
}
/** Cents with optional fractional cents → "12.50" for the rate field. */
export function hourlyRateDollars(minor: string | undefined) {
  if (!minor) return '';
  const [whole, sub = ''] = minor.split('.'); const n = BigInt(whole);
  return `${n / BigInt(100)}.${(n % BigInt(100)).toString().padStart(2, '0')}${sub}`;
}
/** "0.6" percent → 60 basis points. */
function percent(f: FormData, key: string, label: string) {
  const v = raw(f, key).replace(/%$/, '').trim();
  let bp: string;
  try { bp = dollarsToMinor(v); } catch { throw Error(`Enter ${label} as a percent, like 3.4.`); }
  if (BigInt(bp) > BigInt(10000)) throw Error(`Enter ${label} as a percent from 0 to 100.`);
  return Number(bp);
}
export const percentText = (basisPoints: number | null | undefined) => basisPoints == null ? '' : `${Math.floor(basisPoints / 100)}${basisPoints % 100 ? `.${String(basisPoints % 100).padStart(2, '0').replace(/0$/, '')}` : ''}`;

export const PROGRAMS: { code: NativeEmployerProgramCode; label: string; help: string }[] = [
  { code: 'FUTA', label: 'Federal unemployment (FUTA)', help: 'Most employers pay 0.6% on the first $7,000 of each person’s pay.' },
  { code: 'PR_UI', label: 'Puerto Rico unemployment', help: 'Use the rate on your notice from the PR Department of Labor.' },
  { code: 'CFSE', label: 'State Insurance Fund (CFSE)', help: 'Use the rate on your CFSE policy.' },
];
export function companyDefaultsFromForm(f: FormData, breakTypeIds: string[]): NativeCompanyPayrollFacts {
  if (!f.has('workweekConfirmed')) throw Error('Confirm the workweek to continue.');
  return {
    workweek: 'STATUTORY_MONDAY_0001',
    employerPrograms: PROGRAMS.map(p => { const applies = raw(f, `program.${p.code}`) !== 'NO'; return { code: p.code, applies, basisPoints: applies ? percent(f, `program.${p.code}.rate`, `the ${p.label} rate`) : null }; }),
    breakPay: breakTypeIds.map(typeId => { const treatment = raw(f, `break.${typeId}`); if (treatment !== 'PAID_REST' && treatment !== 'UNPAID_RELIEVED_MEAL') throw Error('Choose how each break is paid.'); return { typeId, treatment: treatment as NativeBreakTreatment }; }),
    includeOwners: f.has('includeOwners'),
  };
}
export function payFromForm(f: FormData): NativePlainPayFacts {
  const startsOn = raw(f, 'rateStartsOn');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) throw Error('Enter the date this rate starts.');
  const personal = raw(f, 'personal');
  if (!['INDIVIDUAL_FULL', 'MARRIED_JOINT_FULL', 'MARRIED_HALF_OR_OPTIONAL_FULL', 'NONE'].includes(personal)) throw Error('Choose the filing status from Form 499R-4.');
  return {
    hourlyRateMinor: hourlyRateMinor(raw(f, 'hourlyRate')), rateStartsOn: startsOn,
    withholding: { personal: personal as NativePlainPayFacts['withholding']['personal'], fullDependents: whole(f, 'fullDependents', 'dependents', 99), halfDependents: whole(f, 'halfDependents', 'shared dependents', 99), deductionAllowances: whole(f, 'deductionAllowances', 'allowances for deductions', 1000), veteran: f.has('veteran'), extraWithholdingMinor: amount(f, 'extraWithholding', 'extra withholding', true) },
    mealReductionAgreement: f.has('mealReductionAgreement'),
  };
}
export function openingFromPlainForm(f: FormData): NativePlainOpening {
  if (raw(f, 'yearStart') !== 'MID_YEAR') return { kind: 'FRESH' };
  const a = (key: string, label: string, optional = false) => amount(f, key, label, optional);
  return {
    kind: 'MID_YEAR', grossMinor: a('ytdGross', 'gross pay so far'),
    withheld: { socialSecurityMinor: a('ytdSocialSecurity', 'Social Security withheld', true), medicareMinor: a('ytdMedicare', 'Medicare withheld', true), prIncomeTaxMinor: a('ytdIncomeTax', 'income tax withheld', true), sinotMinor: a('ytdSinot', 'SINOT withheld', true) },
    employerPaid: { socialSecurityMinor: a('ytdEmployerSocialSecurity', 'employer Social Security', true), medicareMinor: a('ytdEmployerMedicare', 'employer Medicare', true), sinotMinor: a('ytdEmployerSinot', 'employer SINOT', true), futaMinor: a('ytdFuta', 'FUTA paid', true), prUiMinor: a('ytdPrUi', 'PR unemployment paid', true), cfseMinor: a('ytdCfse', 'CFSE paid', true) },
  };
}
