'use client';

import { createContext, useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { PlusIcon, TrashIcon, WarningCircleIcon } from '@phosphor-icons/react/ssr';
import type { PayrollPreferences, PayrollRule, PayrollSettingsResponse } from '@/lib/payroll/contracts';
import { NativePayrollConfig, type NativeConfigurationSources } from './native-payroll-config';
import { readSettings } from './api';
import { dollarsToMinor, minorToDollars } from './money';
import { usePayrollOperation, usePayrollResource } from './use-payroll';
import type { ReactNode } from 'react';
import { OperationFeedback, PayrollFrame, PayrollState, PrivacyNote } from './payroll-ui';
import { KeepFocusClear } from '../wave-b-forms';
import { PendingLabel } from '../employee-submit-button';
import { noticeReadiness, reminderWindow } from './workflow-status';
import { formatDateRange } from '@/lib/date-utils';
import { keepWhole } from '@/lib/keep-whole';
import { revealFeedback } from '@/lib/reveal-feedback';

/** IS-B27: which form sent the running save, so only its button says "Saving…". */
const SavingForm = createContext<[string | null, (id: string) => void]>([null, () => {}]);

/** A kit card for one group of payroll settings (Phase 3.5 Wave B). Wording stays as approved. */
function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="nv-card"><div className="nv-card__head"><h2 className="nv-card__title">{title}</h2></div><div className="wb-body">{description && <p className="wb-note">{description}</p>}{children}</div></section>;
}
/* TC-B-03: dates read whole and with their year; the wording around them is unchanged. */
function effectiveDate(date: string) { return keepWhole(new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))).replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun), /, '$1,\u00a0'); }
function recordedAt(at: string) { return keepWhole(new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(at))); }
function today() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
const defaults: PayrollPreferences = {
  companyName: '', language: 'en', currency: 'USD',
  schedule: { frequency: 'BIWEEKLY', anchorDate: '', paydayOffsetDays: 0 }, rules: [],
  automation: { prepare: false, publish: false, reminders: false, reminderLeadDays: [] }, bankProfile: null,
};
function integer(value: FormDataEntryValue | null, label: string, min: number, max: number) {
  const text = String(value ?? '');
  if (!/^\d+$/.test(text) || Number(text) < min || Number(text) > max) throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
  return Number(text);
}
function rulesFromForm(values: FormData, rules: PayrollRule[]): PayrollRule[] {
  return rules.map(rule => {
    const get = (key: string) => String(values.get(`rule-${rule.id}-${key}`) ?? '');
    const method = get('method') === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
    const percent = get('percent');
    const basis = method === 'PERCENTAGE' ? dollarsToMinor(percent) : null;
    if (basis !== null && BigInt(basis) > BigInt(10000)) throw new Error('Rule percentages must be between 0 and 100.');
    return {
      id: rule.id, name: get('name').trim(), kind: get('kind') === 'EMPLOYER_CONTRIBUTION' ? 'EMPLOYER_CONTRIBUTION' : 'EMPLOYEE_DEDUCTION',
      method, amountMinor: method === 'FIXED' ? dollarsToMinor(get('amount')) : null, basisPoints: basis === null ? null : Number(basis),
      base: 'GROSS', applicability: get('applicability') === 'EMPLOYEE_ELECTION' ? 'EMPLOYEE_ELECTION' : 'ALL',
      effectiveFrom: get('from'), effectiveTo: get('to') || null, capMinor: get('cap') ? dollarsToMinor(get('cap')) : null,
      remittance: get('remittance') === 'PROVIDER' ? 'PROVIDER' : 'EMPLOYER',
    };
  });
}

