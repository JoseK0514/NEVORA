'use client';
import { useState, type FormEvent, type ReactNode } from 'react';
import { CaretRightIcon, WarningCircleIcon } from '@phosphor-icons/react/ssr';
import type { PayrollSettingsResponse } from '@/lib/payroll/contracts';
import type { NativeCompanyPayrollFacts, NativePlainOpening, NativeProfilesResponse, NativeSetupRecord } from '@/lib/payroll/native/contracts';
import { readRuns } from './api';
import { readNativeProfiles } from './native-profile-api';
import { usePayrollOperation, usePayrollResource } from './use-payroll';
import { OperationFeedback } from './payroll-ui';
import { NativeScopeForm } from './native-opening-scope';
import { PROGRAMS, companyDefaultsFromForm, hourlyRateDollars, openingFromPlainForm, payFromForm, percentText } from './native-profile-form';
import { minorToDollars } from './money';
import { PendingLabel } from '../employee-submit-button';
import '../quiet/ps.css';

export type NativeConfigurationSources = { employees: { id: string; name: string; role: string; active: boolean }[]; locations: { id: string; name: string; active: boolean }[]; breakTypes: { id: string; name: string; active: boolean; category?: string }[] };
type Record = NativeSetupRecord & { verified?: boolean };
type PlainPayRecordFacts = { entered: { hourlyRateMinor: string; rateStartsOn: string; mealReductionAgreement?: boolean; withholding: { personal: string; fullDependents: number; halfDependents: number; deductionAllowances: number; veteran: boolean; extraWithholdingMinor: string } } };
type Operation = ReturnType<typeof usePayrollOperation>;

