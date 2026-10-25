'use client';

import { useState, type FormEvent } from 'react';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import type { PayrollCapabilities, PayrollMissingPeriod, PayrollPeriod, PayrollRun } from '@/lib/payroll/contracts';
import { QuietGroup, QuietHeader, QuietNav, QuietPage, QuietRow } from '../quiet/quiet';
import { formatPayrollMoney } from './money';
import { payrollSteps } from './payroll-stepper';
import { mealWarningText, mealWarningsOf, payrollFixGroups, payrollReviewNotes } from './workflow-status';
import type { usePayrollOperation } from './use-payroll';
import '../quiet/u4.css';

/* T-14 (final pass, Oct 25, 2026): Payroll period review as a pushed Quiet page on phones. ‹ Payroll, the period and its
 * payday, the steps as rows, "Needs fixing" grouped by kind in the Owner's voice, the amounts, and one primary action.
 * Every command, guard and legal sentence is the one the detailed review uses; the detailed review stays one row away
 * ("All payroll details") for import, employee amounts, corrections, documents and delivery. Wider screens keep it. */

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
export function quietPayrollRange(start: string, end: string) {
  const month = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' }).format(utcDay(date));
  return start.slice(0, 7) === end.slice(0, 7) ? `${month(start)} ${Number(start.slice(8))} – ${Number(end.slice(8))}` : `${month(start)} ${Number(start.slice(8))} – ${month(end)} ${Number(end.slice(8))}`;
}
export const quietPayrollDay = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(utcDay(date));
const people = (count: number) => `${count} ${count === 1 ? 'person' : 'people'}`;
const stepTitle = { hours: 'Timecards', review: 'Pay facts', amounts: 'Amounts', approve: 'Approve', publish: 'Statements' } as const;
type Operation = ReturnType<typeof usePayrollOperation>;

/** The operation's result and recovery, in the kit's voice. The words and the recovery actions are unchanged. */
export function QuietOperationFeedback({ operation }: { operation: Operation }) {
  if (!operation.error && !operation.message && !operation.pending) return null;
  return <div className="q-u4-feedback" aria-live="polite">
    {operation.error ? <p className="q-error" role="alert">{operation.error}</p> : null}
    {operation.message ? <p className="q-help q-u4-feedback__ok">{operation.message}</p> : null}
    {operation.pending ? <div className="q-u4-recovery">
      <div className="q-grp"><h2>{operation.busy ? 'Recording action…' : 'Check an unconfirmed action'}</h2></div>
      <p className="q-help">Keep this reference until the server confirms the result.</p>
      <p className="q-help"><code>{operation.pending}</code></p>
      {operation.resuming ? <p className="q-help">Re-enter the original action below. Its saved reference will be reused; no new action reference will be created.</p> : null}
      <button className="q-btn q-btn--sec" type="button" disabled={operation.busy} onClick={() => void operation.check()}>Check action reference</button>
      {operation.retryAvailable ? <button className="q-btn q-btn--sec" type="button" disabled={operation.busy} onClick={() => void operation.retry()}>Retry same action</button> : null}
      {operation.resumeAvailable ? <button className="q-btn q-btn--quiet" type="button" onClick={operation.resume}>Re-enter original action</button> : null}
      {operation.resuming ? <button className="q-btn q-btn--quiet" type="button" onClick={operation.pauseResume}>Pause re-entry</button> : null}
    </div> : null}
  </div>;
}