export function PayrollSettings({ recoveryScope, nativeSources = null }: { recoveryScope: string; nativeSources?: NativeConfigurationSources|null }) {
  const resource = usePayrollResource('/api/payroll/settings', readSettings);
  const operation = usePayrollOperation('/api/payroll/settings', resource.reload, recoveryScope);
  const savingForm = useState<string | null>(null);
  const savingId = savingForm[0];
  // IS-B12: when a save ends, focus returns to that form's button instead of the page.
  useEffect(() => { if (!operation.busy && savingId && (!document.activeElement || document.activeElement === document.body)) document.querySelector<HTMLElement>(`form[data-form="${savingId}"] button[type="submit"]`)?.focus(); }, [operation.busy, savingId]);
  const data = !resource.loading && resource.data?.capabilities.canConfigure ? resource.data : null;
  const revision = data?.revisions.reduce((latest, item) => item.revision > (latest?.revision ?? 0) ? item : latest, data.revisions[0]);
  return <PayrollFrame title="Payroll settings" description="Set company defaults, effective dates and authorized employee exceptions.">
    <SavingForm.Provider value={savingForm}><div className="wb-page wb-payroll-settings"><div className="wb-auto wb-payroll-settings">
    <KeepFocusClear />
    <div className="wb-payroll-feedback"><OperationFeedback operation={operation} /></div>
    {resource.loading ? <PayrollState title="Loading payroll settings">Checking current owner access and configuration revisions.</PayrollState> : resource.error ? <PayrollState title="Settings unavailable" error retry={() => void resource.reload()}>{resource.error}</PayrollState> : data && <>
      {!revision && <PayrollState title="Configure payroll before preparing runs">These are unsaved starting preferences. Choose your company settings and an effective date. {data.capabilities.internalCalculatorAvailable ? 'Native payroll uses verified recorded time and employee payroll facts.' : 'imported provider amounts remain the authority.'}</PayrollState>}
      <CompanyPreferences key={revision?.revision ?? 0} preferences={revision?.preferences ?? defaults} revision={revision?.revision ?? 0} data={data} operation={operation} />
      <EmployeeException data={data} preferences={revision?.preferences ?? defaults} operation={operation} />
      {!data.capabilities.internalCalculatorAvailable && <PayrollAccess data={data} operation={operation} />}
    </>}
    {(nativeSources !== null || data?.capabilities.internalCalculatorAvailable) && <NativePayrollConfig settings={data} sources={nativeSources} recoveryScope={recoveryScope}/>}
    {data && <>
      <SettingsCard title="Settings history" description="Saved revisions record their effective date and reason.">{data.revisions.length ? <div className="wb-history">{[...data.revisions].sort((a, b) => b.revision - a.revision).map(item => <div key={item.revision}><strong>Revision {item.revision} · Effective {effectiveDate(item.effectiveFrom.slice(0, 10))}</strong><p>{item.reason}</p><small>Recorded {recordedAt(item.createdAt)}</small></div>)}</div> : <p className="wb-note">No settings revisions have been saved.</p>}</SettingsCard>
      <PrivacyNote>Only the owner can configure payroll and access grants. {data.capabilities.internalCalculatorAvailable ? 'Native payroll requires verified recorded time, employee facts and a separate human approval.' : 'Provider imports supply actual payroll amounts.'} {noticeReadiness(data.capabilities)}</PrivacyNote>
    </>}
    </div></div></SavingForm.Provider>
  </PayrollFrame>;
}

