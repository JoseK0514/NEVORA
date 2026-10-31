'use client';

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CorpAvatar, CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpNav, CorpPage, CorpPill, CorpRow, CorpRows, CorpTitle } from '../corp/corp';
import './payroll-home-corp.css';
import './payroll-corp.css';
import type { OpenPayPeriod } from '@/lib/payroll/pay-calendar.server';
import type { PayrollCapabilities, PayrollJob, PayrollMissingPeriod, PayrollRun, PayrollRunsResponse } from '@/lib/payroll/contracts';
import { parsePayrollImport, readRuns } from './api';
import { formatPayrollMoney } from './money';
import { usePayrollOperation, usePayrollResource } from './use-payroll';
import { NativeReview } from './native-review';
import { PortalStatements } from './portal-statements';
import { backlogDescription, noticeOutcome, payrollExceptionMessage, payrollReviewNotes } from './workflow-status';
import { PayDateField } from './pay-date-field';
import { DocumentRow } from './document-row';
import { Feedback } from './payroll-feedback';

export type PayrollView = 'home' | 'review' | 'fix' | 'people' | 'prepare' | 'history';
type Operation = ReturnType<typeof usePayrollOperation>;

const statusLabels = { BLOCKED: 'Needs attention', WAITING_FOR_AMOUNTS: 'Waiting for amounts', REVIEW_REQUIRED: 'Review required', APPROVED: 'Approved' };
const statusTone = { BLOCKED: 'red', WAITING_FOR_AMOUNTS: 'neutral', REVIEW_REQUIRED: 'amber', APPROVED: 'teal' } as const;
const jobLabels = { PREPARE: 'Draft preparation', PDF: 'PDF generation', PUBLISH: 'Statement publication', REMINDER: 'Private payroll notice' };
const FREQUENCY = { WEEKLY: 'Weekly', BIWEEKLY: 'Every two weeks', SEMIMONTHLY: 'Twice a month', MONTHLY: 'Monthly' } as const;

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
/** "Oct 19 – 25", or "Sep 28 – Oct 4". */
function quietRange(start: string, end: string) {
  const month = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' }).format(utcDay(date));
  return start.slice(0, 7) === end.slice(0, 7) ? `${month(start)} ${Number(start.slice(8))} – ${Number(end.slice(8))}` : `${month(start)} ${Number(start.slice(8))} – ${month(end)} ${Number(end.slice(8))}`;
}
const quietDay = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(utcDay(date));
const daysBetween = (from: string, to: string) => Math.round((utcDay(to).getTime() - utcDay(from).getTime()) / 86_400_000);
function dueText(payday: string, today: string) {
  const days = daysBetween(today, payday);
  return days < 0 ? 'Payday passed' : days === 0 ? 'Payday today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
}
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('');
const firstName = (name: string) => name.split(/\s+/)[0] ?? name;
function listNames(names: string[]) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const reviewHref = (id: string) => `/app/payroll/review?run=${encodeURIComponent(id)}`;
const periodText = (run: Pick<PayrollRun, 'period' | 'payday'>) => `${quietRange(run.period.startDate, run.period.endDate)} · Payday ${quietDay(run.payday)}`;
/** Blocking items the Fix page lists: everything except the provider-amounts wait (that is the import step). */
const fixItems = (run: PayrollRun) => run.status === 'APPROVED' ? [] : payrollReviewNotes(run.exceptions).blocking.filter(item => item !== 'WAITING_FOR_AMOUNTS');

/** A pushed page's header: "‹ Back · Title" on a phone; on wider screens a teal back link over the page title. */
function Pushed({ back, title, id }: { back: { href: string; label: string }; title: string; id: string }) {
  return <>
    <CorpNav back={back} title={title} phoneOnly />
    <Link className="c-pay__deskback" href={back.href}><CaretLeftIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" />{back.label}</Link>
    <CorpTitle id={id} title={title} wide />
  </>;
}

function StateCard({ children, alert, retry }: { children: ReactNode; alert?: boolean; retry?: () => void }) {
  return <CorpCard as="div" ariaLabel="Payroll"><CorpBody>
    <p className="c-payroll__state" role={alert ? 'alert' : 'status'}>{children}</p>
    {retry ? <CorpButton kind="secondary" size="md" onClick={retry}>Try again</CorpButton> : null}
  </CorpBody></CorpCard>;
}

/** A kit checkbox row: 20px box, 44px tall, text wraps. */
function Check({ checked, onChange, disabled, children }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; children: ReactNode }) {
  return <label className="c-pay__check"><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span>{children}</span></label>;
}