export function PayrollReviewQuiet({ run, capabilities, operation, locked, details, onBack, onDetails }: {
  run: PayrollRun; capabilities: PayrollCapabilities; operation: Operation; locked: boolean; details: boolean; onBack: () => void; onDetails: () => void;
}) {
  const [reviewed, setReviewed] = useState(false);
  const native = run.sourceAuthority === 'NATIVE_RECORDED_TIME';
  const notes = payrollReviewNotes(run.exceptions);
  const groups = payrollFixGroups(run.exceptions, capabilities.canConfigure ? 'OWNER' : 'OTHER');
  const meals = mealWarningsOf((run as PayrollRun & { mealWarnings?: unknown }).mealWarnings);
  const steps = payrollSteps(run);
  const order = ['hours', 'review', 'amounts', 'approve', 'publish'] as const;
  const statements = run.documents.filter(document => document.kind === 'EMPLOYEE_STATEMENT');
  const published = statements.filter(document => document.published).length;
  return <QuietPage className="q-payroll-quiet q-payroll-phone">
    <QuietNav left={<button type="button" className="q-nav__l q-u4-navbtn" onClick={onBack}><CaretLeftIcon className="q-ic q-ic--s" aria-hidden="true" />Payroll</button>} />
    <QuietHeader title={quietPayrollRange(run.period.startDate, run.period.endDate)} sub={`Payday ${quietPayrollDay(run.payday)} · Revision ${run.revision}${run.correctionOf ? ' · Correction' : ''}`} />
    <QuietOperationFeedback operation={operation} />
    <QuietGroup label="Steps" id="payroll-steps"><ul className="q-list" aria-label="Payroll progress">
      {order.map(id => steps.find(step => step.id === id)!).map(step => <li key={step.id}><div className="q-row" aria-current={step.state === 'current' || step.state === 'blocked' ? 'step' : undefined}>
        <span className="q-rt"><b>{stepTitle[step.id]}</b><i>{step.hint}</i></span>
        {step.state === 'done' ? <CheckIcon className="q-check" aria-label="Done" /> : <span className={`q-rv${step.state === 'blocked' ? ' q-rv--alert' : ''}`}>{step.state === 'blocked' ? 'To fix' : step.state === 'current' ? 'Now' : 'Later'}</span>}
      </div></li>)}
    </ul></QuietGroup>
    {groups.length ? <section aria-labelledby="payroll-fix-title">
      <div className="q-sec"><h2 id="payroll-fix-title">Needs fixing</h2><span className="q-sec__aside">{groups.length}</span></div>
      <ul className="q-list">{groups.map(group => group.references.length ? <li key={group.key}><details className="q-details">
        <summary className="q-row"><span className="q-rt"><b>{group.title}</b>{group.action ? <i>{group.action}</i> : null}</span><span className="q-rv">{people(group.references.length)}</span><CaretRightIcon className="q-chev" aria-hidden="true" /></summary>
        <div className="q-details__body"><ul className="q-u4-refs" aria-label={`${group.title}: employee IDs`}>{group.references.map(reference => <li key={reference}>{reference}</li>)}</ul></div>
      </details></li> : <QuietRow key={group.key} title={group.title} detail={group.action || undefined} />)}</ul>
    </section> : null}
    {meals.length ? <QuietGroup label="Meal periods to review" id="payroll-meals"><ul className="q-list">
      <QuietRow icon={<WarningIcon className="q-ic" aria-hidden="true" />} title={`${meals.length} meal ${meals.length === 1 ? 'warning' : 'warnings'}`} detail={[...new Set(meals.map(mealWarningText))].join(' · ')} />
    </ul><p className="q-help">These don’t block payroll. No penalty pay is added.</p></QuietGroup> : null}
    {run.totals ? <QuietGroup label="Amounts" id="payroll-amounts"><ul className="q-list">
      <QuietRow title="Gross pay" value={formatPayrollMoney(run.totals.grossMinor)} tone="l" />
      <QuietRow title="Employee deductions" value={formatPayrollMoney(run.totals.deductionsMinor)} tone="l" />
      <QuietRow title="Employer contributions" value={formatPayrollMoney(run.totals.employerContributionsMinor)} tone="l" />
      <QuietRow title={`Net pay · ${people(run.totals.employeeCount)}`} value={formatPayrollMoney(run.totals.netMinor)} tone="ink" />
    </ul></QuietGroup> : null}
    {run.status === 'APPROVED' ? <QuietGroup label="Statements" id="payroll-statements"><ul className="q-list">
      <li><button type="button" className="q-row q-row--one q-row--btn" onClick={onDetails}><span className="q-rt"><b>Employee statements</b></span>
        <span className="q-rv q-rv--l">{statements.length ? `${published} of ${statements.length} published` : 'None yet'}</span><CaretRightIcon className="q-chev" aria-hidden="true" /></button></li>
    </ul></QuietGroup> : null}
    {native && run.status !== 'APPROVED' ? <>
      <button className="q-btn" type="button" disabled={locked || !capabilities.canReview} onClick={() => void operation.submit({ action: 'RECALCULATE', runId: run.id, expectedRevision: run.revision })}>Recalculate</button>
      <p className="q-help q-help--c">{notes.blocking.length ? 'Fix the items above, then recalculate.' : 'Recalculating makes a fresh revision to review. It doesn’t approve or finalize timecards.'}</p>
    </> : null}
    {!native && run.status === 'WAITING_FOR_AMOUNTS' ? <button className="q-btn" type="button" onClick={onDetails}>Import provider amounts</button> : null}
    {run.status === 'REVIEW_REQUIRED' ? capabilities.canApprove ? <div className="q-u4-approve">
      <ul className="q-list"><li><label className="q-row q-u4-check">
        <span className="q-rt"><b>I reviewed revision {run.revision}, {native ? 'the recorded-time calculation' : 'the provider amounts'} and all employee details.</b></span>
        <input type="checkbox" className="q-tog" checked={reviewed} onChange={event => setReviewed(event.target.checked)} disabled={locked || operation.revisionConflict} />
      </label></li></ul>
      <button className="q-btn" type="button" disabled={locked || operation.revisionConflict || !reviewed || !run.reviewToken || !run.rows || !run.totals || notes.blocking.length > 0} onClick={() => run.reviewToken && void operation.submit({ action: 'APPROVE', runId: run.id, expectedRevision: run.revision, reviewToken: run.reviewToken })}>Approve revision {run.revision}</button>
      <p className="q-help q-help--c">Approval freezes the reviewed amounts, finalized time, settings and employee exceptions.</p>
    </div> : <p className="q-help">An authorized payroll approver must approve this revision.</p> : null}
    <ul className="q-list q-u4-foot"><li><button type="button" className="q-row q-row--one q-row--btn" aria-expanded={details} onClick={onDetails}>
      <span className="q-rt"><b>{details ? 'Hide payroll details' : 'All payroll details'}</b></span><CaretRightIcon className="q-chev" aria-hidden="true" /></button></li></ul>
  </QuietPage>;
}

