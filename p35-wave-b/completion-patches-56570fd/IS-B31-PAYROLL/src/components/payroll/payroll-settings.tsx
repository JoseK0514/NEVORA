'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react/ssr';
import type { PayrollPreferences, PayrollRule, PayrollSettingsResponse } from '@/lib/payroll/contracts';
import { readSettings } from './api';
import { dollarsToMinor, minorToDollars } from './money';
import { usePayrollOperation, usePayrollResource } from './use-payroll';
import { usePendingPayrollFields } from './pending-fields';
import { OperationFeedback, PayrollFrame, PayrollPanel, PayrollState, PrivacyNote } from './payroll-ui';
import { noticeReadiness, reminderWindow } from './workflow-status';
import { revealFeedback } from '@/lib/reveal-feedback';
import { formatDateRange, formatDisplayDate } from '@/lib/date-utils';

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

export function PayrollSettings({ recoveryScope }: { recoveryScope: string }) {
  const resource = usePayrollResource('/api/payroll/settings', readSettings);
  const operation = usePayrollOperation('/api/payroll/settings', resource.reload, recoveryScope);
  const revision = resource.data?.revisions.reduce((latest, item) => item.revision > (latest?.revision ?? 0) ? item : latest, resource.data.revisions[0]);
  return <PayrollFrame title="Payroll settings" description="Set company defaults, effective dates and authorized employee exceptions.">
    <OperationFeedback operation={operation} />
    {resource.loading && !resource.data ? <PayrollState title="Loading payroll settings">Checking current owner access and configuration revisions.</PayrollState> : resource.error ? <PayrollState title="Settings unavailable" error retry={() => void resource.reload()}>{resource.error}</PayrollState> : resource.data && <>
      {!revision && <PayrollState title="Configure payroll before preparing runs">These are unsaved starting preferences. Choose your company settings and an effective date; imported provider amounts remain the authority.</PayrollState>}
      <CompanyPreferences key={revision?.revision ?? 0} preferences={revision?.preferences ?? defaults} revision={revision?.revision ?? 0} data={resource.data} operation={operation} />
      <EmployeeException data={resource.data} preferences={revision?.preferences ?? defaults} operation={operation} />
      <PayrollAccess data={resource.data} operation={operation} />
      <PayrollPanel title="Settings history" description="Saved revisions record their effective date and reason.">{resource.data.revisions.length ? <div className="pw-history">{[...resource.data.revisions].sort((a, b) => b.revision - a.revision).map(item => <div key={item.revision}><strong>Revision {item.revision} · Effective {formatDisplayDate(item.effectiveFrom.slice(0, 10))}</strong><p>{item.reason}</p><small>Recorded {new Date(item.createdAt).toLocaleString()}</small></div>)}</div> : <p className="pw-small">No settings revisions have been saved.</p>}</PayrollPanel>
      <PrivacyNote>Only the owner can configure payroll and access grants. Provider imports supply actual payroll amounts. {noticeReadiness(resource.data.capabilities)}</PrivacyNote>
    </>}
  </PayrollFrame>;
}