const ZONE = 'America/Puerto_Rico';
function prToday(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
const usd = (minor: string | undefined) => minor ? minorToDollars(minor) : '';
const FILING: [string, string][] = [['INDIVIDUAL_FULL', 'Individual'], ['MARRIED_JOINT_FULL', 'Married, filing jointly'], ['MARRIED_HALF_OR_OPTIONAL_FULL', 'Married, claiming half (or optional full)'], ['NONE', 'No personal exemption']];

/** Quiet (v4) row that opens its contents in place, like the rest of Payroll settings. */
function Row({ title, value, children, id }: { title: string; value?: string; children: ReactNode; id?: string }) {
  return <details className="q-details q-rule" id={id}><summary className="q-row q-row--one"><span className="q-rt"><b>{title}</b></span>{value ? <span className="q-rv q-rv--l">{value}</span> : null}<CaretRightIcon className="q-chev" aria-hidden="true" /></summary><div className="q-rule__body wb-form">{children}</div></details>;
}
function Problem({ text }: { text: string }) { return text ? <p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden /><span>{text}</span></p> : null; }

/** The server's recorded evidence, read-only. Nothing here is typed by the Owner. */
export function AuditDetails({ records }: { records: Record[] }) {
  if (!records.length) return null;
  return <details className="q-details q-rule q-ps-audit"><summary className="q-row q-row--one"><span className="q-rt"><b>Audit details</b></span><CaretRightIcon className="q-chev" aria-hidden="true" /></summary>
    <div className="q-rule__body">{records.map(r => <dl key={`${r.kind}:${r.taxYear}:${r.revision}`} className="q-ps-dl">
      <div><dt>{r.kind === 'COMPANY_DEFAULTS' ? 'Company defaults' : r.kind === 'OPENING_TOTALS' ? `Year-to-date totals, ${r.taxYear}` : 'Pay setup'}</dt><dd>{r.statement}</dd></div>
      <div><dt>What saving confirmed</dt><dd>{r.attestation}</dd></div>
      <div><dt>Revision</dt><dd>{r.revision}</dd></div>
      <div><dt>Form version</dt><dd>{r.formVersion}</dd></div>
      <div><dt>Fingerprint (SHA-256)</dt><dd className="q-ps-mono">{r.factsSha256}</dd></div>
      {r.verified !== undefined && <div><dt>Check</dt><dd className={r.verified ? undefined : 'q-u4-late'}>{r.verified ? 'Matches the saved details' : 'Doesn’t match the saved details'}</dd></div>}
      <div><dt>Reference</dt><dd className="q-ps-mono">{r.reference}</dd></div>
    </dl>)}</div></details>;
}

function CompanyDefaultsForm({ record, sources, operation }: { record: Record | null; sources: NativeConfigurationSources; operation: Operation }) {
  const facts = record?.facts as NativeCompanyPayrollFacts | undefined;
  const [error, setError] = useState('');
  const [applies, setApplies] = useState<{ [code: string]: boolean }>(() => Object.fromEntries(PROGRAMS.map(p => [p.code, facts?.employerPrograms.find(x => x.code === p.code)?.applies ?? true])));
  const types = sources.breakTypes;
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    try { void operation.submit({ action: 'SAVE_COMPANY_PAYROLL_DEFAULTS', expectedRevision: record?.revision ?? 0, defaults: companyDefaultsFromForm(new FormData(event.currentTarget), types.map(t => t.id)) }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Check the company defaults.'); }
  };
  const treatment = (id: string, category?: string) => facts?.breakPay.find(b => b.typeId === id)?.treatment ?? (category === 'MEAL' ? 'UNPAID_RELIEVED_MEAL' : 'PAID_REST');
  return <form className="q-ps-form" noValidate onSubmit={save} aria-label="Company payroll defaults"><fieldset disabled={operation.locked} className="q-pset-fields wb-form">
    <h3 className="q-ps-h">Workweek</h3>
    <p className="wb-note">Puerto Rico law starts the workweek on Monday at 12:01 AM. Every employee uses it.</p>
    <label className="wb-check"><input type="checkbox" name="workweekConfirmed" defaultChecked={!!facts} required /><span>We haven’t told employees about a different workweek</span></label>
    <h3 className="q-ps-h">Employer taxes</h3>
    {PROGRAMS.map(p => { const saved = facts?.employerPrograms.find(x => x.code === p.code); return <div key={p.code} className="q-ps-pair">
      <label>{p.label}<select name={`program.${p.code}`} defaultValue={saved && !saved.applies ? 'NO' : 'YES'} onChange={e => setApplies(a => ({ ...a, [p.code]: e.target.value !== 'NO' }))}><option value="YES">Applies</option><option value="NO">Doesn’t apply</option></select></label>
      {applies[p.code] && <label>Rate (%)<input name={`program.${p.code}.rate`} inputMode="decimal" defaultValue={saved?.applies ? percentText(saved.basisPoints) : p.code === 'FUTA' ? '0.6' : ''} required aria-describedby={`help-${p.code}`} /></label>}
      <p className="wb-note" id={`help-${p.code}`}>{p.help}</p>
    </div>; })}
    <h3 className="q-ps-h">Break pay</h3>
    {types.length ? types.map(t => <label key={t.id}>{t.name}{t.active ? '' : ' (no longer used)'}<select name={`break.${t.id}`} defaultValue={treatment(t.id, t.category)}><option value="PAID_REST">Paid</option><option value="UNPAID_RELIEVED_MEAL">Unpaid meal, free of duties</option></select></label>)
      : <p className="wb-note">No break types yet. Add them in Settings, Break types.</p>}
    <h3 className="q-ps-h">Owners</h3>
    <label className="wb-check"><input type="checkbox" name="includeOwners" defaultChecked={facts?.includeOwners ?? false} /><span>Pay Owners through payroll</span></label>
    <p className="wb-note">Leave this off if Owners are paid another way.</p>
    <Problem text={error} />
    <button type="submit" className="q-btn" aria-disabled={operation.locked}><PendingLabel pending={operation.busy} pendingText="Saving…">Save company defaults</PendingLabel></button>
    <p className="wb-note">NEVORA records who saved this and when. Every employee’s pay setup uses these defaults.</p>
  </fieldset></form>;
}

function PayForm({ employeeId, data, company, frozen, operation, year }: { employeeId: string; data: NativeProfilesResponse; company: Record | null; frozen: boolean; operation: Operation; year: number }) {
  const records = (data.setup?.records ?? []) as Record[];
  const payRecord = records.find(r => r.kind === 'EMPLOYEE_PAY' && r.subjectId === employeeId) ?? null;
  const openingRecord = records.find(r => r.kind === 'OPENING_TOTALS' && r.subjectId === employeeId && r.taxYear === year) ?? null;
  const configuration = data.configurations.find(c => c.employeeId === employeeId) ?? null;
  const opening = data.openingYtd.find(o => o.employeeId === employeeId && o.ytd.year === year)?.ytd ?? null;
  const entered = payRecord?.formVersion === 'NEVORA_PLAIN_PAYROLL_SETUP_V1' ? (payRecord.facts as PlainPayRecordFacts).entered : null;
  const currentWage = configuration?.wages.at(-1);
  const w = entered?.withholding ?? (configuration?.tax ? { ...configuration.tax.certificate, extraWithholdingMinor: configuration.tax.certificate.additionalMinor ?? '0' } : null);
  const savedOpening = openingRecord?.formVersion === 'NEVORA_PLAIN_PAYROLL_SETUP_V1' ? openingRecord.facts as NativePlainOpening : null;
  const [mode, setMode] = useState(savedOpening?.kind === 'MID_YEAR' || (opening && opening.grossMinor !== '0') ? 'MID_YEAR' : 'FRESH');
  const [error, setError] = useState('');
  const mid = savedOpening?.kind === 'MID_YEAR' ? savedOpening : null;
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    try {
      const f = new FormData(event.currentTarget), pay = payFromForm(f);
      let next: { taxYear: number; expectedRevision: number; totals: NativePlainOpening } | null = null;
      if (!frozen) { const totals = openingFromPlainForm(f); if (!opening || JSON.stringify(totals) !== JSON.stringify(savedOpening)) next = { taxYear: year, expectedRevision: opening?.revision ?? 0, totals }; }
      void operation.submit({ action: 'SAVE_EMPLOYEE_PAY_SETUP', expectedRevision: configuration?.revision ?? 0, employeeId, pay, opening: next });
    } catch (e) { setError(e instanceof Error ? e.message : 'Check the pay setup.'); }
  };
  const amount = (name: string, label: string, value: string | undefined, help?: string) => <label>{label}<input name={name} inputMode="decimal" defaultValue={usd(value)} placeholder="0.00" aria-describedby={help ? `${employeeId}-${name}-help` : undefined} />{help && <small className="wb-note" id={`${employeeId}-${name}-help`}>{help}</small>}</label>;
  return <form className="q-ps-form" noValidate onSubmit={save} aria-label="Pay setup"><fieldset disabled={operation.locked || !company} className="q-pset-fields wb-form">
    {!company && <p className="wb-note">Save the company defaults above first.</p>}
    <label>Hourly rate ($)<input name="hourlyRate" inputMode="decimal" required defaultValue={hourlyRateDollars(entered?.hourlyRateMinor ?? currentWage?.hourlyRateMinor)} placeholder="10.50" aria-describedby={`${employeeId}-rate-help`} /><small className="wb-note" id={`${employeeId}-rate-help`}>At least $10.50, the Puerto Rico minimum wage.</small></label>
    <label>Rate starts<input type="date" name="rateStartsOn" required defaultValue={entered?.rateStartsOn ?? `${year}-01-01`} /></label>
    <h3 className="q-ps-h">Withholding (Form 499R-4)</h3>
    <label>Filing status<select name="personal" required defaultValue={w?.personal ?? 'INDIVIDUAL_FULL'}>{FILING.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    <label>Dependents<input name="fullDependents" inputMode="numeric" defaultValue={String(w?.fullDependents ?? 0)} /></label>
    <label>Dependents with shared custody<input name="halfDependents" inputMode="numeric" defaultValue={String(w?.halfDependents ?? 0)} /></label>
    <label>Allowances for deductions<input name="deductionAllowances" inputMode="numeric" defaultValue={String(w?.deductionAllowances ?? 0)} /></label>
    <label className="wb-check"><input type="checkbox" name="veteran" defaultChecked={w?.veteran ?? false} /><span>Veteran exemption</span></label>
    {amount('extraWithholding', 'Extra withholding per paycheck ($)', w && w.extraWithholdingMinor !== '0' ? w.extraWithholdingMinor : undefined, 'Optional. Only if the employee asked for it on the form.')}
    <h3 className="q-ps-h">Meals</h3>
    <label className="wb-check"><input type="checkbox" name="mealReductionAgreement" defaultChecked={entered?.mealReductionAgreement ?? currentWage?.mealReductionAgreement ?? false} aria-describedby={`${employeeId}-meal-help`} /><span>Written agreement for a 30-minute meal</span></label>
    <p className="wb-note" id={`${employeeId}-meal-help`}>Only if you and this employee signed one.</p>
    <h3 className="q-ps-h">This year before NEVORA</h3>
    {frozen ? <p className="wb-note">Year-to-date totals are locked because payroll for {year} was approved.</p> : <>
      <label className="wb-check"><input type="radio" name="yearStart" value="FRESH" checked={mode === 'FRESH'} onChange={() => setMode('FRESH')} /><span>Starting fresh this year</span></label>
      <label className="wb-check"><input type="radio" name="yearStart" value="MID_YEAR" checked={mode === 'MID_YEAR'} onChange={() => setMode('MID_YEAR')} /><span>Starting mid-year? Enter year-to-date totals</span></label>
      {mode === 'FRESH' ? <p className="wb-note">No paychecks earlier this year. Every total starts at zero.</p> : <>
        {amount('ytdGross', 'Gross pay so far ($)', mid?.grossMinor ?? opening?.grossMinor)}
        {amount('ytdSocialSecurity', 'Social Security withheld ($)', mid?.withheld.socialSecurityMinor)}
        {amount('ytdMedicare', 'Medicare withheld ($)', mid?.withheld.medicareMinor)}
        {amount('ytdIncomeTax', 'Puerto Rico income tax withheld ($)', mid?.withheld.prIncomeTaxMinor)}
        {amount('ytdSinot', 'SINOT withheld ($)', mid?.withheld.sinotMinor)}
        <p className="wb-note">Employer amounts paid so far are optional. Leave blank for zero.</p>
        {amount('ytdEmployerSocialSecurity', 'Employer Social Security ($)', mid?.employerPaid.socialSecurityMinor)}
        {amount('ytdEmployerMedicare', 'Employer Medicare ($)', mid?.employerPaid.medicareMinor)}
        {amount('ytdEmployerSinot', 'Employer SINOT ($)', mid?.employerPaid.sinotMinor)}
        {amount('ytdFuta', 'FUTA ($)', mid?.employerPaid.futaMinor)}
        {amount('ytdPrUi', 'Puerto Rico unemployment ($)', mid?.employerPaid.prUiMinor)}
        {amount('ytdCfse', 'CFSE ($)', mid?.employerPaid.cfseMinor)}
      </>}
    </>}
    <Problem text={error} />
    <button type="submit" className="q-btn" aria-disabled={operation.locked || !company}><PendingLabel pending={operation.busy} pendingText="Saving…">Save pay setup</PendingLabel></button>
    <p className="wb-note">Saving records that you entered these details, and when. The next payroll draft uses them.</p>
    <AuditDetails records={[payRecord, openingRecord].filter((r): r is Record => !!r)} />
  </fieldset></form>;
}

/** Plain payroll setup on the Quiet kit: company defaults once, then each person's pay. */
export function NativePayrollConfig({ settings, sources, recoveryScope }: { settings: PayrollSettingsResponse | null; sources: NativeConfigurationSources | null; recoveryScope: string }) {
  const resource = usePayrollResource('/api/payroll/native-profiles', readNativeProfiles);
  const history = usePayrollResource('/api/payroll/runs', readRuns);
  const operation = usePayrollOperation('/api/payroll/native-profiles', resource.reload, `${recoveryScope}:native-profiles`);
  const [managerId, setManagerId] = useState('');
  if (!settings?.capabilities.canConfigure) return null;
  const data = !resource.loading && !resource.error ? resource.data : null;
  const year = Number(prToday().slice(0, 4));
  const company = (data?.setup?.companyDefaults ?? null) as Record | null;
  const companyFacts = company?.facts as NativeCompanyPayrollFacts | undefined;
  const people = (sources?.employees ?? []).filter(e => e.active || data?.configurations.some(c => c.employeeId === e.id));
  const frozen = (employeeId: string) => !!history.data?.runs?.some(r => r.sourceAuthority === 'NATIVE_RECORDED_TIME' && r.status === 'APPROVED' && r.nativeCalculation?.employees.some(e => e.employeeId === employeeId && e.breakdown.ytdBefore.year === year));
  const value = (id: string, role: string) => {
    if (role === 'OWNER' && !companyFacts?.includeOwners) return 'Not in payroll';
    const wage = data?.configurations.find(c => c.employeeId === id)?.wages.at(-1);
    return wage ? `$${hourlyRateDollars(wage.hourlyRateMinor)}/h` : 'Needs pay setup';
  };
  const managers = (sources?.employees ?? []).filter(e => e.active && e.role === 'MANAGER');
  return <>
    <div className="q-grp"><h2>Payroll setup</h2></div>
    <div className="wb-payroll-feedback"><OperationFeedback operation={operation} /></div>
    {resource.loading ? <p className="q-empty q-first" role="status">Loading payroll setup…</p>
      : resource.error ? <div className="q-emptyblock" role="alert"><p className="q-empty">{resource.error}</p><div className="q-emptyblock__action"><button type="button" className="q-btn q-btn--sec" onClick={() => void resource.reload()}>Try again</button></div></div>
      : !sources ? <p className="q-empty q-first" role="alert">People, locations and break types couldn’t load. Reload this page.</p>
      : data && <>
        <div className="q-list q-rule-list">
          <Row title="Company defaults" value={company ? 'Saved' : 'Not set up'} id="q-ps-company"><CompanyDefaultsForm key={company?.revision ?? 0} record={company} sources={sources} operation={operation} /><AuditDetails records={company ? [company] : []} /></Row>
        </div>
        <div className="q-grp"><h2>People</h2></div>
        <div className="q-list q-rule-list">
          {people.length ? people.map(e => <Row key={e.id} title={`${e.name}${e.active ? '' : ' (inactive)'}`} value={value(e.id, e.role)}>
            {e.role === 'OWNER' && !companyFacts?.includeOwners && <p className="wb-note">Owners aren’t in payroll. Turn on “Pay Owners through payroll” in Company defaults to include them.</p>}
            <PayForm key={`${e.id}:${data.configurations.find(c => c.employeeId === e.id)?.revision ?? 0}`} employeeId={e.id} data={data} company={company} frozen={frozen(e.id)} operation={operation} year={year} />
          </Row>) : <p className="q-empty q-first">No people yet.</p>}
        </div>
        {managers.length > 0 && <><div className="q-grp"><h2>Manager payroll access</h2></div>
          <div className="q-list q-rule-list"><Row title="Manager payroll access" value={String(data.managerScopes.filter(s => s.review).length || 'None')}>
            <label>Manager<select value={managerId} onChange={e => setManagerId(e.target.value)}><option value="">Choose a Manager</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
            {managerId && <NativeScopeForm key={managerId} employeeId={managerId} scope={data.managerScopes.find(s => s.employeeId === managerId) ?? null} locations={sources.locations} operation={operation} />}
          </Row></div></>}
      </>}
  </>;
}