function CompanyPreferences({ preferences, revision, data, operation }: { preferences: PayrollPreferences; revision: number; data: PayrollSettingsResponse; operation: ReturnType<typeof usePayrollOperation> }) {
  const [rules, setRules] = useState(preferences.rules);
  const [error, setError] = useState('');
  const [noticesEnabled, setNoticesEnabled] = useState(preferences.automation.reminders);
  const locked = operation.locked;
  const [savingId, setSaving] = useContext(SavingForm);
  const form = useRef<HTMLFormElement>(null),sent=useRef(false);
  useEffect(()=>{
    if(operation.busy||!sent.current)return;
    sent.current=false;
    const feedback=form.current?.closest('.payroll-workflow')?.querySelector<HTMLElement>('.pw-feedback');
    if(feedback?.textContent?.trim()){feedback.tabIndex=-1;revealFeedback(feedback);}
  },[operation.busy]);
  const native = data.capabilities.internalCalculatorAvailable;
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if(locked)return; setSaving('company'); setError(''); const values = new FormData(event.currentTarget);
    try {
      const reminderLeadDays = values.has('reminders') ? [integer(values.get('reminderDays'), 'Preparation reminder window', 0, 31)] : [];
      const next: PayrollPreferences = {
        companyName: String(values.get('companyName')).trim(), currency: 'USD', language: values.get('language') === 'es' ? 'es' : 'en',
        schedule: { frequency: preferences.schedule.frequency, anchorDate: String(values.get('anchorDate')), paydayOffsetDays: integer(values.get('paydayOffset'), 'Payday offset', 0, 31) },
        rules: native ? preferences.rules : rulesFromForm(values, rules), automation: { prepare: values.has('prepare'), publish: native ? preferences.automation.publish : values.has('publish'), reminders: values.has('reminders'), reminderLeadDays: [...new Set(reminderLeadDays)] },
        bankProfile: native ? preferences.bankProfile : values.get('bankProfile') === 'NEUTRAL_UNVERIFIED' ? 'NEUTRAL_UNVERIFIED' : null,
      };
      const frequency = values.get('frequency');
      if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY' || frequency === 'SEMIMONTHLY' || frequency === 'MONTHLY') next.schedule.frequency = frequency;
      const provider = native ? preferences.sourceProvider : values.get('sourceProvider'), channel = native ? preferences.bankChannel : values.get('bankChannel');
      if (provider === 'ADP_RUN' || provider === 'QUICKBOOKS_PAYROLL' || provider === 'PAYCHEX' || provider === 'GUSTO' || provider === 'OTHER') next.sourceProvider = provider;
      if (channel === 'POPULAR_WCM_TEXT' || channel === 'POPULAR_WCM_NACHA' || channel === 'POPULAR_COMMERCIAL_MANUAL' || channel === 'OTHER') next.bankChannel = channel;
      sent.current=true;
      void operation.submit({ action: 'SAVE_SETTINGS', expectedRevision: revision, effectiveFrom: String(values.get('effectiveFrom')), reason: String(values.get('reason')).trim(), preferences: next });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Check payroll preferences.'); }
  };
  return <section className="wb-section" aria-labelledby="payroll-company-defaults"><div className="wb-section-head"><h2 className="wb-section-title" id="payroll-company-defaults">Company defaults</h2><p className="wb-note">{`Revision ${revision} · Currency USD`}</p></div><form ref={form} className="wb-form" data-form="company" onSubmit={save}><fieldset disabled={locked} className="wb-form">
    <section className="nv-card"><div className="nv-card__head"><h3 className="nv-card__title">Company and documents</h3></div><div className="wb-body"><div className="wb-grid">
      <label>Company name on documents<input name="companyName" defaultValue={preferences.companyName} maxLength={160} required /></label>
      <label>Default statement language<select aria-label="Default statement language" name="language" defaultValue={preferences.language}><option value="en">English</option><option value="es">Español</option></select></label>
      {!native && <label>Payroll provider preference<select aria-label="Payroll provider preference" name="sourceProvider" defaultValue={preferences.sourceProvider ?? ''}><option value="">No provider preference saved</option><option value="ADP_RUN">ADP RUN</option><option value="QUICKBOOKS_PAYROLL">QuickBooks Payroll</option><option value="PAYCHEX">Paychex</option><option value="GUSTO">Gusto</option><option value="OTHER">Other provider or accountant</option></select></label>}
    </div><p className="wb-note">{native ? 'Native payroll uses verified recorded time and employee payroll facts. Provider imports remain the source for historical provider runs.' : 'Provider selection records a preference. It does not connect an account or verify a provider format. All sources currently use the neutral payroll import.'}</p></div></section>
    <section className="nv-card"><div className="nv-card__head"><h3 className="nv-card__title">Pay schedule</h3></div><div className="wb-body"><div className="wb-grid">
      <label>Frequency<select aria-label="Frequency" name="frequency" defaultValue={preferences.schedule.frequency}><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every two weeks</option><option value="SEMIMONTHLY">Twice a month</option><option value="MONTHLY">Monthly</option></select></label>
      <label>Schedule anchor date<input type="date" name="anchorDate" required defaultValue={preferences.schedule.anchorDate} /></label>
      <label>Payday after period end<input type="number" name="paydayOffset" min={0} max={31} required defaultValue={preferences.schedule.paydayOffsetDays} /><small className="wb-help">Days after the period ends.</small></label>
    </div><p className="wb-note">Weekly and every-two-week periods begin on the anchor date. Twice-a-month periods are days <span className="nv-nowrap">1–15</span> and <span className="nv-nowrap">16–month end</span>; monthly periods use calendar months. For those schedules, the anchor is the date automation begins.</p></div></section>
    {!native && <section className="nv-card"><div className="nv-card__head"><h3 className="nv-card__title">Deductions and contributions</h3></div><div className="wb-body"><p className="wb-note">These rules record company policy and employee elections. Actual amounts must come from the provider import. Missing configuration is not a zero tax or an exemption.</p><RuleEditor rules={rules} onChange={setRules} /><button className="nv-btn" data-kind="secondary" type="button" data-add-rule="" onClick={() => setRules(items => [...items, newRule()])}><PlusIcon size={18} aria-hidden />Add rule</button></div></section>}
    <section className="nv-card"><div className="nv-card__head"><h3 className="nv-card__title">Automation</h3></div><div className="wb-body"><p className="wb-note">Preparation creates drafts and waits for required amounts and exceptions. Approval remains an authorized, separate action.</p><label className="wb-check"><input name="prepare" type="checkbox" defaultChecked={preferences.automation.prepare} /><span>Prepare scheduled drafts</span></label>{!native && <label className="wb-check"><input name="publish" type="checkbox" defaultChecked={preferences.automation.publish} /><span>Publish statements after an authorized approval</span></label>}{native && <p className="wb-note">Native statements publish automatically after generation and verification. Approval remains separate from publication and payment.</p>}<label className="wb-check"><input name="reminders" type="checkbox" checked={noticesEnabled} onChange={event => setNoticesEnabled(event.target.checked)} /><span>Queue private payroll notices</span></label><label>Preparation reminder window<input aria-label="Preparation reminder window" aria-describedby="payroll-notice-window-help" name="reminderDays" type="number" min={0} max={31} required={noticesEnabled} disabled={!noticesEnabled} defaultValue={reminderWindow(preferences.automation.reminderLeadDays)} /><small className="wb-help" id="payroll-notice-window-help">Remind once within this many days before payday; 0 is payday. A missed window can catch up with one current actionable notice.</small></label><p className="wb-note">The notice preference also enables statement-availability notices after publication. Notices contain generic private references. Eligibility, consent and current access are checked separately; queued does not mean delivered.</p><p className="wb-note">{noticeReadiness(data.capabilities)}</p></div></section>
    {!native && <section className="nv-card"><div className="nv-card__head"><h3 className="nv-card__title">Payment instructions</h3></div><div className="wb-body"><div className="wb-grid">
      <label>Output profile<select aria-label="Output profile" name="bankProfile" defaultValue={preferences.bankProfile ?? ''}><option value="">No payment output configured</option><option value="NEUTRAL_UNVERIFIED">Neutral instructions · compatibility unverified</option></select></label>
      <label>Desired bank channel<select aria-label="Desired bank channel" name="bankChannel" defaultValue={preferences.bankChannel ?? ''}><option value="">No channel preference saved</option><option value="POPULAR_WCM_TEXT">Popular Web Cash Manager · text</option><option value="POPULAR_WCM_NACHA">Popular Web Cash Manager · NACHA</option><option value="POPULAR_COMMERCIAL_MANUAL">Popular commercial · manual</option><option value="OTHER">Other bank or channel</option></select></label>
    </div><p className="wb-note">Channel selection records your intended workflow. Bank compatibility has not been verified. NEVORA currently generates neutral instructions and does not submit payments or confirm processing.</p></div></section>}
    <section className="nv-card"><div className="nv-card__head"><h3 className="nv-card__title">Review the change</h3></div><div className="wb-body"><div className="wb-grid"><label>Effective date<input type="date" name="effectiveFrom" required defaultValue={today()} /></label><label>Reason for change<input name="reason" required maxLength={300} /></label></div><ImpactPreview data={data} /><p className="wb-note">Approved payroll stays frozen. Unapproved drafts require a fresh review after settings or exception revisions change.</p>{error && <p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden /><span>{error}</span></p>}</div></section>
  </fieldset><div className="wb-actions"><button type="submit" className="nv-btn" data-kind="primary" aria-disabled={locked}><PendingLabel pending={operation.busy && savingId === 'company'} pendingText="Saving…">Save company preferences</PendingLabel></button></div></form></section>;
}