/** T-14: a new draft as a modal page (Cancel · New payroll draft · Create). The same PREPARE command and wording. */
export function PayrollDraftQuiet({ initial, operation, locked, onCancel }: {
  initial: { period: PayrollPeriod; payday: string; missing?: PayrollMissingPeriod } | null; operation: Operation; locked: boolean; onCancel: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const ambiguous = initial?.missing?.state === 'AMBIGUOUS_TRANSITION';
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ambiguous && !acknowledged) return;
    const values = new FormData(event.currentTarget);
    void operation.submit({ action: 'PREPARE', period: { startDate: String(values.get('start')), endDate: String(values.get('end')) }, payday: String(values.get('payday')) });
  };
  return <QuietPage className="q-payroll-quiet q-payroll-phone">
    <form id="q-payroll-draft" onSubmit={submit}>
      <QuietNav left={<button type="button" className="q-nav__l q-nav__l--teal q-u4-navbtn" onClick={onCancel}>Cancel</button>} title="New payroll draft"
        right={<button type="submit" className="q-nav__r q-nav__r--b" disabled={locked || (ambiguous && !acknowledged)}>Create</button>} />
      <QuietOperationFeedback operation={operation} />
      <fieldset className="q-fieldset" disabled={locked}>
        <ul className="q-list q-tc-dates q-u4-first">
          <li><label className="q-row q-row--one q-input-row"><span className="q-rt"><b>Start</b></span><input name="start" type="date" required aria-label="Period start" defaultValue={initial?.period.startDate} /></label></li>
          <li><label className="q-row q-row--one q-input-row"><span className="q-rt"><b>End</b></span><input name="end" type="date" required aria-label="Period end" defaultValue={initial?.period.endDate} /></label></li>
          <li><label className="q-row q-row--one q-input-row"><span className="q-rt"><b>Payday</b></span><input name="payday" type="date" required aria-label="Payday" defaultValue={initial?.payday} /></label></li>
        </ul>
        {ambiguous ? <>
          <QuietGroup label="Review the schedule transition" id="payroll-transition"><ul className="q-list">{initial!.missing!.issues.map((issue, index) => <QuietRow key={index} title={issue} />)}</ul></QuietGroup>
          <ul className="q-list"><li><label className="q-row q-u4-check"><span className="q-rt"><b>I reviewed this schedule transition, period boundaries and payday.</b></span>
            <input type="checkbox" className="q-tog" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /></label></li></ul>
        </> : null}
      </fieldset>
      <p className="q-help">A draft doesn’t finalize hours, approve amounts or send a payment.</p>
    </form>
  </QuietPage>;
}