export function PayrollRuns({ recoveryScope, current = null, canEditSettings = false, view = 'home', runId = null, names = {}, company }: {
  recoveryScope: string; current?: OpenPayPeriod | null; canEditSettings?: boolean; view?: PayrollView; runId?: string | null; names?: Record<string, string>; company?: string;
}) {
  const resource = usePayrollResource('/api/payroll/runs', readRuns);
  const operation = usePayrollOperation('/api/payroll/runs', resource.reload, recoveryScope);
  const router = useRouter();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  // A recorded action that made or replaced a run (a prepared draft, a correction) opens that run's review.
  useEffect(() => {
    const next = operation.receipt?.runId;
    if (next && (next !== runId || view === 'fix')) router.push(reviewHref(next));
  }, [operation.receipt, runId, router, view]);
  const data = !resource.loading && resource.data?.capabilities.canReview ? resource.data : null;
  const state = resource.loading ? <StateCard>Loading payroll…</StateCard>
    : resource.error ? <StateCard alert retry={() => void resource.reload()}>{resource.error}</StateCard>
    : !data ? <StateCard alert>Your account can’t review payroll.</StateCard> : null;
  const run = data && runId ? data.runs.find(item => item.id === runId) ?? null : null;
  const missingRun = data && (view === 'review' || view === 'fix' || view === 'people') && !run
    ? <StateCard alert>This payroll isn’t available. It may have been replaced by a newer revision.</StateCard> : null;

  if (view === 'home') return <PayrollHome current={current} data={data} state={state} today={today} canEditSettings={canEditSettings} company={company} operation={operation} />;
  if (view === 'prepare') return <CorpPage className="c-payroll c-pay" labelledBy="payroll-prepare-title">
    <Pushed back={{ href: '/app/payroll', label: 'Payroll' }} title="Prepare payroll" id="payroll-prepare-title" />
    <Feedback operation={operation} />
    {state ?? (data && <PreparePayroll current={current} data={data} operation={operation} />)}
  </CorpPage>;
  if (view === 'history') return <CorpPage className="c-payroll c-pay" labelledBy="payroll-history-title">
    <Pushed back={{ href: '/app/payroll', label: 'Payroll' }} title="Pay history" id="payroll-history-title" />
    <Feedback operation={operation} />
    {state ?? (data && <PayHistory data={data} operation={operation} />)}
  </CorpPage>;
  if (view === 'fix') return <CorpPage className="c-payroll c-pay" labelledBy="payroll-fix-title">
    <Pushed back={{ href: runId ? reviewHref(runId) : '/app/payroll', label: 'Review payroll' }} title="Fix before payroll" id="payroll-fix-title" />
    <Feedback operation={operation} />
    {state ?? missingRun ?? (run && data && <FixList run={run} capabilities={data.capabilities} names={names} operation={operation} />)}
  </CorpPage>;
  if (view === 'people') return <CorpPage className="c-payroll c-pay" labelledBy="payroll-people-title">
    <Pushed back={{ href: runId ? reviewHref(runId) : '/app/payroll', label: 'Review payroll' }} title="People" id="payroll-people-title" />
    {state ?? missingRun ?? (run && <PeopleAmounts run={run} />)}
  </CorpPage>;
  return <CorpPage className="c-payroll c-pay" labelledBy="payroll-review-title">
    <Pushed back={{ href: '/app/payroll', label: 'Payroll' }} title={run?.status === 'APPROVED' ? 'Payroll details' : 'Review payroll'} id="payroll-review-title" />
    <Feedback operation={operation} />
    {state ?? missingRun ?? (run && data && <RunReview key={`${run.id}:${run.revision}:${run.reviewToken}`} run={run} data={data} names={names} operation={operation} />)}
  </CorpPage>;
}

/** Corporate (Release 1, board G-O-Payroll): Payroll is a tab, so no Back. Up next (the open period, its payday and one
 * Review), recent payrolls, then Time exports. Review opens that period's review, or prepares its draft. */
