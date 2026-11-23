import type { NativePayrollReady, NativeYtd } from '@/lib/payroll/native/contracts';
import { formatPayrollMoney, formatPayrollRate } from './money';
import { usePayrollCopy } from './payroll-copy';

function duration(value: string, sec: string) {
  const seconds = BigInt(value) / BigInt(1_000_000_000);
  return `${seconds / BigInt(3600)} h ${seconds % BigInt(3600) / BigInt(60)} min${seconds % BigInt(60) ? ` ${seconds % BigInt(60)} ${sec}` : ''}`;
}
function YtdRows({ before, after }: { before: NativeYtd; after: NativeYtd }) {
  const { native: { review: r }, lang } = usePayrollCopy();
  const taxLabels = r.taxLabels;
  const money = (minor: string) => formatPayrollMoney(minor, lang);
  const values = [
    [r.grossPay, before.grossMinor, after.grossMinor], [r.netPay, before.netMinor, after.netMinor],
    [r.ssWages, before.socialSecurityWagesMinor, after.socialSecurityWagesMinor], [r.medicareWages, before.medicareWagesMinor, after.medicareWagesMinor], [r.sinotWages, before.sinotWagesMinor, after.sinotWagesMinor],
    ...[...new Set([...Object.keys(before.deductions), ...Object.keys(after.deductions)])].map(code => [taxLabels[code] ?? code, before.deductions[code], after.deductions[code]]),
    ...[...new Set([...Object.keys(before.employerContributions), ...Object.keys(after.employerContributions)])].map(code => [r.employerPrefix(taxLabels[code] ?? code), before.employerContributions[code], after.employerContributions[code]]),
  ];
  return <div className="pw-ytd" role="table" aria-label={r.ytdLabel(after.year)}>
    <div className="pw-ytd-row pw-ytd-heading" role="row"><span role="columnheader">{r.ytd}</span><span role="columnheader">{r.before}</span><span role="columnheader">{r.after}</span></div>
    {values.map(([label, prior, next]) => <div className="pw-ytd-row" role="row" key={label}><span role="rowheader">{label}</span><span role="cell">{prior === undefined ? r.notSupplied : money(prior)}</span><span role="cell">{next === undefined ? r.notSupplied : money(next)}</span></div>)}
  </div>;
}