function CompanyPreferences({ preferences, revision, data, operation }: { preferences: PayrollPreferences; revision: number; data: PayrollSettingsResponse; operation: ReturnType<typeof usePayrollOperation> }) {
  const [rules, setRules] = useState(preferences.rules);
  const [error, setError] = useState('');
  const [noticesEnabled, setNoticesEnabled] = useState(preferences.automation.reminders);
  const locked = operation.locked;
  const form = useRef<HTMLFormElement>(null),sent=useRef(false);
  usePendingPayrollFields(form, locked);
  useEffect(()=>{
    if(operation.busy||!sent.current)return;
    sent.current=false;
    const feedback=form.current?.closest('.payroll-workflow')?.querySelector<HTMLElement>('.pw-feedback');
    if(feedback?.textContent?.trim()){feedback.tabIndex=-1;revealFeedback(feedback);}
  },[operation.busy]);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if(locked)return; setError(''); const values = new FormData(event.currentTarget);
    try {
      const reminderLeadDays = values.has('reminders') ? [integer(values.get('reminderDays'), 'Preparation reminder window', 0, 31)] : [];
      const next: PayrollPreferences = {
        companyName: String(values.get('companyName')).trim(), currency: 'USD', language: values.get('language') === 'es' ? 'es' : 'en',
        schedule: { frequency: preferences.schedule.frequency, anchorDate: String(values.get('anchorDate')), paydayOffsetDays: integer(values.get('paydayOffset'), 'Payday offset', 0, 31) },
        rules: rulesFromForm(values, rules), automation: { prepare: values.has('prepare'), publish: values.has('publish'), reminders: values.has('reminders'), reminderLeadDays: [...new Set(reminderLeadDays)] },
        bankProfile: values.get('bankProfile') === 'NEUTRAL_UNVERIFIED' ? 'NEUTRAL_UNVERIFIED' : null,
      };
      const frequency = values.get('frequency');
      if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY' || frequency === 'SEMIMONTHLY' || frequency === 'MONTHLY') next.schedule.frequency = frequency;
      const provider = values.get('sourceProvider'), channel = values.get('bankChannel');
      if (provider === 'ADP_RUN' || provider === 'QUICKBOOKS_PAYROLL' || provider === 'PAYCHEX' || provider === 'GUSTO' || provider === 'OTHER') next.sourceProvider = provider;
      if (channel === 'POPULAR_WCM_TEXT' || channel === 'POPULAR_WCM_NACHA' || channel === 'POPULAR_COMMERCIAL_MANUAL' || channel === 'OTHER') next.bankChannel = channel;
      sent.current=true;
      void operation.submit({ action: 'SAVE_SETTINGS', expectedRevision: revision, effectiveFrom: String(values.get('effectiveFrom')), reason: String(values.get('reason')).trim(), preferences: next });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Check payroll preferences.'); }
  };
  return <PayrollPanel title="Company defaults" description={`Revision ${revision} · Currency USD`}><form ref={form} className="pw-form" onSubmit={save}><fieldset aria-disabled={locked || undefined}>
    <section className="pw-section pw-section-first"><h3>Company and documents</h3><div className="pw-fields">
      <label>Company name on documents<input name="companyName" defaultValue={preferences.companyName} maxLength={160} required /></label>
      <label>Default statement language<select aria-label="Default statement language" name="language" defaultValue={preferences.language}><option value="en">English</option><option value="es">Español</option></select></label>
      <label>Payroll provider preference<select aria-label="Payroll provider preference" name="sourceProvider" defaultValue={preferences.sourceProvider ?? ''}><option value="">No provider preference saved</option><option value="ADP_RUN">ADP RUN</option><option value="QUICKBOOKS_PAYROLL">QuickBooks Payroll</option><option value="PAYCHEX">Paychex</option><option value="GUSTO">Gusto</option><option value="OTHER">Other provider or accountant</option></select></label>
    </div><p className="pw-small">Provider selection records a preference. It does not connect an account or verify a provider format. All sources currently use the neutral payroll import.</p></section>
    <section className="pw-section"><h3>Pay schedule</h3><div className="pw-fields">
      <label>Frequency<select aria-label="Frequency" name="frequency" defaultValue={preferences.schedule.frequency}><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every two weeks</option><option value="SEMIMONTHLY">Twice a month</option><option value="MONTHLY">Monthly</option></select></label>
      <label>Schedule anchor date<input type="date" name="anchorDate" required defaultValue={preferences.schedule.anchorDate} /></label>
      <label>Payday after period end<input type="number" name="paydayOffset" min={0} max={31} required defaultValue={preferences.schedule.paydayOffsetDays} /><small>Days after the period ends.</small></label>
    </div><p className="pw-small">Weekly and every-two-week periods begin on the anchor date. Twice-a-month periods are days 1–15 and 16–month end; monthly periods use calendar months. For those schedules, the anchor is the date automation begins.</p></section>
    <section className="pw-section"><h3>Deductions and contributions</h3><p className="pw-small">These rules record company policy and employee elections. Actual amounts must come from the provider import. Missing configuration is not a zero tax or an exemption.</p><RuleEditor rules={rules} onChange={setRules} /><button className="pw-button pw-secondary" type="button" onClick={() => setRules(items => [...items, newRule()])}><PlusIcon size={18} aria-hidden />Add rule</button></section>
    <section className="pw-section"><h3>Automation</h3><p className="pw-small">Preparation creates drafts and waits for required amounts and exceptions. Approval remains an authorized, separate action.</p><label className="pw-check"><input name="prepare" type="checkbox" defaultChecked={preferences.automation.prepare} /><span>Prepare scheduled drafts</span></label><label className="pw-check"><input name="publish" type="checkbox" defaultChecked={preferences.automation.publish} /><span>Publish statements after an authorized approval</span></label><label className="pw-check"><input name="reminders" type="checkbox" checked={noticesEnabled} onChange={event => setNoticesEnabled(event.target.checked)} /><span>Queue private payroll notices</span></label><label>Preparation reminder window<input aria-label="Preparation reminder window" aria-describedby="payroll-notice-window-help" name="reminderDays" type="number" min={0} max={31} required={noticesEnabled} disabled={!noticesEnabled} defaultValue={reminderWindow(preferences.automation.reminderLeadDays)} /><small id="payroll-notice-window-help">Remind once within this many days before payday; 0 is payday. A missed window can catch up with one current actionable notice.</small></label><p className="pw-small">The notice preference also enables statement-availability notices after publication. Notices contain generic private references. Eligibility, consent and current access are checked separately; queued does not mean delivered.</p><p className="pw-small">{noticeReadiness(data.capabilities)}</p></section>
    <section className="pw-section"><h3>Payment instructions</h3><div className="pw-fields">
      <label>Output profile<select aria-label="Output profile" name="bankProfile" defaultValue={preferences.bankProfile ?? ''}><option value="">No payment output configured</option><option value="NEUTRAL_UNVERIFIED">Neutral instructions · compatibility unverified</option></select></label>
      <label>Desired bank channel<select aria-label="Desired bank channel" name="bankChannel" defaultValue={preferences.bankChannel ?? ''}><option value="">No channel preference saved</option><option value="POPULAR_WCM_TEXT">Popular Web Cash Manager · text</option><option value="POPULAR_WCM_NACHA">Popular Web Cash Manager · NACHA</option><option value="POPULAR_COMMERCIAL_MANUAL">Popular commercial · manual</option><option value="OTHER">Other bank or channel</option></select></label>
    </div><p className="pw-small">Channel selection records your intended workflow. Bank compatibility has not been verified. NEVORA currently generates neutral instructions and does not submit payments or confirm processing.</p></section>
    <section className="pw-section"><h3>Review the change</h3><div className="pw-fields"><label>Effective date<input type="date" name="effectiveFrom" required defaultValue={today()} /></label><label>Reason for change<input name="reason" required maxLength={300} /></label></div><ImpactPreview data={data} /><p className="pw-small">Approved payroll stays frozen. Unapproved drafts require a fresh review after settings or exception revisions change.</p>{error && <p className="pw-error" role="alert">{error}</p>}</section>
  </fieldset><button type="submit" className="pw-button" aria-disabled={locked}>Save company preferences</button></form></PayrollPanel>;
}