function PayrollHome({ current, data, state, today, canEditSettings, company, operation }: {
  current: OpenPayPeriod | null; data: PayrollRunsResponse | null; state: ReactNode; today: string; canEditSettings: boolean; company?: string; operation: Operation;
}) {
  const runs = data?.runs ?? [];
  const open = current ? runs.find(item => item.period.startDate === current.period.startDate && item.period.endDate === current.period.endDate && !item.correctionOf) : undefined;
  const past = runs.filter(item => item.id !== open?.id).sort((a, b) => b.period.startDate.localeCompare(a.period.startDate) || b.createdAt.localeCompare(a.createdAt));
  const due = current ? daysBetween(today, current.payday) : null;
  const people = open?.rows ?? [];
  const missing = data?.backlog && (data.backlog.overflow || (data.backlog.missingCount ?? 0) > 0) ? data.backlog : null;
  const sub = [current?.frequency ? FREQUENCY[current.frequency] : null, open?.totals ? plural(open.totals.employeeCount, 'person', 'people') : null, company || null].filter(Boolean).join(' · ');
  return <CorpPage className="c-payroll c-pay c-pay--home" labelledBy="payroll-title">
    <CorpTitle id="payroll-title" title="Payroll" sub={sub || undefined}
      actions={<>
        {canEditSettings ? <Link className="c-pay__textlink" href="/app/settings/payroll">Settings</Link> : null}
        <CorpButtonLink href="/app/payroll/history" kind="neutral" className="c-pay__tap">Pay history</CorpButtonLink>
      </>} />
    <Feedback operation={operation} />
    {state ?? <>
      {current ? <CorpCard id="payroll-next" label="Up next" aside={<CorpPill tone={due !== null && due <= 1 ? 'amber' : 'neutral'}>{dueText(current.payday, today)}</CorpPill>}>
        <div className="c-payroll__next">
          <b>{`${current.frequency ? FREQUENCY[current.frequency] : ''} payroll`.trim().replace(/^payroll$/, 'Payroll')}</b>
          <span>{`${quietRange(current.period.startDate, current.period.endDate)} · Payday ${quietDay(current.payday)}`}</span>
        </div>
        <div className="c-payroll__go">
          {people.length ? <span className="c-pay__people">
            <span className="c-avs c-pay__avs">{people.slice(0, 3).map((row, index) => <CorpAvatar key={row.employeeId} initials={initials(row.employeeName)} grey={index === 1} />)}</span>
            {people.length > 3 ? <span>{`and ${people.length - 3} more`}</span> : null}
          </span> : <span>{open ? statusLabels[open.status] : 'Not prepared yet'}</span>}
          <CorpButtonLink size="md" href={open ? reviewHref(open.id) : '/app/payroll/prepare'}>Review</CorpButtonLink>
        </div>
      </CorpCard> : <CorpCard as="div" ariaLabel="Pay schedule"><CorpBody>
        <p className="c-payroll__state">Set your pay schedule to see the current period.</p>
        {canEditSettings ? <CorpButtonLink href="/app/settings/payroll" kind="secondary" size="md">Payroll settings</CorpButtonLink> : null}
      </CorpBody></CorpCard>}
      <CorpCard id="payroll-recent" label="Recent payrolls" aside={past.length ? <Link className="c-link" href="/app/payroll/history">See all</Link> : undefined}>
        {past.length ? <CorpRows label="Past periods">{past.slice(0, 3).map(item => <li key={item.id}>
          <CorpRow href={reviewHref(item.id)} bold title={quietRange(item.period.startDate, item.period.endDate)}
            detail={`${item.correctionOf ? 'Correction · ' : ''}Payday ${quietDay(item.payday)}`} value={item.totals ? formatPayrollMoney(item.totals.netMinor) : undefined}
            trail={<CorpPill tone={statusTone[item.status]}>{statusLabels[item.status]}</CorpPill>} chevron />
        </li>)}</CorpRows> : <CorpBody><p className="c-payroll__state">No past periods yet.</p></CorpBody>}
      </CorpCard>
      <CorpCard as="div" ariaLabel="Payroll tools">
        <CorpRows label="Payroll tools">
          <li><CorpRow href={current ? `/app/payroll-export?start=${current.period.startDate}&end=${current.period.endDate}` : '/app/payroll-export'} bold title="Time exports" detail="Send hours to payroll or a file" chevron /></li>
          {missing ? <li><CorpRow href="/app/payroll/prepare" bold title="Periods with no payroll" detail="Prepare a draft for each one" value={missing.missingCount === null ? 'Check' : String(missing.missingCount)} valueTone="amber" chevron /></li> : null}
        </CorpRows>
      </CorpCard>
    </>}
  </CorpPage>;
}

/** Board O-PayrollReview: the period and its totals, what stops payroll, then one Approve. Everything an approved run
 * offers (documents, publication, corrections) follows in the same cards. */
