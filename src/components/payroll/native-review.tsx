import type { NativePayrollReady, NativeYtd } from '@/lib/payroll/native/contracts';
import { formatPayrollMoney, formatPayrollRate } from './money';

const taxLabels: Record<string, string> = { PR_INCOME_TAX: 'Puerto Rico income tax', SOCIAL_SECURITY: 'Social Security', MEDICARE: 'Medicare', ADDITIONAL_MEDICARE: 'Additional Medicare', SINOT: 'SINOT' };
const earningLabels = { REGULAR: 'Regular pay', OVERTIME: 'Overtime pay', FLSA_TRUE_UP: 'Overtime adjustment' };
function duration(value: string) {
  const seconds = BigInt(value) / BigInt(1_000_000_000);
  return `${seconds / BigInt(3600)} h ${seconds % BigInt(3600) / BigInt(60)} min${seconds % BigInt(60) ? ` ${seconds % BigInt(60)} sec` : ''}`;
}
function YtdRows({ before, after }: { before: NativeYtd; after: NativeYtd }) {
  const values = [
    ['Gross pay', before.grossMinor, after.grossMinor], ['Net pay', before.netMinor, after.netMinor],
    ['Social Security wages', before.socialSecurityWagesMinor, after.socialSecurityWagesMinor], ['Medicare wages', before.medicareWagesMinor, after.medicareWagesMinor], ['SINOT wages', before.sinotWagesMinor, after.sinotWagesMinor],
    ...[...new Set([...Object.keys(before.deductions), ...Object.keys(after.deductions)])].map(code => [taxLabels[code] ?? code, before.deductions[code], after.deductions[code]]),
    ...[...new Set([...Object.keys(before.employerContributions), ...Object.keys(after.employerContributions)])].map(code => [`Employer · ${taxLabels[code] ?? code}`, before.employerContributions[code], after.employerContributions[code]]),
  ];
  return <div className="pw-ytd" role="table" aria-label={`Year to date ${after.year}`}>
    <div className="pw-ytd-row pw-ytd-heading" role="row"><span role="columnheader">Year to date</span><span role="columnheader">Before</span><span role="columnheader">After</span></div>
    {values.map(([label, prior, next]) => <div className="pw-ytd-row" role="row" key={label}><span role="rowheader">{label}</span><span role="cell">{prior === undefined ? 'Not supplied' : formatPayrollMoney(prior)}</span><span role="cell">{next === undefined ? 'Not supplied' : formatPayrollMoney(next)}</span></div>)}
  </div>;
}

export function NativeReview({ result }: { result: NativePayrollReady }) {
  const { breakdown: b, provenance: p } = result;
  return <div className="pw-native-review">
    <dl className="pw-lines pw-time-breakdown"><div><dt>Regular time</dt><dd>{duration(b.regularNanoseconds)}</dd></div><div><dt>Overtime</dt><dd>{duration(b.overtimeNanoseconds)}</dd></div><div><dt>Unpaid breaks</dt><dd>{duration(b.unpaidBreakNanoseconds)}</dd></div></dl>
    <h4>Earnings from recorded time</h4>
    <div className="pw-native-earnings">{b.earnings.map((line, index) => <div key={index}><div><strong>{earningLabels[line.kind]}</strong><p>{duration(line.nanoseconds)} · Base wage {formatPayrollRate(line.rateMinorPerHour)}/h</p><small>Location reference <code>{line.locationId}</code> · Wage revision {line.wageRevision}</small></div><strong className="pw-money">{formatPayrollMoney(line.amountMinor)}</strong></div>)}</div>
    <h4>Taxes &amp; deductions</h4>
    <div className="pw-tax-list">{b.taxes.map((tax, index) => <div key={index}><span><strong>{taxLabels[tax.code] ?? tax.code}</strong><small>Taxable pay {formatPayrollMoney(tax.taxableMinor)}</small></span><strong className="pw-money">{formatPayrollMoney(tax.amountMinor)}</strong></div>)}</div>
    <YtdRows before={b.ytdBefore} after={b.ytdAfter} />
    <details className="pw-source-details"><summary>Source and calculation details</summary><dl className="pw-lines"><div><dt>Input reference</dt><dd><code>{p.inputSha256}</code></dd></div><div><dt>Rules reference</dt><dd><code>{p.rulesSha256}</code></dd></div><div><dt>Ruleset</dt><dd><code>{p.rulesetId}</code></dd></div><div><dt>Wage rounding</dt><dd><code>{p.rounding}</code></dd></div><div><dt>Puerto Rico withholding</dt><dd><code>{p.taxRounding}</code></dd></div></dl>
      {p.federalEmployeeTax && <section><h4>Federal employee tax collection</h4><p className="pw-small">Saved nearest-cent employee collection for Social Security, Medicare and Additional Medicare. This does not confirm payment or remittance.</p><div className="pw-tax-list">{p.federalEmployeeTax.operations.map(tax => <div key={tax.code}><span><strong>{taxLabels[tax.code]}</strong><small>Taxable pay {formatPayrollMoney(tax.taxableMinor)} · Rate {tax.basisPoints} basis points</small><small>Exact cents <code>{tax.exactAmount.numerator} / {tax.exactAmount.denominator}</code> · Collected minus exact <code>{tax.roundingDifference.numerator} / {tax.roundingDifference.denominator}</code> cents</small></span><strong className="pw-money">{formatPayrollMoney(tax.collectedMinor)}</strong></div>)}</div><p className="pw-small">Collection rule <code>{p.federalEmployeeTax.ruleId}</code>. Other withholding, wage and contribution rules retain their separate evidence.</p></section>}
      {p.boundaryEvidence && <section><h4>Workweek evidence</h4><p className="pw-small">Saved weekly boundary: {['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][p.boundaryEvidence.workweekPolicy.boundary.weekday]} {p.boundaryEvidence.workweekPolicy.boundary.startTime} · America/Puerto_Rico · Policy revision {p.boundaryEvidence.workweekPolicy.revision}</p><dl className="pw-lines"><div><dt>Policy source</dt><dd>{p.boundaryEvidence.workweekPolicy.origin.kind === 'STATUTORY_DEFAULT' ? 'Documented absence of employer notice' : 'Documented employer notice'}</dd></div><div><dt>Federal week evidence</dt><dd>{p.boundaryEvidence.workweekPolicy.federalEvidenceReference}</dd></div><div><dt>Recorded context</dt><dd>{p.boundaryEvidence.sourceWindow.startAt} → {p.boundaryEvidence.sourceWindow.endAt}</dd></div><div><dt>Full weekly context</dt><dd>{p.boundaryEvidence.fullWeekWindow.startAt} → {p.boundaryEvidence.fullWeekWindow.endAt}</dd></div><div><dt>Daily interpretation</dt><dd><code>{p.boundaryEvidence.dailyInterpretation}</code></dd></div><div><dt>Daily input assessment</dt><dd><code>{p.boundaryEvidence.dailyInputDisposition}</code></dd></div></dl><p className="pw-small">Daily precision remains unresolved. This saved source has no entries intersecting 00:00–00:01, and is invariant under the two retained daily models. A weekly policy does not certify a daily rule.</p></section>}
      <p className="pw-small">These are the saved calculation results for this revision. Approval checks current recorded time and payroll facts again.</p></details>
  </div>;
}
