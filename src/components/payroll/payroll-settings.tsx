'use client';

import { FormDiscardGuard } from '@/components/kit/discard-dialog';
import { createContext, useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { CaretRightIcon, PlusIcon, TrashIcon, WarningCircleIcon } from '@phosphor-icons/react/ssr';
import { CorpCard } from '../corp/corp';
import { SettingsPageB } from '@/app/app/settings/settings-b';
import { Feedback } from './payroll-feedback';
import { PayDateField } from './pay-date-field';
import './payroll-corp.css';
import type { PayrollPreferences, PayrollRule, PayrollSettingsResponse } from '@/lib/payroll/contracts';
import { NativePayrollConfig, type NativeConfigurationSources } from './native-payroll-config';
import { readSettings } from './api';
import { dollarsToMinor, minorToDollars } from './money';
import { usePayrollOperation, usePayrollResource } from './use-payroll';
import type { ReactNode } from 'react';
import { KeepFocusClear } from '../wave-b-forms';
import { PendingLabel } from '../employee-submit-button';
import { reminderWindow } from './workflow-status';
import { flagProblems, formKeys } from './form-keys';
import { PayrollTabs, type PayrollTab } from './payroll-tabs';
import { formatDateRange } from '@/lib/date-utils';
import { keepWhole } from '@/lib/keep-whole';
import { revealFeedback } from '@/lib/reveal-feedback';
import { usePayrollCopy, payrollCopyFor, type PayrollLang } from './payroll-copy';
import { periodRange } from './payroll-format';

/** IS-B27: which form sent the running save, so only its button says "Saving…". */
const SavingForm = createContext<[string | null, (id: string) => void]>([null, () => {}]);

/** Final fixes S2 (G85): a group of payroll settings with its label inside the card, as every other Settings page labels
 * its cards (Payroll itself keeps labels above its cards). The same section, id and heading as before. */
function SetGroup({ id, label, children }: { id: string; label: ReactNode; children: ReactNode }) {
  return <section id={id} className="c-pay__group" aria-labelledby={`${id}-label`}>
    <div className="c-card"><div className="c-card__head"><h2 className="c-card__label" id={`${id}-label`}>{label}</h2></div>{children}</div>
  </section>;
}
/** A kit card for one group of payroll settings (Phase 3.5 Wave B). Wording stays as approved. */
function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="c-pset__group" aria-label={title}>{description && <p className="wb-note">{description}</p>}{children}</section>;
}
/* TC-B-03: dates read whole and with their year; the wording around them is unchanged. */
/** Spanish months carry no period and September is "sep" (voice.md). */
const esDate = (text: string) => text.replace(/\./g, '').replace(/\bsept\b/g, 'sep');
function effectiveDate(date: string, lang: PayrollLang = 'en') {
  if (lang === 'es') return keepWhole(esDate(new Intl.DateTimeFormat('es-PR', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)))).replace(/^(\p{L}+), /u, '$1,\u00a0');
  return keepWhole(new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))).replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun), /, '$1,\u00a0');
}
function recordedAt(at: string, lang: PayrollLang = 'en') {
  if (lang === 'es') return keepWhole(esDate(new Intl.DateTimeFormat('es-PR', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(at))));
  return keepWhole(new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(at)));
}
/** Today in the company's time zone (not the device's), as YYYY-MM-DD, for effective-date defaults. */
export function today(timeZone: string, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
const BusinessZone = createContext('America/Puerto_Rico');
const defaults: PayrollPreferences = {
  companyName: '', language: 'en', currency: 'USD',
  schedule: { frequency: 'BIWEEKLY', anchorDate: '', paydayOffsetDays: 0 }, rules: [],
  automation: { prepare: false, publish: false, reminders: false, reminderLeadDays: [] }, bankProfile: null,
};
function integer(value: FormDataEntryValue | null, label: string, min: number, max: number, lang: PayrollLang = 'en') {
  const text = String(value ?? '');
  if (!/^\d+$/.test(text) || Number(text) < min || Number(text) > max) throw new Error(payrollCopyFor(lang).settings.wholeNumber(label, min, max));
  return Number(text);
}
function rulesFromForm(values: FormData, rules: PayrollRule[], lang: PayrollLang = 'en'): PayrollRule[] {
  return rules.map(rule => {
    const get = (key: string) => String(values.get(`rule-${rule.id}-${key}`) ?? '');
    const method = get('method') === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
    const percent = get('percent');
    const basis = method === 'PERCENTAGE' ? dollarsToMinor(percent, lang) : null;
    if (basis !== null && BigInt(basis) > BigInt(10000)) throw new Error(payrollCopyFor(lang).settings.percentRange);
    return {
      id: rule.id, name: get('name').trim(), kind: get('kind') === 'EMPLOYER_CONTRIBUTION' ? 'EMPLOYER_CONTRIBUTION' : 'EMPLOYEE_DEDUCTION',
      method, amountMinor: method === 'FIXED' ? dollarsToMinor(get('amount'), lang) : null, basisPoints: basis === null ? null : Number(basis),
      base: 'GROSS', applicability: get('applicability') === 'EMPLOYEE_ELECTION' ? 'EMPLOYEE_ELECTION' : 'ALL',
      effectiveFrom: get('from'), effectiveTo: get('to') || null, capMinor: get('cap') ? dollarsToMinor(get('cap'), lang) : null,
      remittance: get('remittance') === 'PROVIDER' ? 'PROVIDER' : 'EMPLOYER',
    };
  });
}

export function PayrollSettings({ recoveryScope, nativeSources = null, timeZone = 'America/Puerto_Rico', openSetup = false, tabs = null }: { recoveryScope: string; nativeSources?: NativeConfigurationSources|null; timeZone?: string; openSetup?: boolean; tabs?: PayrollTab[] | null }) {
  const resource = usePayrollResource('/api/payroll/settings', readSettings);
  const operation = usePayrollOperation('/api/payroll/settings', resource.reload, recoveryScope);
  const savingForm = useState<string | null>(null);
  const savingId = savingForm[0];
  const t = usePayrollCopy(), c = t.settings, lang = t.lang;
  // IS-B12: when a save ends, focus returns to that form's button instead of the page.
  useEffect(() => { if (!operation.busy && savingId && (!document.activeElement || document.activeElement === document.body)) document.querySelector<HTMLElement>(`form[data-form="${savingId}"] button[type="submit"]`)?.focus(); }, [operation.busy, savingId]);
  const data = !resource.loading && resource.data?.capabilities.canConfigure ? resource.data : null;
  const revision = data?.revisions.reduce((latest, item) => item.revision > (latest?.revision ?? 0) ? item : latest, data.revisions[0]);
  const exceptionCount = data ? new Set(data.exceptions.map(item => item.exception.employeeId)).size : 0;
  const latest = data ? [...data.revisions].sort((a, b) => b.revision - a.revision)[0] : undefined;
  const actorName = latest ? data?.employees.find(employee => employee.id === latest.actorId)?.name : undefined;
  // Corporate (Release 1, board O-PayrollSettings): grouped rows; each opens its own fields in place. Saving asks for the
  // effective date and a reason, as before. On desktop the Time and pay tabs lead here, so there is no Back.
  // Settings in Direction B (Nov 23, 2026): the shared Settings frame (‹ Payroll and the title on a phone's band, the
  // large title and the approved scope sentence on tablets and desktop), then the Time and pay tabs.
  /* Phase 8 (review B #35): the band says what payroll does, as Payroll above the same tabs does (the approved scope
     sentence, unchanged); "US dollars" read as a stray fact, and the currency is fixed. */
  // Phase 2 (J12, item 4): from 768, where Payroll's tabs show, the band names the section ("Payroll") and the selected
  // "Settings" tab names the page; the phone band (no tabs) keeps "Payroll settings".
  return <SettingsPageB className="c-pay c-pset" titleId="payroll-settings-title" title={c.title} wideTitle={tabs?.length ? c.payroll : undefined} back={{ href: '/app/payroll', label: c.payroll }} sub={c.scope}>
    <PayrollTabs items={tabs} current="/app/settings/payroll" />
    <BusinessZone.Provider value={timeZone}><SavingForm.Provider value={savingForm}>
    <KeepFocusClear />
    <Feedback operation={operation} />
    {resource.loading ? <p className="c-note" role="status">{c.loading}</p> : resource.error ? <CorpCard as="div" ariaLabel={c.title}><div className="c-card__body"><p className="c-pset__state" role="alert">{resource.error}</p><button type="button" className="c-btn c-btn--secondary c-btn--md" onClick={() => void resource.reload()}>{c.tryAgain}</button></div></CorpCard> : data && <>
      {!revision && <p className="c-note">{c.unsavedStart} {data.capabilities.internalCalculatorAvailable ? c.unsavedNative : c.unsavedImported}</p>}
      <CompanyPreferences key={revision?.revision ?? 0} preferences={revision?.preferences ?? defaults} revision={revision?.revision ?? 0} data={data} operation={operation} />
      <SetGroup id="payroll-people-settings" label={c.people}>
        <details className="c-pset__item"><SettingRow title={c.peopleDifferent} value={exceptionCount ? String(exceptionCount) : c.none} /><div className="c-pset__body"><EmployeeException data={data} preferences={revision?.preferences ?? defaults} operation={operation} /></div></details>
        {!data.capabilities.internalCalculatorAvailable && <details className="c-pset__item"><SettingRow title={c.payrollAccess} value={data.grants.length ? String(data.grants.length) : c.ownerOnly} /><div className="c-pset__body"><PayrollAccess data={data} operation={operation} /></div></details>}
        {(nativeSources !== null || data.capabilities.internalCalculatorAvailable) && <details className="c-pset__item" id="payroll-setup" open={openSetup || undefined}><SettingRow title={c.payrollSetup} detail={c.payrollSetupDetail} /><div className="c-pset__body payroll-workflow"><NativePayrollConfig settings={data} sources={nativeSources} recoveryScope={recoveryScope}/></div></details>}
      </SetGroup>
      <CorpCard as="div" ariaLabel={c.changeHistory}>
        <details className="c-pset__item"><SettingRow title={c.changeHistory} detail={latest ? (actorName ? c.changedBy(actorName.split(/\s+/)[0], shortDate(latest.createdAt, timeZone, lang)) : c.changed(shortDate(latest.createdAt, timeZone, lang))) : c.noChanges} /><div className="c-pset__body">{data.revisions.length ? <div className="c-pset__history">{[...data.revisions].sort((a, b) => b.revision - a.revision).map(item => <div key={item.revision}><strong>{c.revisionLine(item.revision, effectiveDate(item.effectiveFrom.slice(0, 10), lang))}</strong><p>{item.reason}</p><small>{c.recorded(recordedAt(item.createdAt, lang))}{data.employees.find(employee => employee.id === item.actorId) ? ` · ${data.employees.find(employee => employee.id === item.actorId)!.name}` : ''}</small></div>)}</div> : <p className="wb-note">{c.noRevisions}</p>}</div></details>
      </CorpCard>
    </>}
    {!data && !resource.loading && nativeSources !== null ? <div className="payroll-workflow"><NativePayrollConfig settings={data} sources={nativeSources} recoveryScope={recoveryScope}/></div> : null}
    </SavingForm.Provider></BusinessZone.Provider>
  </SettingsPageB>;
}

/** Review B5 (NV-024): change dates are the company's day, not the device's. */
const shortDate = (at: string, timeZone?: string, lang: PayrollLang = 'en') => lang === 'es'
  ? esDate(new Intl.DateTimeFormat('es-PR', { month: 'short', day: 'numeric', ...(timeZone ? { timeZone } : {}) }).format(new Date(at)))
  : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', ...(timeZone ? { timeZone } : {}) }).format(new Date(at));
/** A setting's row (kit row in a summary): title, optional 13px detail, the value and a chevron that turns when open. */
function SettingRow({ title, value, detail }: { title: string; value?: string; detail?: string }) {
  return <summary className={detail ? 'c-row' : 'c-row c-row--one'}><span className="c-row__main"><span className="c-row__title">{title}</span>{detail ? <span className="c-row__detail"><span>{detail}</span></span> : null}</span>{value ? <span className="c-row__value c-row__value--soft">{value}</span> : null}<CaretRightIcon className="c-chev" weight="bold" aria-hidden="true" /></summary>;
}

function CompanyPreferences({ preferences, revision, data, operation }: { preferences: PayrollPreferences; revision: number; data: PayrollSettingsResponse; operation: ReturnType<typeof usePayrollOperation> }) {
  const zone = useContext(BusinessZone);
  const t = usePayrollCopy(), c = t.settings, lang = t.lang;
  const [rules, setRules] = useState(preferences.rules);
  const [error, setError] = useState('');
  const [noticesEnabled, setNoticesEnabled] = useState(preferences.automation.reminders);
  const locked = operation.locked;
  const [savingId, setSaving] = useContext(SavingForm);
  const form = useRef<HTMLFormElement>(null),sent=useRef(false);
  useEffect(()=>{
    if(operation.busy||!sent.current)return;
    sent.current=false;
    const feedback=form.current?.closest('.c-pset')?.querySelector<HTMLElement>('.c-pay__feedback');
    if(feedback?.textContent?.trim()){feedback.tabIndex=-1;revealFeedback(feedback);}
  },[operation.busy]);
  const native = data.capabilities.internalCalculatorAvailable;
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if(locked)return; setError('');
    // Owner premium P10: every missing field at once (closed rows open), in this form's one error line.
    const problem = flagProblems(event.currentTarget); if (problem) { setError(problem); return; }
    setSaving('company'); const values = new FormData(event.currentTarget);
    try {
      const reminderLeadDays = values.has('reminders') ? [integer(values.get('reminderDays'), c.reminderWindow, 0, 31, lang)] : [];
      const next: PayrollPreferences = {
        companyName: String(values.get('companyName')).trim(), currency: 'USD', language: values.get('language') === 'es' ? 'es' : 'en',
        schedule: { frequency: preferences.schedule.frequency, anchorDate: String(values.get('anchorDate')), paydayOffsetDays: integer(values.get('paydayOffset'), c.paydayOffset, 0, 31, lang) },
        rules: native ? preferences.rules : rulesFromForm(values, rules, lang), automation: { prepare: values.has('prepare'), publish: native ? preferences.automation.publish : values.has('publish'), reminders: values.has('reminders'), reminderLeadDays: [...new Set(reminderLeadDays)] },
        bankProfile: native ? preferences.bankProfile : values.get('bankProfile') === 'NEUTRAL_UNVERIFIED' ? 'NEUTRAL_UNVERIFIED' : null,
      };
      const frequency = values.get('frequency');
      if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY' || frequency === 'SEMIMONTHLY' || frequency === 'MONTHLY') next.schedule.frequency = frequency;
      const provider = native ? preferences.sourceProvider : values.get('sourceProvider'), channel = native ? preferences.bankChannel : values.get('bankChannel');
      if (provider === 'ADP_RUN' || provider === 'QUICKBOOKS_PAYROLL' || provider === 'PAYCHEX' || provider === 'GUSTO' || provider === 'OTHER') next.sourceProvider = provider;
      if (channel === 'POPULAR_WCM_TEXT' || channel === 'POPULAR_WCM_NACHA' || channel === 'POPULAR_COMMERCIAL_MANUAL' || channel === 'OTHER') next.bankChannel = channel;
      sent.current=true;
      void operation.submit({ action: 'SAVE_SETTINGS', expectedRevision: revision, effectiveFrom: String(values.get('effectiveFrom')), reason: String(values.get('reason')).trim(), preferences: next });
    } catch (failure) { setError(failure instanceof Error ? failure.message : c.checkPreferences); }
  };
  // Quiet (v4, approved Oct 23): the company form is the mockup's rows; each opens its own fields under it. The
  // effective date, reason and save show while any of them is open. Field labels and notes are unchanged.
  const frequencyLabel = c.frequencies[preferences.schedule.frequency];
  const offset = preferences.schedule.paydayOffsetDays;
  const anchor = preferences.schedule.anchorDate;
  const length = preferences.schedule.frequency === 'WEEKLY' ? 7 : preferences.schedule.frequency === 'BIWEEKLY' ? 14 : 0;
  const paydayValue = !anchor ? c.notSet : length ? new Intl.DateTimeFormat(lang === 'es' ? 'es-PR' : 'en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.parse(`${anchor}T12:00:00Z`) + (length - 1 + offset) * 86_400_000))
    : offset ? c.daysAfter(offset) : c.periodEnd;
  const anchorValue = anchor ? esDate(new Intl.DateTimeFormat(lang === 'es' ? 'es-PR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${anchor}T12:00:00Z`))) : '';
  const lead = reminderWindow(preferences.automation.reminderLeadDays);
  const reminderValue = !preferences.automation.reminders ? c.off : lead === 0 ? c.onPayday : c.daysBefore(lead);
  return <form ref={form} className="c-pset__form" data-form="company" {...formKeys} onSubmit={save} aria-label={c.companyDefaults(revision)}>{/* Leaving with payroll settings that are not saved asks first (Nov 21, 2026); a saved revision starts clean. */}<FormDiscardGuard resetKey={revision} /><fieldset disabled={locked} className="c-pset__fields">
    <SetGroup id="payroll-schedule" label={c.paySchedule}>
    <details className="c-pset__item"><SettingRow title={c.howOften} value={frequencyLabel} /><div className="c-pset__body wb-form">
      <label>{c.frequency}<select aria-label={c.frequency} name="frequency" defaultValue={preferences.schedule.frequency}><option value="WEEKLY">{c.frequencies.WEEKLY}</option><option value="BIWEEKLY">{c.frequencies.BIWEEKLY}</option><option value="SEMIMONTHLY">{c.frequencies.SEMIMONTHLY}</option><option value="MONTHLY">{c.frequencies.MONTHLY}</option></select></label>
    </div></details>
    <details className="c-pset__item"><SettingRow title={c.payday} value={paydayValue} /><div className="c-pset__body wb-form">
      <label>{c.paydayAfter}<input type="number" inputMode="numeric" autoComplete="off" name="paydayOffset" min={0} max={31} required defaultValue={preferences.schedule.paydayOffsetDays} /><small className="wb-help">{c.paydayAfterHelp}</small></label>
    </div></details>
    <details className="c-pset__item"><SettingRow title={c.firstPeriod} value={anchor ? (anchor <= today(zone) ? c.started(anchorValue) : c.starts(anchorValue)) : c.notSet} /><div className="c-pset__body wb-form">
      <PayDateField name="anchorDate" label={c.anchorDate} required defaultValue={preferences.schedule.anchorDate} />
      <p className="wb-note">{c.anchorNoteA}<span className="nv-nowrap">{c.anchorNoteRange1}</span>{c.anchorNoteAnd}<span className="nv-nowrap">{c.anchorNoteRange2}</span>{c.anchorNoteB}</p>
    </div></details>
    </SetGroup>
    <SetGroup id="payroll-notices" label={c.remindersGroup}>
    <details className="c-pset__item"><SettingRow title={c.payrollReminders} value={reminderValue} /><div className="c-pset__body wb-form">
      <p className="wb-note">{c.draftsNote}</p><label className="wb-check"><input name="prepare" type="checkbox" defaultChecked={preferences.automation.prepare} /><span>{c.prepareDrafts}</span></label>{!native && <label className="wb-check"><input name="publish" type="checkbox" defaultChecked={preferences.automation.publish} /><span>{c.shareAfterApproval}</span></label>}{native && <p className="wb-note">{c.nativeShareNote}</p>}<label className="wb-check"><input name="reminders" type="checkbox" checked={noticesEnabled} onChange={event => setNoticesEnabled(event.target.checked)} /><span>{c.queueNotices}</span></label><label>{c.reminderWindow}<input aria-label={c.reminderWindow} aria-describedby="payroll-notice-window-help" name="reminderDays" type="number" inputMode="numeric" autoComplete="off" min={0} max={31} required={noticesEnabled} disabled={!noticesEnabled} defaultValue={reminderWindow(preferences.automation.reminderLeadDays)} /><small className="wb-help" id="payroll-notice-window-help">{c.reminderWindowHelp}</small></label><p className="wb-note">{c.noticeNote}</p>{data.capabilities.noticeDelivery !== 'ENABLED' ? <p className="wb-note">{c.noticeOff}</p> : null}
    </div></details>
    <details className="c-pset__item"><SettingRow title={c.statementLanguage} value={preferences.language === 'es' ? 'Español' : 'English'} /><div className="c-pset__body wb-form">
      <label>{c.companyName}<input name="companyName" autoComplete="organization" defaultValue={preferences.companyName} maxLength={160} required /></label>
      <label>{c.defaultLanguage}<select aria-label={c.defaultLanguage} name="language" defaultValue={preferences.language}><option value="en">English</option><option value="es">Español</option></select></label>
      {!native && <label>{c.providerPreference}<select aria-label={c.providerPreference} name="sourceProvider" defaultValue={preferences.sourceProvider ?? ''}><option value="">{c.noProvider}</option><option value="ADP_RUN">ADP RUN</option><option value="QUICKBOOKS_PAYROLL">QuickBooks Payroll</option><option value="PAYCHEX">Paychex</option><option value="GUSTO">Gusto</option><option value="OTHER">{c.otherProvider}</option></select></label>}
      <p className="wb-note">{native ? c.nativeProviderNote : c.importedProviderNote}</p>
    </div></details>
    {!native && <details className="c-pset__item"><SettingRow title={c.deductionsGroup} value={rules.length ? String(rules.length) : c.none} /><div className="c-pset__body wb-form"><p className="wb-note">{c.rulesNote}</p><RuleEditor rules={rules} onChange={setRules} /><button className="c-btn c-btn--secondary c-btn--md" type="button" data-add-rule="" onClick={() => setRules(items => [...items, newRule(zone)])}><PlusIcon weight="bold" className="c-ic c-ic--s" aria-hidden />{c.addRule}</button></div></details>}
    {!native && <details className="c-pset__item"><SettingRow title={c.paymentInstructions} value={preferences.bankProfile ? c.standardFile : c.none} /><div className="c-pset__body wb-form">
      <label>{c.paymentFormat}<select aria-label={c.paymentFormat} name="bankProfile" defaultValue={preferences.bankProfile ?? ''}><option value="">{c.noPaymentFile}</option><option value="NEUTRAL_UNVERIFIED">{c.standardFileUntested}</option></select></label>
      <label>{c.bankPlan}<select aria-label={c.bankPlan} name="bankChannel" defaultValue={preferences.bankChannel ?? ''}><option value="">{c.noBank}</option><option value="POPULAR_WCM_TEXT">{c.popularText}</option><option value="POPULAR_WCM_NACHA">{c.popularNacha}</option><option value="POPULAR_COMMERCIAL_MANUAL">{c.popularManual}</option><option value="OTHER">{c.otherBank}</option></select></label>
      <p className="wb-note">{c.paymentNote}</p>
    </div></details>}
    </SetGroup>
    <div className="c-card c-pset__savecard"><div className="c-pset__save wb-form"><PayDateField name="effectiveFrom" label={c.effectiveDate} required defaultValue={today(zone)} /><label>{c.reasonForChange}<input name="reason" autoComplete="off" required maxLength={300} /></label><ImpactPreview data={data} /><p className="wb-note">{c.approvedNote}</p>{error && <p className="wb-error" role="alert"><WarningCircleIcon size={18} weight="bold" aria-hidden /><span>{error}</span></p>}
      <button type="submit" className="c-btn c-btn--full" aria-disabled={locked}><PendingLabel pending={operation.busy && savingId === 'company'} pendingText={c.saving}>{c.saveCompany}</PendingLabel></button></div></div>
  </fieldset></form>;
}

function newRule(timeZone: string): PayrollRule { return { id: crypto.randomUUID(), name: '', kind: 'EMPLOYEE_DEDUCTION', method: 'FIXED', amountMinor: null, basisPoints: null, base: 'GROSS', applicability: 'ALL', effectiveFrom: today(timeZone), effectiveTo: null, capMinor: null, remittance: 'EMPLOYER' }; }
function RuleEditor({ rules, onChange }: { rules: PayrollRule[]; onChange: (rules: PayrollRule[]) => void }) {
  const c = usePayrollCopy().settings;
  return <div className="wb-rule-list">{rules.length === 0 && <p className="wb-note">{c.noRules}</p>}{rules.map((rule, index) => {
    const name = (key: string) => `rule-${rule.id}-${key}`;
    return <fieldset className="wb-rule" key={rule.id}>
      <legend>{c.rule(index + 1)}</legend>
      <div className="wb-grid">
        <label>{c.ruleName}<input name={name('name')} autoComplete="off" defaultValue={rule.name} required maxLength={100} /></label>
        <label>{c.type}<select name={name('kind')} defaultValue={rule.kind}><option value="EMPLOYEE_DEDUCTION">{c.employeeDeduction}</option><option value="EMPLOYER_CONTRIBUTION">{c.employerContribution}</option></select></label>
        <label>{c.method}<select name={name('method')} value={rule.method} onChange={event => onChange(rules.map(item => item.id === rule.id ? { ...item, method: event.target.value === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED' } : item))}><option value="FIXED">{c.fixedAmount}</option><option value="PERCENTAGE">{c.percentOfGrossOption}</option></select></label>
        {rule.method === 'FIXED' ? <label>{c.amountUsd}<input name={name('amount')} inputMode="decimal" required defaultValue={rule.amountMinor === null ? '' : minorToDollars(rule.amountMinor)} placeholder="0.00" /></label> : <label>{c.percentOfGross}<input name={name('percent')} inputMode="decimal" required defaultValue={rule.basisPoints === null ? '' : minorToDollars(String(rule.basisPoints))} placeholder="0.00" /></label>}
        <label>{c.appliesTo}<select name={name('applicability')} defaultValue={rule.applicability}><option value="ALL">{c.allEmployees}</option><option value="EMPLOYEE_ELECTION">{c.employeeElection}</option></select></label>
        <label>{c.whoSends}<select name={name('remittance')} defaultValue={rule.remittance}><option value="EMPLOYER">{c.employer}</option><option value="PROVIDER">{c.provider}</option></select><small className="wb-help">{c.whoSendsHelp}</small></label>
        <label>{c.effectiveFrom}<input name={name('from')} type="date" defaultValue={rule.effectiveFrom} required /></label>
        <label>{c.effectiveThrough}<input name={name('to')} type="date" defaultValue={rule.effectiveTo ?? ''} /></label>
        <label>{c.usdCap}<input name={name('cap')} inputMode="decimal" defaultValue={rule.capMinor === null ? '' : minorToDollars(rule.capMinor)} placeholder={c.noCap} /></label>
      </div>
      <button type="button" className="c-btn c-btn--danger c-btn--md" onClick={event => { const form = event.currentTarget.form; onChange(rules.filter(item => item.id !== rule.id)); requestAnimationFrame(() => form?.querySelector<HTMLElement>("[data-add-rule]")?.focus()); }}><TrashIcon weight="bold" className="c-ic c-ic--s" aria-hidden />{c.removeRule(index + 1)}</button>
    </fieldset>;
  })}</div>;
}
function ImpactPreview({ data }: { data: PayrollSettingsResponse }) {
  const t = usePayrollCopy(), c = t.settings;
  const range = (start: string, end: string) => t.lang === 'es' ? periodRange(start, end, 'es') : formatDateRange(start, end);
  return <div className="wb-box wb-impact"><strong>{c.futureImpact}</strong>{data.futureDraftImpact.length ? <ul>{data.futureDraftImpact.map(item => <li key={item.runId}>{keepWhole(range(item.period.startDate, item.period.endDate))}: {item.reason}</li>)}</ul> : <p>{c.noImpact}</p>}</div>;
}

function EmployeeException({ data, preferences, operation }: { data: PayrollSettingsResponse; preferences: PayrollPreferences; operation: ReturnType<typeof usePayrollOperation> }) {
  const [employeeId, setEmployeeId] = useState(data.employees.find(employee => employee.active)?.id ?? '');
  const exception = data.exceptions.filter(item => item.exception.employeeId === employeeId).sort((a, b) => b.revision - a.revision)[0];
  const c = usePayrollCopy().settings;
  return <SettingsCard title={c.employeeExceptions} description={c.exceptionsDescription}><label>{c.employee}<select aria-label={c.employee} value={employeeId} onChange={event => setEmployeeId(event.target.value)} disabled={operation.locked}><option value="">{c.chooseEmployee}</option>{data.employees.filter(employee => employee.active).map(employee => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select></label>{employeeId && <ExceptionForm key={`${employeeId}:${exception?.revision ?? 0}`} employeeId={employeeId} revision={exception?.revision ?? 0} language={exception?.exception.language ?? null} initialRules={exception?.exception.rules ?? null} preferences={preferences} data={data} operation={operation} />}</SettingsCard>;
}
function ExceptionForm({ employeeId, revision, language, initialRules, preferences, data, operation }: { employeeId: string; revision: number; language: 'en' | 'es' | null; initialRules: PayrollRule[] | null; preferences: PayrollPreferences; data: PayrollSettingsResponse; operation: ReturnType<typeof usePayrollOperation> }) {
  const zone = useContext(BusinessZone);
  const native = data.capabilities.internalCalculatorAvailable;
  const t = usePayrollCopy(), c = t.settings, lang = t.lang;
  const [inherit, setInherit] = useState(initialRules === null);
  const [rules, setRules] = useState(initialRules ?? preferences.rules);
  const [error, setError] = useState('');
  const [savingId, setSaving] = useContext(SavingForm);
  return <form className="wb-form" data-form="exception" {...formKeys} onSubmit={event => {
    event.preventDefault(); setError('');
    const problem = flagProblems(event.currentTarget); if (problem) { setError(problem); return; }
    setSaving('exception'); const values = new FormData(event.currentTarget);
    try { const chosen = values.get('exceptionLanguage'); void operation.submit({ action: 'SAVE_EXCEPTION', expectedRevision: revision, effectiveFrom: String(values.get('effectiveFrom')), reason: String(values.get('reason')).trim(), exception: { employeeId, language: chosen === 'en' || chosen === 'es' ? chosen : null, rules: native ? initialRules : inherit ? null : rulesFromForm(values, rules, lang) } }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : c.checkException); }
  }}>{/* Leaving with payroll settings that are not saved asks first (Nov 21, 2026); a saved revision starts clean. */}<FormDiscardGuard resetKey={revision} /><fieldset disabled={operation.locked} className="wb-form">
    <p className="wb-note">{c.exceptionRevision(revision)}{native ? c.exceptionNative : c.exceptionImported}</p>
    <label>{c.exceptionLanguage}<select aria-label={c.exceptionLanguage} name="exceptionLanguage" defaultValue={language ?? ''}><option value="">{c.inheritLanguage}</option><option value="en">English</option><option value="es">Español</option></select></label>
    {!native && <label className="wb-check"><input type="checkbox" checked={inherit} onChange={event => setInherit(event.target.checked)} /><span>{c.inheritRules}</span></label>}
    {!native && !inherit && <><RuleEditor rules={rules} onChange={setRules} /><button className="c-btn c-btn--secondary c-btn--md" type="button" data-add-rule="" onClick={() => setRules(items => [...items, newRule(zone)])}><PlusIcon weight="bold" className="c-ic c-ic--s" aria-hidden />{c.addEmployeeRule}</button></>}
    <PayDateField name="effectiveFrom" label={c.exceptionEffective} required defaultValue={today(zone)} /><label>{c.exceptionReason}<input name="reason" autoComplete="off" required maxLength={300} /></label>
    <ImpactPreview data={data} />{error && <p className="wb-error" role="alert"><WarningCircleIcon size={18} weight="bold" aria-hidden /><span>{error}</span></p>}
    <button className="c-btn c-btn--full" type="submit">{operation.busy && savingId === 'exception' ? c.saving : c.saveException}</button>
  </fieldset></form>;
}

function PayrollAccess({ data, operation }: { data: PayrollSettingsResponse; operation: ReturnType<typeof usePayrollOperation> }) {
  const [employeeId, setEmployeeId] = useState('');
  const grant = data.grants.find(item => item.employeeId === employeeId);
  const c = usePayrollCopy().settings;
  if (data.capabilities.internalCalculatorAvailable) return <SettingsCard title={c.payrollAccess} description={c.accessNativeDescription}><p className="pw-small">{c.accessNativeNote}</p></SettingsCard>;
  return <SettingsCard title={c.payrollAccess} description={c.accessDescription}><label>{c.grantRecipient}<select aria-label={c.grantRecipient} value={employeeId} onChange={event => setEmployeeId(event.target.value)} disabled={operation.locked}><option value="">{c.chooseEmployee}</option>{data.employees.filter(employee => employee.active).map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>{employeeId && <GrantForm key={`${employeeId}:${grant?.revision ?? 0}`} employeeId={employeeId} revision={grant?.revision ?? 0} review={grant?.review ?? false} approve={grant?.approve ?? false} operation={operation} />}</SettingsCard>;
}
function GrantForm({ employeeId, revision, review, approve, operation }: { employeeId: string; revision: number; review: boolean; approve: boolean; operation: ReturnType<typeof usePayrollOperation> }) {
  const [canReview, setReview] = useState(review);
  const [canApprove, setApprove] = useState(approve);
  const [savingId, setSaving] = useContext(SavingForm);
  const [error, setError] = useState('');
  const c = usePayrollCopy().settings;
  return <form className="wb-form" data-form="access" {...formKeys} onSubmit={event => {
    event.preventDefault(); setError('');
    const problem = flagProblems(event.currentTarget); if (problem) { setError(problem); return; }
    setSaving('access'); const values = new FormData(event.currentTarget);
    void operation.submit({ action: 'SET_GRANT', expectedRevision: revision, reason: String(values.get('reason')).trim(), grant: { employeeId, review: canReview, approve: canApprove } });
  }}>{/* Leaving with payroll settings that are not saved asks first (Nov 21, 2026); a saved revision starts clean. */}<FormDiscardGuard resetKey={revision} /><fieldset disabled={operation.locked} className="wb-form">
    <label className="wb-check"><input type="checkbox" checked={canReview} onChange={event => { setReview(event.target.checked); if (!event.target.checked) setApprove(false); }} /><span>{c.reviewAccess}</span></label>
    <label className="wb-check"><input type="checkbox" checked={canApprove} onChange={event => { setApprove(event.target.checked); if (event.target.checked) setReview(true); }} /><span>{c.approveAccess}</span></label>
    <label>{c.accessReason}<textarea name="reason" required maxLength={300} rows={3} /></label>
    <p className="wb-note">{c.accessNote}</p>
    {error && <p className="wb-error" role="alert"><WarningCircleIcon size={18} weight="bold" aria-hidden /><span>{error}</span></p>}
    <button type="submit" className="c-btn c-btn--full">{operation.busy && savingId === 'access' ? c.saving : c.saveAccess}</button>
  </fieldset></form>;
}