function newRule(): PayrollRule { return { id: crypto.randomUUID(), name: '', kind: 'EMPLOYEE_DEDUCTION', method: 'FIXED', amountMinor: null, basisPoints: null, base: 'GROSS', applicability: 'ALL', effectiveFrom: today(), effectiveTo: null, capMinor: null, remittance: 'EMPLOYER' }; }
function RuleEditor({ rules, onChange }: { rules: PayrollRule[]; onChange: (rules: PayrollRule[]) => void }) {
  return <div className="pw-rules">{rules.length === 0 && <p className="pw-small">No rules configured. Imported payroll amounts are still required.</p>}{rules.map((rule, index) => {
    const name = (key: string) => `rule-${rule.id}-${key}`;
    return <fieldset className="pw-rule" key={rule.id}>
      <legend>Rule {index + 1}</legend>
      <div className="pw-fields">
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
      <button type="button" className="pw-button pw-secondary" onClick={() => onChange(rules.filter(item => item.id !== rule.id))}><TrashIcon size={18} aria-hidden />Remove rule {index + 1}</button>
    </fieldset>;
  })}</div>;
}
function ImpactPreview({ data }: { data: PayrollSettingsResponse }) {
  return <div className="pw-impact"><strong>Future draft impact</strong>{data.futureDraftImpact.length ? <ul>{data.futureDraftImpact.map(item => <li key={item.runId}>{formatDateRange(item.period.startDate, item.period.endDate)}: {item.reason}</li>)}</ul> : <p>No affected future drafts were returned by the server.</p>}</div>;
}