function RunReview({ run, data, names, operation }: { run: PayrollRun; data: PayrollRunsResponse; names: Record<string, string>; operation: Operation }) {
  const capabilities = data.capabilities;
  const [reviewed, setReviewed] = useState(false);
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const native = run.sourceAuthority === 'NATIVE_RECORDED_TIME';
  const notes = payrollReviewNotes(run.exceptions);
  const fixes = fixItems(run);
  const approved = run.status === 'APPROVED';
  const original = run.correctionOf ? data.runs.find(item => item.id === run.correctionOf) : undefined;
  const reasons = [...(run.nativeCorrection ? [run.nativeCorrection.reason] : []), ...notes.corrections];
  const jobs = data.jobs.filter(job => job.runId === run.id);
  const canApproveNow = !locked && !operation.revisionConflict && reviewed && !!run.reviewToken && !!run.rows && !!run.totals && notes.blocking.length === 0;
  const unpublished = !native && run.documents.some(document => document.kind === 'EMPLOYEE_STATEMENT' && !document.published);
  return <>
    <CorpCard id="payroll-run" label={periodText(run)}>
      {run.totals ? <dl className="c-pay__totals">
        <div><dt>Gross pay</dt><dd>{formatPayrollMoney(run.totals.grossMinor)}</dd></div>
        <div><dt>Employee deductions</dt><dd>{`−${formatPayrollMoney(run.totals.deductionsMinor)}`}</dd></div>
        <div className="c-pay__net"><dt>Net pay</dt><dd>{formatPayrollMoney(run.totals.netMinor)}</dd></div>
      </dl> : <CorpBody><p className="c-payroll__state">{run.status === 'WAITING_FOR_AMOUNTS' ? 'Amounts appear after your provider’s amounts are imported.' : run.status === 'BLOCKED' ? 'Amounts appear after the items below are fixed and the draft is recalculated.' : 'No amounts are saved for this payroll.'}</p></CorpBody>}
      {run.rows ? <CorpRows label="People"><li><CorpRow href={`/app/payroll/people?run=${encodeURIComponent(run.id)}`} title="People" value={String(run.totals?.employeeCount ?? run.rows.length)} valueTone="soft" chevron /></li></CorpRows> : null}
    </CorpCard>
    {run.correctionOf ? <CorpCard as="div" ariaLabel="Correction"><CorpBody>
      <b className="c-pay__strong">{original ? `Correction of ${quietRange(original.period.startDate, original.period.endDate)}` : 'Correction of an earlier payroll'}</b>
      <p className="c-pay__detail">{reasons.length ? reasons.join(' · ') : 'The original approval and statements remain in history.'}</p>
    </CorpBody></CorpCard> : reasons.length ? <CorpCard as="div" ariaLabel="Correction"><CorpBody><b className="c-pay__strong">Correction reason</b><p className="c-pay__detail">{reasons.join(' · ')}</p></CorpBody></CorpCard> : null}
    {fixes.length ? <CorpCard as="div" ariaLabel="Things to fix"><CorpRows label="Things to fix"><li>
      <CorpRow href={`/app/payroll/fix?run=${encodeURIComponent(run.id)}`} tall bold title={`${plural(fixes.length, 'thing', 'things')} to fix before approving`} detail={<CorpPill tone="red">Stops payroll</CorpPill>} chevron />
    </li></CorpRows></CorpCard> : null}
    {!native && (!approved || correctionOpen) ? <ImportAmounts run={run} capabilities={capabilities} operation={operation} correction={correctionOpen} primary={run.status === 'WAITING_FOR_AMOUNTS' || correctionOpen} /> : null}
    {native && correctionOpen ? <CorpCard id="payroll-correction" label="Create a linked correction"><CorpBody>
      <form className="c-form" onSubmit={event => { event.preventDefault(); const reason = String(new FormData(event.currentTarget).get('nativeCorrectionReason') ?? '').trim(); if (reason) void operation.submit({ action: 'CORRECT_NATIVE', runId: run.id, expectedRevision: run.revision, reason }); }}>
        <fieldset className="c-pay__fieldset" disabled={locked || !capabilities.canReview}>
          <p className="c-pay__detail">Corrections recalculate a separate linked draft from recorded time and current facts. The replacement requires a new review and approval; original statements stay in history.</p>
          <label className="c-field"><span className="c-field__label">Correction reason</span><textarea className="c-in" name="nativeCorrectionReason" required maxLength={300} rows={3} /></label>
          <CorpButton type="submit" full>Create correction draft</CorpButton>
        </fieldset>
      </form>
    </CorpBody></CorpCard> : null}
    {approved ? <Documents run={run} native={native} /> : null}
    {jobs.length ? <Jobs jobs={jobs} canApprove={capabilities.canApprove} locked={locked} operation={operation} /> : null}
    {(native && !approved && !fixes.length) || approved ? <CorpCard as="div" ariaLabel="More actions"><CorpRows label="More actions">
      {native && !approved && !fixes.length ? <li><CorpRow onClick={locked || !capabilities.canReview ? undefined : () => void operation.submit({ action: 'RECALCULATE', runId: run.id, expectedRevision: run.revision })} disabled={locked || !capabilities.canReview}
        title="Recalculate draft" detail="A fresh revision from current recorded time" chevron={false} /></li> : null}
      {approved ? <li><CorpRow onClick={locked || !capabilities.canReview ? undefined : () => setCorrectionOpen(value => !value)} disabled={locked || !capabilities.canReview}
        title={correctionOpen ? 'Close correction' : 'Create correction'} detail="A linked draft that needs its own approval" chevron={false} /></li> : null}
      {approved && !native && capabilities.canApprove ? <li><CorpRow onClick={locked ? undefined : () => void operation.submit({ action: 'PAYMENT_EXPORT', runId: run.id, expectedRevision: run.revision })} disabled={locked}
        title="Prepare payment instructions" detail="Neutral file · not sent to a bank" chevron={false} /></li> : null}
    </CorpRows></CorpCard> : null}
    {(run.status === 'REVIEW_REQUIRED' || run.status === 'BLOCKED') ? (capabilities.canApprove ? <div className="c-pay__approve">
      {run.status === 'REVIEW_REQUIRED' ? <Check checked={reviewed} onChange={setReviewed} disabled={locked || operation.revisionConflict}>I reviewed revision {run.revision}, {native ? 'the recorded-time calculation' : 'the provider amounts'} and all employee details.</Check> : null}
      <CorpButton full disabled={!canApproveNow} onClick={() => run.reviewToken && void operation.submit({ action: 'APPROVE', runId: run.id, expectedRevision: run.revision, reviewToken: run.reviewToken })}>Approve payroll</CorpButton>
      <p className="c-note c-note--center">{fixes.length ? `Fix the ${fixes.length === 1 ? 'thing' : `${fixes.length} things`} above to approve.` : 'Approval freezes the reviewed amounts, finalized time, settings and employee exceptions. A changed source requires a fresh review.'}</p>
    </div> : <p className="c-note c-note--center">An authorized payroll approver must approve this revision.</p>) : null}
    {approved ? <ApprovedNote run={run} names={names} /> : null}
    {approved && unpublished ? (capabilities.canApprove ? <div className="c-pay__approve">
      <Check checked={publishConfirmed} onChange={setPublishConfirmed} disabled={locked}>Make the approved statements available to their employees.</Check>
      <CorpButton full disabled={locked || !publishConfirmed} onClick={() => void operation.submit({ action: 'PUBLISH', runId: run.id, expectedRevision: run.revision })}>Publish employee statements</CorpButton>
    </div> : <p className="c-note c-note--center">An authorized payroll approver must publish the employee statements.</p>) : null}
  </>;
}

function ApprovedNote({ run, names }: { run: PayrollRun; names: Record<string, string> }) {
  const when = run.approvedAt ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(run.approvedAt)) : null;
  const who = run.approvedBy ? names[run.approvedBy] : undefined;
  return <p className="c-note c-note--center">{`Revision ${run.revision} approved${when ? ` ${when}` : ''}${who ? ` · ${who}` : ''}.`}</p>;
}