function newRule(): PayrollRule { return { id: crypto.randomUUID(), name: '', kind: 'EMPLOYEE_DEDUCTION', method: 'FIXED', amountMinor: null, basisPoints: null, base: 'GROSS', applicability: 'ALL', effectiveFrom: today(), effectiveTo: null, capMinor: null, remittance: 'EMPLOYER' }; }
function RuleEditor({ rules, onChange }: { rules: PayrollRule[]; onChange: (rules: PayrollRule[]) => void }) {
  return <div className="wb-rule-list">{rules.length === 0 && <p className="wb-note">No rules configured. Imported payroll amounts are still required.</p>}{rules.map((rule, index) => {
    const name = (key: string) => `rule-${rule.id}-${key}`;
    return <fieldset className="wb-rule" key={rule.id}>
      <legend>Rule {index + 1}</legend>
      <div className="wb-grid">
        <label>Rule name<input name={name('name')} defaultValue={rule.name} required maxLength={100} /></label>
        <label>Type<select name={name('kind')} defaultValue={rule.kind}><option value="EMPLOYEE_DEDUCTION">Employee deduction</option><option value="EMPLOYER_CONTRIBUTION">Employer contribution</option></select></label>
        <label>Method<select name={name('method')} value={rule.method} onChange={event => onChange(rules.map(item => item.id === rule.id ? { ...item, method: event.target.value === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED' } : item))}><option value="FIXED">Fixed USD amount</option><option value="PERCENTAGE">Percentage of gross</option></select></label>
        {rule.method === 'FIXED' ? <label>Amount in USD<input name={name('amount')} inputMode="decimal" required defaultValue={rule.amountMinor === null ? '' : minorToDollars(rule.amountMinor)} placeholder="0.00" /></label> : <label>Percent of gross<input name={name('percent')} inputMode="decimal" required defaultValue={rule.basisPoints === null ? '' : minorToDollars(String(rule.basisPoints))} placeholder="0.00" /></label>}
        <label>Applies to<select name={name('applicability')} defaultValue={rule.applicability}><option value="ALL">All employees</option><option value="EMPLOYEE_ELECTION">Employee election</option></select></label>
        <label>Remitted by<select name={name('remittance')} defaultValue={rule.remittance}><option value="EMPLOYER">Employer</option><option value="PROVIDER">Payroll provider</option></select></label>
        <label>Effective from<input name={name('from')} type="date" defaultValue={rule.effectiveFrom} required /></label>
        <label>Effective through · optional<input name={name('to')} type="date" defaultValue={rule.effectiveTo ?? ''} /></label>
        <label>USD cap · optional<input name={name('cap')} inputMode="decimal" defaultValue={rule.capMinor === null ? '' : minorToDollars(rule.capMinor)} placeholder="No cap configured" /></label>
      </div>
      <button type="button" className="nv-btn" data-kind="secondary" onClick={event => { const form = event.currentTarget.form; onChange(rules.filter(item => item.id !== rule.id)); requestAnimationFrame(() => form?.querySelector<HTMLElement>("[data-add-rule]")?.focus()); }}><TrashIcon size={18} aria-hidden />Remove rule {index + 1}</button>
    </fieldset>;
  })}</div>;
}
function ImpactPreview({ data }: { data: PayrollSettingsResponse }) {
  return <div className="wb-box wb-impact"><strong>Future draft impact</strong>{data.futureDraftImpact.length ? <ul>{data.futureDraftImpact.map(item => <li key={item.runId}>{keepWhole(formatDateRange(item.period.startDate, item.period.endDate))}: {item.reason}</li>)}</ul> : <p>No affected future drafts were returned by the server.</p>}</div>;
}

function EmployeeException({ data, preferences, operation }: { data: PayrollSettingsResponse; preferences: PayrollPreferences; operation: ReturnType<typeof usePayrollOperation> }) {
  const [employeeId, setEmployeeId] = useState(data.employees.find(employee => employee.active)?.id ?? '');
  const exception = data.exceptions.filter(item => item.exception.employeeId === employeeId).sort((a, b) => b.revision - a.revision)[0];
  return <SettingsCard title="Employee exceptions" description="Employees inherit company defaults unless an authorized exception takes effect."><label>Employee<select aria-label="Employee" value={employeeId} onChange={event => setEmployeeId(event.target.value)} disabled={operation.locked}><option value="">Choose an employee</option>{data.employees.filter(employee => employee.active).map(employee => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></label>{employeeId && <ExceptionForm key={`${employeeId}:${exception?.revision ?? 0}`} employeeId={employeeId} revision={exception?.revision ?? 0} language={exception?.exception.language ?? null} initialRules={exception?.exception.rules ?? null} preferences={preferences} data={data} operation={operation} />}</SettingsCard>;
}
function ExceptionForm({ employeeId, revision, language, initialRules, preferences, data, operation }: { employeeId: string; revision: number; language: 'en' | 'es' | null; initialRules: PayrollRule[] | null; preferences: PayrollPreferences; data: PayrollSettingsResponse; operation: ReturnType<typeof usePayrollOperation> }) {
  const native = data.capabilities.internalCalculatorAvailable;
  const [inherit, setInherit] = useState(initialRules === null);
  const [rules, setRules] = useState(initialRules ?? preferences.rules);
  const [error, setError] = useState('');
  const [savingId, setSaving] = useContext(SavingForm);
  return <form className="wb-form" data-form="exception" onSubmit={event => {
    setSaving('exception');
    event.preventDefault(); setError(''); const values = new FormData(event.currentTarget);
    try { const chosen = values.get('exceptionLanguage'); void operation.submit({ action: 'SAVE_EXCEPTION', expectedRevision: revision, effectiveFrom: String(values.get('effectiveFrom')), reason: String(values.get('reason')).trim(), exception: { employeeId, language: chosen === 'en' || chosen === 'es' ? chosen : null, rules: native ? initialRules : inherit ? null : rulesFromForm(values, rules) } }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Check this employee exception.'); }
  }}><fieldset disabled={operation.locked} className="wb-form">
    <p className="wb-note">Exception revision {revision} · {native ? 'Native wage, withholding and deduction facts are verified separately from statement language.' : 'Provider imports continue to determine actual gross and net pay.'}</p>
    <label>Statement language<select aria-label="Statement language" name="exceptionLanguage" defaultValue={language ?? ''}><option value="">Inherit company language</option><option value="en">English</option><option value="es">Español</option></select></label>
    {!native && <label className="wb-check"><input type="checkbox" checked={inherit} onChange={event => setInherit(event.target.checked)} /><span>Inherit company deduction and contribution rules</span></label>}
    {!native && !inherit && <><RuleEditor rules={rules} onChange={setRules} /><button className="nv-btn" data-kind="secondary" type="button" data-add-rule="" onClick={() => setRules(items => [...items, newRule()])}><PlusIcon size={18} aria-hidden />Add employee rule</button></>}
    <div className="wb-grid"><label>Exception effective date<input name="effectiveFrom" type="date" required defaultValue={today()} /></label><label>Exception reason<input name="reason" required maxLength={300} /></label></div>
    <ImpactPreview data={data} />{error && <p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden /><span>{error}</span></p>}
    <button className="nv-btn" data-kind="primary" type="submit">{operation.busy && savingId === 'exception' ? 'Saving…' : 'Save employee exception'}</button>
  </fieldset></form>;
}

function PayrollAccess({ data, operation }: { data: PayrollSettingsResponse; operation: ReturnType<typeof usePayrollOperation> }) {
  const [employeeId, setEmployeeId] = useState('');
  const grant = data.grants.find(item => item.employeeId === employeeId);
  if (data.capabilities.internalCalculatorAvailable) return <SettingsCard title="Payroll access" description="Manager access must be assigned for specific payroll locations."><p className="pw-small">Scheduling access alone does not grant payroll access. Review and approval use the Owner’s current payroll location permissions.</p></SettingsCard>;
  return <SettingsCard title="Payroll access" description="Manager time-review permission does not grant access to financial records."><label>Grant recipient<select aria-label="Grant recipient" value={employeeId} onChange={event => setEmployeeId(event.target.value)} disabled={operation.locked}><option value="">Choose an employee</option>{data.employees.filter(employee => employee.active).map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>{employeeId && <GrantForm key={`${employeeId}:${grant?.revision ?? 0}`} employeeId={employeeId} revision={grant?.revision ?? 0} review={grant?.review ?? false} approve={grant?.approve ?? false} operation={operation} />}</SettingsCard>;
}
function GrantForm({ employeeId, revision, review, approve, operation }: { employeeId: string; revision: number; review: boolean; approve: boolean; operation: ReturnType<typeof usePayrollOperation> }) {
  const [canReview, setReview] = useState(review);
  const [canApprove, setApprove] = useState(approve);
  const [savingId, setSaving] = useContext(SavingForm);
  return <form className="wb-form" data-form="access" onSubmit={event => {
    setSaving('access');
    event.preventDefault(); const values = new FormData(event.currentTarget);
    void operation.submit({ action: 'SET_GRANT', expectedRevision: revision, reason: String(values.get('reason')).trim(), grant: { employeeId, review: canReview, approve: canApprove } });
  }}><fieldset disabled={operation.locked} className="wb-form">
    <label className="wb-check"><input type="checkbox" checked={canReview} onChange={event => { setReview(event.target.checked); if (!event.target.checked) setApprove(false); }} /><span>Review payroll amounts and documents</span></label>
    <label className="wb-check"><input type="checkbox" checked={canApprove} onChange={event => { setApprove(event.target.checked); if (event.target.checked) setReview(true); }} /><span>Approve an exact reviewed payroll revision</span></label>
    <label>Access change reason<textarea name="reason" required maxLength={300} rows={3} /></label>
    <p className="wb-note">Approval requires review access. Clear both permissions to revoke this grant. The server checks the current grant on every action.</p>
    <button type="submit" className="nv-btn" data-kind="primary">{operation.busy && savingId === 'access' ? 'Saving…' : 'Save payroll access'}</button>
  </fieldset></form>;
}