export function NativeReview({ result }: { result: NativePayrollReady }) {
  const { native: { review: r }, lang } = usePayrollCopy();
  const taxLabels = r.taxLabels, earningLabels = r.earningLabels;
  const money = (minor: string) => formatPayrollMoney(minor, lang);
  const span = (value: string) => duration(value, r.sec);
  const { breakdown: b, provenance: p } = result;
  return <div className="pw-native-review">
    <dl className="pw-lines pw-time-breakdown"><div><dt>{r.regularTime}</dt><dd>{span(b.regularNanoseconds)}</dd></div><div><dt>{r.overtime}</dt><dd>{span(b.overtimeNanoseconds)}</dd></div><div><dt>{r.unpaidBreaks}</dt><dd>{span(b.unpaidBreakNanoseconds)}</dd></div></dl>
    <h4>{r.earningsTitle}</h4>
    <div className="pw-native-earnings">{b.earnings.map((line, index) => <div key={index}><div><strong>{earningLabels[line.kind]}</strong><p>{span(line.nanoseconds)} · {r.baseWage} {formatPayrollRate(line.rateMinorPerHour)}/h</p><small>{r.locationReference} <code>{line.locationId}</code> · {r.wageRevision} {line.wageRevision}</small></div><strong className="pw-money">{money(line.amountMinor)}</strong></div>)}</div>
    <h4>{r.taxesTitle}</h4>
    <div className="pw-tax-list">{b.taxes.map((tax, index) => <div key={index}><span><strong>{taxLabels[tax.code] ?? tax.code}</strong><small>{r.taxablePay} {money(tax.taxableMinor)}</small></span><strong className="pw-money">{money(tax.amountMinor)}</strong></div>)}</div>
    <YtdRows before={b.ytdBefore} after={b.ytdAfter} />
    <details className="pw-source-details"><summary>{r.sourceDetails}</summary><dl className="pw-lines"><div><dt>{r.inputReference}</dt><dd><code>{p.inputSha256}</code></dd></div><div><dt>{r.rulesReference}</dt><dd><code>{p.rulesSha256}</code></dd></div><div><dt>{r.ruleset}</dt><dd><code>{p.rulesetId}</code></dd></div><div><dt>{r.wageRounding}</dt><dd><code>{p.rounding}</code></dd></div><div><dt>{r.prWithholding}</dt><dd><code>{p.taxRounding}</code></dd></div></dl>
      {p.calculationPolicy && <section><h4>{r.provisionalTitle}</h4><p className="pw-small">{r.provisionalLine}</p><dl className="pw-lines"><div><dt>{r.policyReference}</dt><dd><code>{p.calculationPolicy.id}</code></dd></div><div><dt>{r.savedPolicyRecord}</dt><dd><code>{p.calculationPolicy.sha256}</code></dd></div></dl></section>}
      {p.federalEmployeeTax && <section><h4>{r.federalTitle}</h4><p className="pw-small">{r.federalLine}</p><div className="pw-tax-list">{p.federalEmployeeTax.operations.map(tax => <div key={tax.code}><span><strong>{taxLabels[tax.code]}</strong><small>{r.taxablePay} {money(tax.taxableMinor)} · {r.rate} {tax.basisPoints} {r.basisPoints}</small><small>{r.exactCents} <code>{tax.exactAmount.numerator} / {tax.exactAmount.denominator}</code> · {r.roundedMinusExact} <code>{tax.roundingDifference.numerator} / {tax.roundingDifference.denominator}</code> {r.cents}</small></span><strong className="pw-money">{money(tax.collectedMinor)}</strong></div>)}</div><p className="pw-small">{r.calculationRule} <code>{p.federalEmployeeTax.ruleId}</code>. {r.otherRules}</p></section>}
      {p.boundaryEvidence && <section><h4>{r.workweekTitle}</h4><p className="pw-small">{r.savedBoundary} {r.weekdays[p.boundaryEvidence.workweekPolicy.boundary.weekday]} {p.boundaryEvidence.workweekPolicy.boundary.startTime} · America/Puerto_Rico · {r.policyRevision} {p.boundaryEvidence.workweekPolicy.revision}</p><dl className="pw-lines"><div><dt>{r.policySource}</dt><dd>{p.boundaryEvidence.workweekPolicy.origin.kind === 'STATUTORY_DEFAULT' ? r.absenceSource : r.noticeSource}</dd></div><div><dt>{r.federalEvidence}</dt><dd>{p.boundaryEvidence.workweekPolicy.federalEvidenceReference}</dd></div><div><dt>{r.recordedContext}</dt><dd>{p.boundaryEvidence.sourceWindow.startAt} → {p.boundaryEvidence.sourceWindow.endAt}</dd></div><div><dt>{r.fullContext}</dt><dd>{p.boundaryEvidence.fullWeekWindow.startAt} → {p.boundaryEvidence.fullWeekWindow.endAt}</dd></div><div><dt>{r.dailyInterpretation}</dt><dd><code>{p.boundaryEvidence.dailyInterpretation}</code></dd></div><div><dt>{r.dailyAssessment}</dt><dd><code>{p.boundaryEvidence.dailyInputDisposition}</code></dd></div></dl><p className="pw-small">{p.boundaryEvidence.dailyInterpretation === 'OWNER_AUTHORIZED_SHIFT_START_DAY' ? r.shiftStartDay : p.calculationPolicy ? r.civilDays : r.unresolved}</p></section>}
      <p className="pw-small">{r.savedResults}</p></details>
  </div>;
}