/** Approved documents: one row each, with View and Download. */
function Documents({ run, native }: { run: PayrollRun; native: boolean }) {
  const published = run.documents.some(document => document.kind === 'EMPLOYEE_STATEMENT' && document.published);
  return <CorpCard id="payroll-documents" label="Documents">
    {run.documents.length ? <CorpRows label="Documents">{run.documents.map(document => <li key={document.id}><DocumentRow document={document} /></li>)}</CorpRows>
      : <CorpBody><p className="c-payroll__state" role="status">Documents are being prepared. They appear when generation succeeds.</p></CorpBody>}
    {native && !published ? <CorpBody tight><p className="c-pay__detail" role="status"><b className="c-pay__strong">Statements not published yet</b>Approved native statements publish automatically after document generation and verification. Approval alone does not mean a PDF is available.</p></CorpBody> : null}
  </CorpCard>;
}

function Jobs({ jobs, canApprove, locked, operation }: { jobs: PayrollJob[]; canApprove: boolean; locked: boolean; operation: Operation }) {
  return <CorpCard id="payroll-jobs" label="Preparation and delivery">
    <CorpRows label="Preparation and delivery">{jobs.map(job => <li key={job.id}>
      <CorpRow title={jobLabels[job.kind]} detail={job.error ?? (job.kind === 'REMINDER' ? noticeOutcome(job.outcome) : `${plural(job.attempts, 'attempt', 'attempts')}`)}
        trail={job.status === 'FAILED' && canApprove
          ? <CorpButton kind="secondary" size="xs" className="c-pay__tap" disabled={locked} onClick={() => void operation.submit({ action: 'RETRY_JOB', jobId: job.id })} aria-label={`Retry ${job.kind === 'REMINDER' ? 'notice queue' : jobLabels[job.kind].toLowerCase()}`}>Retry</CorpButton>
          : <CorpPill tone={job.status === 'FAILED' ? 'red' : job.status === 'SUCCEEDED' ? 'teal' : 'neutral'}>{job.status === 'SUCCEEDED' ? 'Done' : job.status === 'FAILED' ? 'Failed' : job.status === 'RUNNING' ? 'Running' : 'Waiting'}</CorpPill>} />
    </li>)}</CorpRows>
  </CorpCard>;
}

/** Provider or accountant amounts (historical provider runs): the neutral import, or a linked correction from one. */
function ImportAmounts({ run, capabilities, operation, correction, primary }: { run: PayrollRun; capabilities: PayrollCapabilities; operation: Operation; correction: boolean; primary: boolean }) {
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const fileId = useId();
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setImportError('');
    try {
      const amounts = parsePayrollImport(importText);
      if (amounts.period.startDate !== run.period.startDate || amounts.period.endDate !== run.period.endDate || amounts.payday !== run.payday) throw new Error('The import period and payday must match this draft.');
      if (correction) {
        const reason = String(new FormData(event.currentTarget).get('correctionReason') ?? '').trim();
        if (!reason) throw new Error('Explain the correction before creating its linked revision.');
        void operation.submit({ action: 'CORRECT', runId: run.id, expectedRevision: run.revision, reason, amounts });
      } else void operation.submit({ action: 'IMPORT', runId: run.id, expectedRevision: run.revision, amounts });
    } catch (failure) { setImportError(failure instanceof Error ? failure.message : 'Check the payroll import.'); }
  };
  return <CorpCard id="payroll-import" label={correction ? 'Create a linked correction' : 'Import provider amounts'} aside={run.sourceName ? <span className="c-pay__aside">{run.sourceName}</span> : undefined}><CorpBody>
    <form className="c-form" onSubmit={submit}><fieldset className="c-pay__fieldset" disabled={locked}>
      <p className="c-pay__detail">Use the neutral JSON import supplied by your payroll provider or accountant. {capabilities.internalCalculatorAvailable ? 'Historical provider runs retain their imported amounts. Native payroll does not replace the source of this historical review.' : 'NEVORA preserves imported amounts; a statutory calculator is unavailable.'}</p>
      <div className="c-field"><label className="c-field__label" htmlFor={fileId}>Payroll import file</label><input id={fileId} className="c-in c-pay__file" type="file" accept="application/json,.json" onChange={async event => {
        const file = event.target.files?.[0]; if (!file) return;
        setImportError('');
        try { if (file.size > 524288) throw new Error('Choose an import smaller than 512 KB.'); setImportText(await file.text()); } catch (failure) { setImportError(failure instanceof Error ? failure.message : 'The import file could not be read.'); }
      }} /></div>
      <details className="c-pay__more"><summary>Import format and contents</summary>
        <p className="c-pay__detail">Required: schema NEVORA_PAYROLL_IMPORT_V1, currency USD, sourceName, sourceReference, period, payday and rows. Each row includes employeeId, grossMinor, employeeDeductions, employerContributions and netMinor. Each amount is a whole-cent string; each line includes code, label and amountMinor.</p>
        <label className="c-field"><span className="c-field__label">Import JSON</span><textarea className="c-in" rows={8} value={importText} onChange={event => setImportText(event.target.value)} spellCheck={false} /></label>
      </details>
      {importText ? <p className="c-pay__detail">Import loaded in this page. Review employee amounts after the server validates it.</p> : null}
      {correction ? <label className="c-field"><span className="c-field__label">Correction reason</span><textarea className="c-in" name="correctionReason" required maxLength={300} rows={3} /></label> : null}
      {importError ? <p className="c-error" role="alert">{importError}</p> : null}
      <CorpButton type="submit" full kind={primary ? undefined : 'secondary'} disabled={!importText}>{correction ? 'Create correction draft' : 'Validate and import amounts'}</CorpButton>
    </fieldset></form>
  </CorpBody></CorpCard>;
}