function EmployeeException({ data, preferences, operation }: { data: PayrollSettingsResponse; preferences: PayrollPreferences; operation: ReturnType<typeof usePayrollOperation> }) {
  const [employeeId, setEmployeeId] = useState(data.employees.find(employee => employee.active)?.id ?? '');
  const exception = data.exceptions.filter(item => item.exception.employeeId === employeeId).sort((a, b) => b.revision - a.revision)[0];
  return <PayrollPanel title="Employee exceptions" description="Employees inherit company defaults unless an authorized exception takes effect."><label>Employee<select aria-label="Employee" value={employeeId} onChange={event => setEmployeeId(event.target.value)} disabled={operation.locked}><option value="">Choose an employee</option>{data.employees.filter(employee => employee.active).map(employee => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></label>{employeeId && <ExceptionForm key={`${employeeId}:${exception?.revision ?? 0}`} employeeId={employeeId} revision={exception?.revision ?? 0} language={exception?.exception.language ?? null} initialRules={exception?.exception.rules ?? null} preferences={preferences} data={data} operation={operation} />}</PayrollPanel>;
}
function ExceptionForm({ employeeId, revision, language, initialRules, preferences, data, operation }: { employeeId: string; revision: number; language: 'en' | 'es' | null; initialRules: PayrollRule[] | null; preferences: PayrollPreferences; data: PayrollSettingsResponse; operation: ReturnType<typeof usePayrollOperation> }) {
  const [inherit, setInherit] = useState(initialRules === null);
  const [rules, setRules] = useState(initialRules ?? preferences.rules);
  const [error, setError] = useState('');
  const form = useRef<HTMLFormElement>(null);
  usePendingPayrollFields(form, operation.locked);
  return <form ref={form} className="pw-form" onSubmit={event => {
    event.preventDefault(); if (operation.locked) return; setError(''); const values = new FormData(event.currentTarget);
    try { const chosen = values.get('exceptionLanguage'); void operation.submit({ action: 'SAVE_EXCEPTION', expectedRevision: revision, effectiveFrom: String(values.get('effectiveFrom')), reason: String(values.get('reason')).trim(), exception: { employeeId, language: chosen === 'en' || chosen === 'es' ? chosen : null, rules: inherit ? null : rulesFromForm(values, rules) } }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Check this employee exception.'); }
  }}><fieldset aria-disabled={operation.locked || undefined}>
    <p className="pw-small">Exception revision {revision} · Provider imports continue to determine actual gross and net pay.</p>
    <label>Statement language<select aria-label="Statement language" name="exceptionLanguage" defaultValue={language ?? ''}><option value="">Inherit company language</option><option value="en">English</option><option value="es">Español</option></select></label>
    <label className="pw-check"><input type="checkbox" checked={inherit} onChange={event => setInherit(event.target.checked)} /><span>Inherit company deduction and contribution rules</span></label>
    {!inherit && <><RuleEditor rules={rules} onChange={setRules} /><button className="pw-button pw-secondary" type="button" onClick={() => setRules(items => [...items, newRule()])}><PlusIcon size={18} aria-hidden />Add employee rule</button></>}
    <div className="pw-fields"><label>Exception effective date<input name="effectiveFrom" type="date" required defaultValue={today()} /></label><label>Exception reason<input name="reason" required maxLength={300} /></label></div>
    <ImpactPreview data={data} />{error && <p role="alert" className="pw-error">{error}</p>}
    <button className="pw-button" type="submit" aria-disabled={operation.locked || undefined}>Save employee exception</button>
  </fieldset></form>;
}

function PayrollAccess({ data, operation }: { data: PayrollSettingsResponse; operation: ReturnType<typeof usePayrollOperation> }) {
  const [employeeId, setEmployeeId] = useState('');
  const grant = data.grants.find(item => item.employeeId === employeeId);
  return <PayrollPanel title="Payroll access" description="Manager time-review permission does not grant access to financial records."><label>Grant recipient<select aria-label="Grant recipient" value={employeeId} onChange={event => setEmployeeId(event.target.value)} disabled={operation.locked}><option value="">Choose an employee</option>{data.employees.filter(employee => employee.active).map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>{employeeId && <GrantForm key={`${employeeId}:${grant?.revision ?? 0}`} employeeId={employeeId} revision={grant?.revision ?? 0} review={grant?.review ?? false} approve={grant?.approve ?? false} operation={operation} />}</PayrollPanel>;
}
function GrantForm({ employeeId, revision, review, approve, operation }: { employeeId: string; revision: number; review: boolean; approve: boolean; operation: ReturnType<typeof usePayrollOperation> }) {
  const [canReview, setReview] = useState(review);
  const [canApprove, setApprove] = useState(approve);
  const form = useRef<HTMLFormElement>(null);
  usePendingPayrollFields(form, operation.locked);
  return <form ref={form} className="pw-form" onSubmit={event => {
    event.preventDefault(); if (operation.locked) return; const values = new FormData(event.currentTarget);
    void operation.submit({ action: 'SET_GRANT', expectedRevision: revision, reason: String(values.get('reason')).trim(), grant: { employeeId, review: canReview, approve: canApprove } });
  }}><fieldset aria-disabled={operation.locked || undefined}>
    <label className="pw-check"><input type="checkbox" checked={canReview} onChange={event => { setReview(event.target.checked); if (!event.target.checked) setApprove(false); }} /><span>Review payroll amounts and documents</span></label>
    <label className="pw-check"><input type="checkbox" checked={canApprove} onChange={event => { setApprove(event.target.checked); if (event.target.checked) setReview(true); }} /><span>Approve an exact reviewed payroll revision</span></label>
    <label>Access change reason<textarea name="reason" required maxLength={300} rows={3} /></label>
    <p className="pw-small">Approval requires review access. Clear both permissions to revoke this grant. The server checks the current grant on every action.</p>
    <button type="submit" className="pw-button" aria-disabled={operation.locked || undefined}>Save payroll access</button>
  </fieldset></form>;
}