const SETUP_CODES = new Set(['WORKWEEK_EVIDENCE_REQUIRED', 'INVALID_WORKWEEK_POLICY', 'INVALID_NATIVE_PROFILE', 'WORKWEEK_EMPLOYEE_COVERAGE_REQUIRED', 'WORKWEEK_PROFILE_CONFLICT', 'WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED',
  'EMPLOYER_YTD_BASE_CONFLICT', 'ATTESTED_YTD_REQUIRED', 'EMPLOYER_YTD_BASE_REQUIRED', 'WAGE_PROFILE_REQUIRED', 'TAX_PROFILE_REQUIRED', 'OPENING_YTD_REQUIRED', 'YTD_ATTESTATION_REQUIRED', 'NATIVE_INPUT_REQUIRED']);
const TIME_CODES = new Set(['TIME_NOT_FINALIZED', 'RECORDED_SOURCE_COVERAGE_MISSING', 'RECORDED_SOURCE_STALE', 'RECORDED_SOURCE_UNAVAILABLE', 'OPEN_RECORDED_TIME', 'TIME_FINALIZATION_REQUIRED', 'FINALIZED_TIME_REQUIRED']);
const POPULATION_CODES = new Set(['POPULATION_DISPOSITION', 'POPULATION_REVIEW_REQUIRED', 'POPULATION_SOURCE_CONFLICT']);

/** Board O-PayrollFix: one card per thing that stops payroll, each with the place to fix it. */
function FixList({ run, capabilities, names, operation }: { run: PayrollRun; capabilities: PayrollCapabilities; names: Record<string, string>; operation: Operation }) {
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const native = run.sourceAuthority === 'NATIVE_RECORDED_TIME';
  const groups = new Map<string, string[]>();
  for (const item of fixItems(run)) {
    const [code, reference] = item.split(':');
    const list = groups.get(code) ?? [];
    if (reference) list.push(reference);
    else if (!groups.has(code)) list.push('');
    groups.set(code, list);
  }
  const period = `start=${run.period.startDate}&end=${run.period.endDate}`;
  const nameOf = (id: string) => names[id] ?? null;
  const cards = [...groups].map(([code, references]) => {
    const people = references.filter(Boolean);
    const known = people.map(nameOf).filter((name): name is string => !!name);
    const unknown = people.length - known.length;
    const who = people.length ? `${listNames(known.map(firstName))}${unknown ? `${known.length ? ' and ' : ''}${plural(unknown, 'other person', 'other people')}` : ''}` : '';
    const title = code === 'TIME_NOT_FINALIZED' ? `${plural(people.length, 'timecard', 'timecards')} not approved`
      : code === 'POPULATION_DISPOSITION' ? `${plural(people.length, 'person needs', 'people need')} a population review`
      : payrollExceptionMessage(code);
    const detail = code === 'TIME_NOT_FINALIZED' || code === 'POPULATION_DISPOSITION' ? who : who ? `For ${who}` : '';
    const action = TIME_CODES.has(code) ? { href: `/app/timecards?${period}`, label: 'Review timecards' }
      : POPULATION_CODES.has(code) ? { href: `/app/payroll-export?${period}`, label: 'Review payroll population' }
      : SETUP_CODES.has(code) && capabilities.canConfigure ? { href: '/app/settings/payroll?open=setup', label: 'Open payroll setup' } : null;
    return <CorpCard as="div" key={code} ariaLabel={title}>
      <div className="c-pay__fix"><b className="c-pay__strong">{title}</b>{detail ? <span className="c-pay__detail">{detail}</span> : null}</div>
      {action ? <div className="c-card__foot"><CorpButtonLink href={action.href} kind="secondary" size="md" full>{action.label}</CorpButtonLink></div> : null}
    </CorpCard>;
  });
  return <>
    {cards.length ? cards : <StateCard>Nothing stops this payroll.</StateCard>}
    {cards.length ? <p className="c-note">{cards.length === 1 ? 'Payroll can be approved once this is fixed.' : cards.length === 2 ? 'Payroll can be approved once both are fixed.' : 'Payroll can be approved once these are fixed.'}{native ? ' Then recalculate the draft.' : ''}</p> : null}
    {native ? <CorpButton kind="secondary" full disabled={locked || !capabilities.canReview} onClick={() => void operation.submit({ action: 'RECALCULATE', runId: run.id, expectedRevision: run.revision })}>Recalculate draft</CorpButton> : null}
  </>;
}

/** Each person's amounts for the review (opened from the People row). */
function PeopleAmounts({ run }: { run: PayrollRun }) {
  const [filter, setFilter] = useState('');
  const searchId = useId();
  const native = run.sourceAuthority === 'NATIVE_RECORDED_TIME';
  const rows = run.rows?.filter(row => row.employeeName.toLowerCase().includes(filter.toLowerCase())) ?? [];
  return <>
    {run.totals ? <CorpCard id="payroll-people-totals" label={periodText(run)}>
      <dl className="c-pay__totals">
        <div><dt>Gross pay</dt><dd>{formatPayrollMoney(run.totals.grossMinor)}</dd></div>
        <div><dt>Employee deductions</dt><dd>{`−${formatPayrollMoney(run.totals.deductionsMinor)}`}</dd></div>
        <div><dt>Employer contributions</dt><dd>{formatPayrollMoney(run.totals.employerContributionsMinor)}</dd></div>
        <div className="c-pay__net"><dt>{`Net pay · ${plural(run.totals.employeeCount, 'employee', 'employees')}`}</dt><dd>{formatPayrollMoney(run.totals.netMinor)}</dd></div>
      </dl>
    </CorpCard> : null}
    {run.rows ? <CorpCard id="payroll-people" label="Employee amounts">
      <div className="c-pay__search"><label className="c-sr" htmlFor={searchId}>Find employee amounts</label><input id={searchId} className="c-in" type="search" placeholder="Find an employee" value={filter} onChange={event => setFilter(event.target.value)} /></div>
      <ul className="c-rows" aria-label="Employee amounts">{rows.map(row => {
        const result = native ? run.nativeCalculation?.employees.find(item => item.employeeId === row.employeeId) : undefined;
        const exception = run.exceptionRevisions.find(item => item.employeeId === row.employeeId)?.revision;
        return <li key={row.employeeId}><details className="c-pay__person">
          <summary className="c-row"><span className="c-row__main"><span className="c-row__title c-row__title--b">{row.employeeName}</span><span className="c-row__detail"><span>Net pay</span></span></span><span className="c-row__value">{formatPayrollMoney(row.netMinor)}</span></summary>
          <div className="c-pay__lines">
            <dl>
              <div><dt>Gross pay</dt><dd>{formatPayrollMoney(row.grossMinor)}</dd></div>
              {row.earnings?.map((line, index) => <div key={`earnings${index}`}><dt>{line.label}</dt><dd>{formatPayrollMoney(line.amountMinor)}</dd></div>)}
              <div className="c-pay__linehead"><dt>Employee deductions</dt><dd /></div>
              {row.employeeDeductions.length ? row.employeeDeductions.map((line, index) => <div key={`deduction${index}`}><dt>{line.label}</dt><dd>{formatPayrollMoney(line.amountMinor)}</dd></div>) : <div><dt>{native ? 'No employee deductions' : 'No imported employee deductions'}</dt><dd /></div>}
              <div className="c-pay__linehead"><dt>Employer contributions</dt><dd /></div>
              {row.employerContributions.length ? row.employerContributions.map((line, index) => <div key={`employer${index}`}><dt>{line.label}</dt><dd>{formatPayrollMoney(line.amountMinor)}</dd></div>) : <div><dt>{native ? 'No employer contributions' : 'No imported employer contributions'}</dt><dd /></div>}
            </dl>
            {result ? <div className="payroll-workflow c-pay__native"><NativeReview result={result} /></div> : null}
            {exception ? <p className="c-pay__detail">{`Employee exception revision ${exception}`}</p> : null}
          </div>
        </details></li>;
      })}</ul>
      {rows.length === 0 ? <CorpBody><p className="c-payroll__state">No employees match your search.</p></CorpBody> : null}
    </CorpCard> : <StateCard>No employee amounts are saved for this payroll.</StateCard>}
  </>;
}

/** Up next's Review before a draft exists: prepare it (or a period that never had one). */
function PreparePayroll({ current, data, operation }: { current: OpenPayPeriod | null; data: PayrollRunsResponse; operation: Operation }) {
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const open = current ? data.runs.find(item => item.period.startDate === current.period.startDate && item.period.endDate === current.period.endDate && !item.correctionOf) : undefined;
  const [other, setOther] = useState(false);
  return <>
    {current ? <CorpCard id="payroll-prepare" label="Up next">
      <div className="c-payroll__next">
        <b>{`${current.frequency ? FREQUENCY[current.frequency] : ''} payroll`.trim().replace(/^payroll$/, 'Payroll')}</b>
        <span>{`${quietRange(current.period.startDate, current.period.endDate)} · Payday ${quietDay(current.payday)}`}</span>
      </div>
      <CorpBody tight>
        <p className="c-pay__detail">A draft checks approved time. It doesn’t approve timecards, approve payroll or send a payment.</p>
        {open ? <CorpButtonLink href={reviewHref(open.id)} full className="c-pay__gap">Review</CorpButtonLink>
          : <CorpButton full className="c-pay__gap" disabled={locked} onClick={() => void operation.submit({ action: 'PREPARE', period: current.period, payday: current.payday })}>Prepare draft</CorpButton>}
      </CorpBody>
    </CorpCard> : null}
    <Backlog data={data} operation={operation} />
    <CorpCard id="payroll-other" label="Another period" aside={<button type="button" className="c-link" aria-expanded={other} aria-controls="payroll-other-form" onClick={() => setOther(value => !value)}>{other ? 'Close' : 'Choose dates'}</button>}>
      {other ? <CorpBody><form id="payroll-other-form" className="c-form" onSubmit={event => {
        event.preventDefault(); const values = new FormData(event.currentTarget);
        void operation.submit({ action: 'PREPARE', period: { startDate: String(values.get('start')), endDate: String(values.get('end')) }, payday: String(values.get('payday')) });
      }}><fieldset className="c-pay__fieldset" disabled={locked}>
        <div className="c-field__row"><PayDateField name="start" label="Period start" defaultValue={current?.period.startDate} required /><PayDateField name="end" label="Period end" defaultValue={current?.period.endDate} required /></div>
        <PayDateField name="payday" label="Payday" defaultValue={current?.payday} required />
        <CorpButton type="submit" kind="secondary" full>Prepare draft</CorpButton>
      </fieldset></form></CorpBody> : <CorpBody tight><p className="c-pay__detail">Prepare a draft for dates outside your pay schedule.</p></CorpBody>}
    </CorpCard>
  </>;
}

/** Completed periods with no original payroll run (oldest first). */
function Backlog({ data, operation }: { data: PayrollRunsResponse; operation: Operation }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const missing = data.missingPeriods ?? [];
  const backlog = data.backlog;
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  if (!backlog || (!backlog.overflow && backlog.missingCount === 0 && missing.length === 0)) return null;
  const key = (item: PayrollMissingPeriod) => JSON.stringify(item);
  const visible = expanded ? missing : missing.slice(0, 3);
  return <CorpCard id="payroll-backlog" label="Periods with no payroll" aside={missing.length > 3 ? <button type="button" className="c-link" disabled={locked} onClick={() => setExpanded(value => !value)}>{expanded ? 'Show fewer' : `Show all ${missing.length}`}</button> : undefined}>
    <CorpBody tight><p className="c-pay__detail">{backlogDescription(backlog)}</p>
      {backlog.ambiguousCount !== null && backlog.ambiguousCount > 0 ? <p className="c-pay__detail c-pay__amber">{`${backlog.ambiguousCount} ${backlog.ambiguousCount === 1 ? 'period needs' : 'periods need'} schedule-transition review.`}</p> : null}
    </CorpBody>
    <ul className="c-rows" aria-label="Periods with no payroll">{visible.map(item => {
      const open = selected === key(item);
      const id = `period-${item.period.startDate}-${item.settingsRevision}`;
      return <li key={key(item)}>
        <button type="button" className="c-row" aria-expanded={open} aria-controls={id} disabled={locked} onClick={() => { setSelected(open ? null : key(item)); setAcknowledged(false); }}>
          <span className="c-row__main"><span className="c-row__title c-row__title--b">{quietRange(item.period.startDate, item.period.endDate)}</span><span className="c-row__detail"><span>{`Payday ${quietDay(item.payday)}`}</span></span></span>
          {item.state === 'AMBIGUOUS_TRANSITION' ? <CorpPill tone="amber">Check dates</CorpPill> : null}
          <span className="c-link c-link--l">{open ? 'Close' : 'Prepare'}</span>
        </button>
        {open ? <div id={id} className="c-pay__expand">
          {item.state === 'AMBIGUOUS_TRANSITION' ? <div className="c-callout"><span><b>Review the schedule transition</b>{item.issues.join(' ')} Confirm these period boundaries and payday before manual preparation.</span></div> : null}
          <p className="c-pay__detail">This draft uses the saved effective settings. Review its timecards, population and provider amounts before a separate approval.</p>
          {item.state === 'AMBIGUOUS_TRANSITION' ? <Check checked={acknowledged} disabled={locked} onChange={setAcknowledged}>I reviewed this schedule transition, period boundaries and payday.</Check> : null}
          <CorpButton kind="secondary" size="md" full disabled={locked || (item.state === 'AMBIGUOUS_TRANSITION' && !acknowledged)} onClick={() => void operation.submit({ action: 'PREPARE', period: item.period, payday: item.payday })}>Prepare this period</CorpButton>
        </div> : null}
      </li>;
    })}</ul>
    {backlog.remainingCount !== null && backlog.remainingCount > 0 ? <CorpBody tight><p className="c-pay__detail">{`${backlog.remainingCount} additional missing periods follow this preview. Prepare a period to see the next oldest gaps.`}</p></CorpBody> : null}
  </CorpCard>;
}

/** Every payroll, the private statement history and any delivery work not tied to one payroll. */
function PayHistory({ data, operation }: { data: PayrollRunsResponse; operation: Operation }) {
  const runs = [...data.runs].sort((a, b) => b.period.startDate.localeCompare(a.period.startDate) || b.createdAt.localeCompare(a.createdAt));
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const loose = data.jobs.filter(job => !job.runId);
  return <>
    <CorpCard id="payroll-all" label="Payrolls">
      {runs.length ? <CorpRows label="Payrolls">{runs.map(item => <li key={item.id}>
        <CorpRow href={reviewHref(item.id)} bold title={quietRange(item.period.startDate, item.period.endDate)}
          detail={`${item.correctionOf ? 'Correction · ' : ''}Payday ${quietDay(item.payday)}`} value={item.totals ? formatPayrollMoney(item.totals.netMinor) : undefined}
          trail={<CorpPill tone={statusTone[item.status]}>{statusLabels[item.status]}</CorpPill>} chevron />
      </li>)}</CorpRows> : <CorpBody><p className="c-payroll__state">No payroll runs yet. Prepare a draft from Up next.</p></CorpBody>}
    </CorpCard>
    <PortalStatements runs={data.runs} />
    {loose.length ? <Jobs jobs={loose} canApprove={data.capabilities.canApprove} locked={locked} operation={operation} /> : null}
  </>;
}
