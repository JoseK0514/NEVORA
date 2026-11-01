'use client';

import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { PayrollTabs, type PayrollTab } from './payroll-tabs';
import { flagProblems, formKeys } from './form-keys';
import { daysBetween, payDay, periodRange } from './payroll-format';
import { Num, PayGroup } from './pay-group';

export type PayrollView = 'home' | 'review' | 'fix' | 'people' | 'prepare' | 'history';
type Operation = ReturnType<typeof usePayrollOperation>;

const statusLabels = { BLOCKED: 'Needs attention', WAITING_FOR_AMOUNTS: 'Waiting for amounts', REVIEW_REQUIRED: 'Review required', APPROVED: 'Approved' };
const statusTone = { BLOCKED: 'red', WAITING_FOR_AMOUNTS: 'neutral', REVIEW_REQUIRED: 'amber', APPROVED: 'teal' } as const;
const jobLabels = { PREPARE: 'Draft preparation', PDF: 'PDF generation', PUBLISH: 'Statement publication', REMINDER: 'Private payroll notice' };
const FREQUENCY = { WEEKLY: 'Weekly', BIWEEKLY: 'Every two weeks', SEMIMONTHLY: 'Twice a month', MONTHLY: 'Monthly' } as const;

const quietRange = periodRange;
const quietDay = payDay;
/** Owner premium R7: one status for the open period, said once. The only deadline Payroll holds is the payday, so the
 * words never name an earlier "prepare by" date the app doesn't have. */
function dueText(payday: string, today: string) {
  const days = daysBetween(today, payday);
  return days < 0 ? 'Payday has passed' : days === 0 ? 'Payday is today' : days === 1 ? 'Payday is tomorrow' : 'Prepare by payday';
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

/** A pushed page's header: "‹ Back · Title" on a phone; on wider screens the kit shows the same back link on its own
 * line over the page title (Owner premium A7), so Payroll no longer draws a second one. */
function Pushed({ back, title, id }: { back: { href: string; label: string }; title: string; id: string }) {
  return <>
    <CorpNav back={back} title={title} phoneOnly />
    <CorpTitle id={id} title={title} wide />
  </>;
}

/** Owner premium (visual-craft K): one empty or "not available" state, a centred card with a 15/600 line, an optional
 * 13px line and at most one secondary next step. No icon or illustration. */
export function EmptyCard({ title, detail, action, alert, label = 'Payroll' }: { title: string; detail?: ReactNode; action?: { href: string; label: string }; alert?: boolean; label?: string }) {
  return <CorpCard as="div" ariaLabel={label}>
    <div className="c-empty c-pay__empty" role={alert ? 'alert' : 'status'}><b>{title}</b>{detail ? <span>{detail}</span> : null}</div>
    {action ? <div className="c-pay__empty-action"><CorpButtonLink href={action.href} kind="secondary" size="md">{action.label}</CorpButtonLink></div> : null}
  </CorpCard>;
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

export function PayrollRuns({ recoveryScope, current = null, canEditSettings = false, view = 'home', runId = null, names = {}, company, tabs = null }: {
  recoveryScope: string; current?: OpenPayPeriod | null; canEditSettings?: boolean; view?: PayrollView; runId?: string | null; names?: Record<string, string>; company?: string; tabs?: PayrollTab[] | null;
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
    ? <EmptyCard alert title="This payroll isn’t available" detail="It may have been replaced by a newer revision." action={{ href: '/app/payroll', label: 'Go to Payroll' }} /> : null;

  if (view === 'home') return <PayrollHome current={current} data={data} state={state} today={today} canEditSettings={canEditSettings} company={company} operation={operation} tabs={tabs} />;
  // Single-column pushed pages use the 720px desktop width (visual-craft F).
  if (view === 'prepare') return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-prepare-title">
    <Pushed back={{ href: '/app/payroll', label: 'Payroll' }} title="Prepare payroll" id="payroll-prepare-title" />
    <Feedback operation={operation} />
    {state ?? (data && <PreparePayroll current={current} data={data} today={today} operation={operation} />)}
  </CorpPage>;
  if (view === 'history') return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-history-title">
    <Pushed back={{ href: '/app/payroll', label: 'Payroll' }} title="Pay history" id="payroll-history-title" />
    <Feedback operation={operation} />
    {state ?? (data && <PayHistory data={data} names={names} operation={operation} />)}
  </CorpPage>;
  if (view === 'fix') return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-fix-title">
    <Pushed back={{ href: runId ? reviewHref(runId) : '/app/payroll', label: 'Review payroll' }} title="Fix before payroll" id="payroll-fix-title" />
    <Feedback operation={operation} />
    {state ?? missingRun ?? (run && data && <FixList run={run} capabilities={data.capabilities} names={names} operation={operation} />)}
  </CorpPage>;
  if (view === 'people') return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-people-title">
    <Pushed back={{ href: runId ? reviewHref(runId) : '/app/payroll', label: 'Review payroll' }} title="People" id="payroll-people-title" />
    {state ?? missingRun ?? (run && <PeopleAmounts run={run} />)}
  </CorpPage>;
  return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-review-title">
    <Pushed back={{ href: '/app/payroll', label: 'Payroll' }} title={run?.status === 'APPROVED' ? 'Payroll details' : 'Review payroll'} id="payroll-review-title" />
    <Feedback operation={operation} />
    {state ?? missingRun ?? (run && data && <RunReview key={`${run.id}:${run.revision}:${run.reviewToken}`} run={run} data={data} names={names} operation={operation} />)}
  </CorpPage>;
}

/** The oldest completed period with no payroll whose payday has already passed (missing periods arrive oldest first;
 * sorted again here so the notice never depends on that order). Null when none has passed, or nothing is known. */
function overduePeriod(data: PayrollRunsResponse | null, today: string) {
  const passed = (data?.missingPeriods ?? []).filter(item => item.payday < today);
  return passed.sort((a, b) => a.period.startDate.localeCompare(b.period.startDate))[0] ?? null;
}

/** Owner premium A6 (structure P2), round 2 R3: the pay periods with no payroll come first, as a white card whose title
 * is the screen's one red mark, a grey line naming the oldest period and its payday, and a neutral button that opens
 * that period on Prepare payroll (it never prepares anything by itself). Only what the page already read: the backlog
 * count when it is known, the oldest period and its payday. Shown on Payroll only; Prepare payroll leads with the row. */
function UnpaidNotice({ data, oldest, href }: { data: PayrollRunsResponse; oldest: PayrollMissingPeriod; href: string }) {
  const count = data.backlog && !data.backlog.overflow ? data.backlog.missingCount : null;
  const range = quietRange(oldest.period.startDate, oldest.period.endDate);
  const title = count === 1 ? `${range} has no payroll` : count !== null && count > 1 ? `${count} pay periods have no payroll` : 'Some pay periods have no payroll';
  return <section className="c-card c-pay__unpaid" aria-labelledby="payroll-unpaid-title">
    <div className="c-pay__unpaid-text">
      <h2 id="payroll-unpaid-title" className="c-pay__unpaid-title">{title}</h2>
      <p className="c-pay__unpaid-body">{count === 1 ? <>Its payday was <Num>{quietDay(oldest.payday)}</Num>.</> : <>Oldest is <Num>{range}</Num>. Its payday was <Num>{quietDay(oldest.payday)}</Num>.</>}</p>
    </div>
    <CorpButtonLink href={href} kind="secondary" size="md" className="c-pay__unpaid-go">{unpaidAction(oldest)}</CorpButtonLink>
  </section>;
}
const unpaidHash = (item: PayrollMissingPeriod) => `unpaid-${item.period.startDate}`;
const unpaidAction = (item: PayrollMissingPeriod) => `Start with ${quietRange(item.period.startDate, item.period.endDate)}`;

/** Owner premium A2 (Codex priority 2): the Up next button is the next step the Owner can take now. Prepare before a
 * draft exists; Review issue(s) when something stops it; Review payroll once a draft is ready; details once approved. */
function nextStep(open: PayrollRun | undefined): { label: string; href: string; quiet?: boolean } {
  if (!open) return { label: 'Prepare payroll', href: '/app/payroll/prepare' };
  const fixes = fixItems(open);
  if (fixes.length) return { label: fixes.length === 1 ? 'Review issue' : 'Review issues', href: `/app/payroll/fix?run=${encodeURIComponent(open.id)}` };
  if (open.status === 'APPROVED') return { label: 'Payroll details', href: reviewHref(open.id), quiet: true };
  return { label: 'Review payroll', href: reviewHref(open.id) };
}

/** A payroll row (R7, R9): the period first, " · Correction" when it corrects another, so two rows for one week differ
 * at a glance; then the payday and "Approved" as quiet words (never "Paid"). A status that needs the Owner stays a pill,
 * in grey (R3). The amount shows only when the payroll holds one (a missing amount is never a zero). */
function RunRow({ item }: { item: PayrollRun }) {
  const approved = item.status === 'APPROVED';
  return <CorpRow href={reviewHref(item.id)} bold
    title={<><Num>{quietRange(item.period.startDate, item.period.endDate)}</Num>{item.correctionOf ? ' · Correction' : ''}</>}
    detail={<>Payday <Num>{quietDay(item.payday)}</Num>{approved ? ' · Approved' : ''}</>}
    value={item.totals ? <Num>{formatPayrollMoney(item.totals.netMinor)}</Num> : undefined}
    trail={approved ? undefined : <CorpPill tone="neutral">{statusLabels[item.status]}</CorpPill>} chevron />;
}

/** Corporate (Release 1, board G-O-Payroll), round 2: one 720px column. Unpaid periods first, then Up next (the open
 * period, its payday, one status and its next step), Recent payrolls with the way to Pay history, then the phone's
 * tools (Time exports and Payroll settings are tabs on wider screens). */
function PayrollHome({ current, data, state, today, canEditSettings, company, operation, tabs }: {
  current: OpenPayPeriod | null; data: PayrollRunsResponse | null; state: ReactNode; today: string; canEditSettings: boolean; company?: string; operation: Operation; tabs: PayrollTab[] | null;
}) {
  const runs = data?.runs ?? [];
  const open = current ? runs.find(item => item.period.startDate === current.period.startDate && item.period.endDate === current.period.endDate && !item.correctionOf) : undefined;
  const past = runs.filter(item => item.id !== open?.id).sort((a, b) => b.period.startDate.localeCompare(a.period.startDate) || b.createdAt.localeCompare(a.createdAt));
  const people = open?.rows ?? [];
  const missing = data?.backlog && (data.backlog.overflow || (data.backlog.missingCount ?? 0) > 0) ? data.backlog : null;
  const oldest = overduePeriod(data, today);
  const step = nextStep(open);
  const sub = [current?.frequency ? FREQUENCY[current.frequency] : null, open?.totals ? plural(open.totals.employeeCount, 'person', 'people') : null, company || null].filter(Boolean).join(' · ');
  // R7: each place once. Pay history is the Recent payrolls link; Time exports and Payroll settings are tabs on tablets
  // and desktop and rows on phones (no title buttons).
  const isTab = (href: string) => !!tabs?.some(item => item.href === href);
  const tools = [
    { key: 'exports', phone: isTab('/app/payroll-export'), row: <CorpRow href={current ? `/app/payroll-export?start=${current.period.startDate}&end=${current.period.endDate}` : '/app/payroll-export'} bold title="Time exports" detail="Send hours to your payroll provider" chevron /> },
    canEditSettings ? { key: 'settings', phone: isTab('/app/settings/payroll'), row: <CorpRow href="/app/settings/payroll" bold title="Payroll settings" detail="Pay schedule, reminders and pay statements" chevron /> } : null,
    missing && !oldest ? { key: 'missing', phone: false, row: <CorpRow href="/app/payroll/prepare" bold title="Periods with no payroll" detail="Prepare payroll for each one" value={missing.missingCount === null ? 'Check' : <Num>{String(missing.missingCount)}</Num>} chevron /> } : null,
  ].filter((item): item is NonNullable<typeof item> => !!item);
  return <CorpPage className="c-payroll c-pay c-pay--home c-page--narrow" labelledBy="payroll-title">
    <CorpTitle id="payroll-title" title="Payroll" sub={sub || undefined} />
    <PayrollTabs items={tabs} current="/app/payroll" />
    <Feedback operation={operation} />
    {state ?? <>
      {data && oldest ? <UnpaidNotice data={data} oldest={oldest} href={`/app/payroll/prepare#${unpaidHash(oldest)}`} /> : null}
      {current ? <PayGroup id="payroll-next" label="Up next">
        <div className="c-payroll__next">
          <b>{`${current.frequency ? FREQUENCY[current.frequency] : ''} payroll`.trim().replace(/^payroll$/, 'Payroll')}</b>
          <span><Num>{quietRange(current.period.startDate, current.period.endDate)}</Num>{' · Payday '}<Num>{quietDay(current.payday)}</Num></span>
        </div>
        <div className="c-payroll__go">
          {people.length ? <span className="c-pay__people">
            <span className="c-avs c-pay__avs">{people.slice(0, 3).map((row, index) => <CorpAvatar key={row.employeeId} initials={initials(row.employeeName)} grey={index === 1} />)}</span>
            {people.length > 3 ? <span>{`and ${people.length - 3} more`}</span> : null}
          </span> : <span>{open ? statusLabels[open.status] : dueText(current.payday, today)}</span>}
          <CorpButtonLink size="md" kind={step.quiet ? 'secondary' : undefined} href={step.href}>{step.label}</CorpButtonLink>
        </div>
      </PayGroup> : <EmptyCard label="Pay schedule" title="No pay schedule yet" detail="Set your pay schedule to see the current period."
        action={canEditSettings ? { href: '/app/settings/payroll', label: 'Payroll settings' } : undefined} />}
      <PayGroup id="payroll-recent" label="Recent payrolls" aside={<Link className="c-link" href="/app/payroll/history">Pay history</Link>}>
        {past.length ? <CorpRows label="Past periods">{past.slice(0, 3).map(item => <li key={item.id}><RunRow item={item} /></li>)}</CorpRows>
          : <div className="c-empty c-pay__empty"><b>No past payrolls yet</b><span>Approved payrolls appear here.</span></div>}
      </PayGroup>
      {tools.length ? <div className={tools.every(item => item.phone) ? 'c-only-phone' : undefined}><CorpCard as="div" ariaLabel="Payroll tools">
        <CorpRows label="Payroll tools">{tools.map(item => <li key={item.key} className={item.phone ? 'c-only-phone' : undefined}>{item.row}</li>)}</CorpRows>
      </CorpCard></div> : null}
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
  const [correctionError, setCorrectionError] = useState('');
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
    <PayGroup id="payroll-run" label={periodText(run)}>
      {run.totals ? <dl className="c-pay__totals">
        <div><dt>Gross pay</dt><dd><Num>{formatPayrollMoney(run.totals.grossMinor)}</Num></dd></div>
        <div><dt>Employee deductions</dt><dd><Num>{`−${formatPayrollMoney(run.totals.deductionsMinor)}`}</Num></dd></div>
        <div className="c-pay__net"><dt>Net pay</dt><dd><Num>{formatPayrollMoney(run.totals.netMinor)}</Num></dd></div>
      </dl> : <CorpBody><p className="c-payroll__state">{run.status === 'WAITING_FOR_AMOUNTS' ? 'Amounts appear after your provider’s amounts are imported.' : run.status === 'BLOCKED' ? 'Amounts appear after the items below are fixed and the draft is recalculated.' : 'No pay amounts were entered for this payroll.'}</p></CorpBody>}
      {run.rows ? <CorpRows label="People"><li><CorpRow href={`/app/payroll/people?run=${encodeURIComponent(run.id)}`} title="People" value={<Num>{String(run.totals?.employeeCount ?? run.rows.length)}</Num>} valueTone="soft" chevron /></li></CorpRows> : null}
    </PayGroup>
    {run.correctionOf ? <CorpCard as="div" ariaLabel="Correction"><CorpBody>
      <b className="c-pay__strong">{original ? `Correction of ${quietRange(original.period.startDate, original.period.endDate)}` : 'Correction of an earlier payroll'}</b>
      <p className="c-pay__detail">{reasons.length ? reasons.join(' · ') : 'The original approval and statements remain in history.'}</p>
    </CorpBody></CorpCard> : reasons.length ? <CorpCard as="div" ariaLabel="Correction"><CorpBody><b className="c-pay__strong">Correction reason</b><p className="c-pay__detail">{reasons.join(' · ')}</p></CorpBody></CorpCard> : null}
    {fixes.length ? <CorpCard as="div" ariaLabel="Things to fix"><CorpRows label="Things to fix"><li>
      <CorpRow href={`/app/payroll/fix?run=${encodeURIComponent(run.id)}`} tall bold title={`${plural(fixes.length, 'thing', 'things')} to fix before approving`} detail={<CorpPill tone="red">Stops payroll</CorpPill>} chevron />
    </li></CorpRows></CorpCard> : null}
    {!native && (!approved || correctionOpen) ? <ImportAmounts run={run} capabilities={capabilities} operation={operation} correction={correctionOpen} primary={run.status === 'WAITING_FOR_AMOUNTS' || correctionOpen} /> : null}
    {native && correctionOpen ? <PayGroup id="payroll-correction" label="Create a linked correction"><CorpBody>
      <form className="c-form" {...formKeys} onSubmit={event => { event.preventDefault(); setCorrectionError(''); const problem = flagProblems(event.currentTarget); if (problem) { setCorrectionError(problem); return; } const reason = String(new FormData(event.currentTarget).get('nativeCorrectionReason') ?? '').trim(); if (reason) void operation.submit({ action: 'CORRECT_NATIVE', runId: run.id, expectedRevision: run.revision, reason }); }}>
        <fieldset className="c-pay__fieldset" disabled={locked || !capabilities.canReview}>
          <p className="c-pay__detail">Corrections recalculate a separate linked draft from recorded time and current facts. The replacement requires a new review and approval; original statements stay in history.</p>
          <label className="c-field"><span className="c-field__label">Correction reason</span><textarea className="c-in" name="nativeCorrectionReason" required maxLength={300} rows={3} /></label>
          {correctionError ? <p className="c-error" role="alert">{correctionError}</p> : null}
          <CorpButton type="submit" full>Create correction draft</CorpButton>
        </fieldset>
      </form>
    </CorpBody></PayGroup> : null}
    {approved ? <Documents run={run} native={native} names={names} /> : null}
    {jobs.length ? <Jobs jobs={jobs} canApprove={capabilities.canApprove} locked={locked} operation={operation} /> : null}
    {(native && !approved && !fixes.length) || approved ? <CorpCard as="div" ariaLabel="More actions"><CorpRows label="More actions">
      {native && !approved && !fixes.length ? <li><CorpRow onClick={locked || !capabilities.canReview ? undefined : () => void operation.submit({ action: 'RECALCULATE', runId: run.id, expectedRevision: run.revision })} disabled={locked || !capabilities.canReview}
        title="Recalculate draft" detail="A fresh revision from current recorded time" chevron={false} /></li> : null}
      {approved ? <li><CorpRow onClick={locked || !capabilities.canReview ? undefined : () => setCorrectionOpen(value => !value)} disabled={locked || !capabilities.canReview}
        title={correctionOpen ? 'Close correction' : 'Fix this payroll'} detail="Starts a correction you approve separately" chevron={false} /></li> : null}
      {approved && !native && capabilities.canApprove ? <li><CorpRow onClick={locked ? undefined : () => void operation.submit({ action: 'PAYMENT_EXPORT', runId: run.id, expectedRevision: run.revision })} disabled={locked}
        title="Prepare payment instructions" detail="A file only. NEVORA doesn’t send money." chevron={false} /></li> : null}
    </CorpRows></CorpCard> : null}
    {(run.status === 'REVIEW_REQUIRED' || run.status === 'BLOCKED') ? (capabilities.canApprove ? <div className="c-pay__approve">
      {run.status === 'REVIEW_REQUIRED' ? <Check checked={reviewed} onChange={setReviewed} disabled={locked || operation.revisionConflict}>I reviewed revision {run.revision}, {native ? 'the recorded-time calculation' : 'the provider amounts'} and all employee details.</Check> : null}
      {/* Owner premium A2 (Codex priority 2): while something stops payroll, the step the Owner can take (Review issues)
        * is the primary; the unavailable Approve stays visible as a quiet secondary. Its rule (canApproveNow) is unchanged. */}
      {fixes.length ? <CorpButtonLink full href={`/app/payroll/fix?run=${encodeURIComponent(run.id)}`}>{fixes.length === 1 ? 'Review issue' : 'Review issues'}</CorpButtonLink> : null}
      <CorpButton full kind={fixes.length ? 'secondary' : undefined} disabled={!canApproveNow} onClick={() => run.reviewToken && void operation.submit({ action: 'APPROVE', runId: run.id, expectedRevision: run.revision, reviewToken: run.reviewToken })}>Approve payroll</CorpButton>
      <p className="c-note c-note--center">{fixes.length ? `Fix the ${fixes.length === 1 ? 'thing' : `${fixes.length} things`} above to approve.` : 'Approval freezes the reviewed amounts, finalized time, settings and employee exceptions. A changed source requires a fresh review.'}</p>
    </div> : <p className="c-note c-note--center">An authorized payroll approver must approve this revision.</p>) : null}
    {approved ? <ApprovedNote run={run} names={names} /> : null}
    {approved && unpublished ? (capabilities.canApprove ? <div className="c-pay__approve">
      <Check checked={publishConfirmed} onChange={setPublishConfirmed} disabled={locked}>Share the approved pay statements with each employee.</Check>
      <CorpButton full disabled={locked || !publishConfirmed} onClick={() => void operation.submit({ action: 'PUBLISH', runId: run.id, expectedRevision: run.revision })}>Share pay statements</CorpButton>
    </div> : <p className="c-note c-note--center">An authorized payroll approver must share the pay statements.</p>) : null}
  </>;
}

function ApprovedNote({ run, names }: { run: PayrollRun; names: Record<string, string> }) {
  const when = run.approvedAt ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(run.approvedAt)) : null;
  const who = run.approvedBy ? names[run.approvedBy] : undefined;
  // R7 (copy 67): "Approved", when and by whom. The revision number is internal; approval never says paid.
  return <p className="c-note c-note--center">{`Approved${when ? ` ${when}` : ''}${who ? ` · ${who}` : ''}`}</p>;
}

/** Approved documents (R9): one row each, name first. A statement is named only from this payroll's own rows or the team
 * list by its employee ID, never from its file name; the file name and revision sit in the Download label. */
function Documents({ run, native, names }: { run: PayrollRun; native: boolean; names: Record<string, string> }) {
  const published = run.documents.some(document => document.kind === 'EMPLOYEE_STATEMENT' && document.published);
  const nameOf = (employeeId: string | null) => employeeId ? run.rows?.find(row => row.employeeId === employeeId)?.employeeName ?? names[employeeId] ?? null : null;
  return <PayGroup id="payroll-documents" label="Documents">
    {run.documents.length ? <CorpRows label="Documents">{run.documents.map(document => <li key={document.id}><DocumentRow document={document} name={nameOf(document.employeeId)} revision={run.revision} /></li>)}</CorpRows>
      : <CorpBody><p className="c-payroll__state" role="status">Documents are being prepared. They appear when generation succeeds.</p></CorpBody>}
    {native && !published ? <CorpBody tight><p className="c-pay__detail" role="status"><b className="c-pay__strong">Statements not shared yet</b>Approved statements are shared with employees automatically once they are made and checked. Approval alone doesn’t mean a PDF is ready.</p></CorpBody> : null}
  </PayGroup>;
}

function Jobs({ jobs, canApprove, locked, operation }: { jobs: PayrollJob[]; canApprove: boolean; locked: boolean; operation: Operation }) {
  return <PayGroup id="payroll-jobs" label="Preparation and delivery">
    <CorpRows label="Preparation and delivery">{jobs.map(job => <li key={job.id}>
      <CorpRow title={jobLabels[job.kind]} detail={job.error ?? (job.kind === 'REMINDER' ? noticeOutcome(job.outcome) : `${plural(job.attempts, 'attempt', 'attempts')}`)}
        trail={job.status === 'FAILED' && canApprove
          ? <CorpButton kind="secondary" size="xs" className="c-pay__tap" disabled={locked} onClick={() => void operation.submit({ action: 'RETRY_JOB', jobId: job.id })} aria-label={`Retry ${job.kind === 'REMINDER' ? 'notice queue' : jobLabels[job.kind].toLowerCase()}`}>Retry</CorpButton>
          : <CorpPill tone={job.status === 'FAILED' ? 'red' : 'neutral'}>{job.status === 'SUCCEEDED' ? 'Done' : job.status === 'FAILED' ? 'Failed' : job.status === 'RUNNING' ? 'Running' : 'Waiting'}</CorpPill>} />
    </li>)}</CorpRows>
  </PayGroup>;
}

/** Provider or accountant amounts (historical provider runs): the neutral import, or a linked correction from one. */
function ImportAmounts({ run, capabilities, operation, correction, primary }: { run: PayrollRun; capabilities: PayrollCapabilities; operation: Operation; correction: boolean; primary: boolean }) {
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const fileId = useId();
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setImportError('');
    const problem = flagProblems(event.currentTarget); if (problem) { setImportError(problem); return; }
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
  return <PayGroup id="payroll-import" label={correction ? 'Create a linked correction' : 'Import provider amounts'} aside={run.sourceName ? <span className="c-pay__aside">{run.sourceName}</span> : undefined}><CorpBody>
    <form className="c-form" {...formKeys} onSubmit={submit}><fieldset className="c-pay__fieldset" disabled={locked}>
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
  </CorpBody></PayGroup>;
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
    {cards.length ? cards : <EmptyCard title="Nothing stops this payroll" />}
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
    {run.totals ? <PayGroup id="payroll-people-totals" label={periodText(run)}>
      <dl className="c-pay__totals">
        <div><dt>Gross pay</dt><dd>{formatPayrollMoney(run.totals.grossMinor)}</dd></div>
        <div><dt>Employee deductions</dt><dd>{`−${formatPayrollMoney(run.totals.deductionsMinor)}`}</dd></div>
        <div><dt>Employer contributions</dt><dd>{formatPayrollMoney(run.totals.employerContributionsMinor)}</dd></div>
        <div className="c-pay__net"><dt>{`Net pay · ${plural(run.totals.employeeCount, 'employee', 'employees')}`}</dt><dd>{formatPayrollMoney(run.totals.netMinor)}</dd></div>
      </dl>
    </PayGroup> : null}
    {run.rows ? <PayGroup id="payroll-people" label="Employee amounts">
      <div className="c-pay__search"><label className="c-sr" htmlFor={searchId}>Find employee amounts</label><input id={searchId} className="c-in" type="search" enterKeyHint="search" autoComplete="off" placeholder="Find an employee" value={filter} onChange={event => setFilter(event.target.value)} /></div>
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
      {rows.length === 0 ? <div className="c-empty c-pay__empty" role="status"><b>No employees match</b><span>Check the spelling or clear the search.</span></div> : null}
    </PayGroup> : <EmptyCard title="No employee amounts are saved for this payroll" />}
  </>;
}

/** Up next's Prepare before a draft exists: prepare it (or a period that never had one). When a payday has already
 * passed with no payroll, that period leads (structure PP1, round 2 R3): its row in "Periods with no payroll" opens with
 * the page's one filled "Prepare payroll", and the current week's button steps back to secondary. Payroll's red notice
 * isn't repeated here. Every Prepare still needs its own press, and "Prepare payroll" is the only name for it (R7). */
function PreparePayroll({ current, data, today, operation }: { current: OpenPayPeriod | null; data: PayrollRunsResponse; today: string; operation: Operation }) {
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const open = current ? data.runs.find(item => item.period.startDate === current.period.startDate && item.period.endDate === current.period.endDate && !item.correctionOf) : undefined;
  const [other, setOther] = useState(false);
  const [otherError, setOtherError] = useState('');
  const oldest = overduePeriod(data, today);
  const step = nextStep(open);
  const range = current ? quietRange(current.period.startDate, current.period.endDate) : '';
  return <>
    {current ? <PayGroup id="payroll-prepare" label="Up next">
      <div className="c-payroll__next">
        <b>{`${current.frequency ? FREQUENCY[current.frequency] : ''} payroll`.trim().replace(/^payroll$/, 'Payroll')}</b>
        <span><Num>{range}</Num>{' · Payday '}<Num>{quietDay(current.payday)}</Num></span>
      </div>
      <CorpBody tight>
        <p className="c-pay__detail">Adds up approved hours. Nothing is approved until you say so, and no money moves.</p>
        {open ? <CorpButtonLink href={step.href} full size="md" kind={step.quiet || oldest ? 'secondary' : undefined} className="c-pay__gap">{step.label}</CorpButtonLink>
          : <CorpButton full size="md" kind={oldest ? 'secondary' : undefined} className="c-pay__gap" disabled={locked} aria-label={`Prepare payroll for ${range}`} onClick={() => void operation.submit({ action: 'PREPARE', period: current.period, payday: current.payday })}>Prepare payroll</CorpButton>}
      </CorpBody>
    </PayGroup> : null}
    <Backlog data={data} operation={operation} lead={oldest} />
    {/* R7: "Other dates" is one row that opens its form, like the period rows above (and its action no longer sits past
      * the card edge). */}
    <CorpCard as="div" id="payroll-other" ariaLabel="Other dates">
      <button type="button" className="c-row c-pay__other" aria-expanded={other} aria-controls="payroll-other-form" onClick={() => setOther(value => !value)}>
        <span className="c-row__main"><span className="c-row__title c-row__title--b">Other dates</span><span className="c-row__detail"><span>Outside your pay schedule</span></span></span>
        <span className="c-link c-link--l">{other ? 'Close' : 'Choose dates'}</span>
      </button>
      {other ? <CorpBody><form id="payroll-other-form" className="c-form" {...formKeys} onSubmit={event => {
        event.preventDefault(); setOtherError('');
        const problem = flagProblems(event.currentTarget); if (problem) { setOtherError(problem); return; }
        const values = new FormData(event.currentTarget);
        void operation.submit({ action: 'PREPARE', period: { startDate: String(values.get('start')), endDate: String(values.get('end')) }, payday: String(values.get('payday')) });
      }}><fieldset className="c-pay__fieldset" disabled={locked}>
        <div className="c-field__row"><PayDateField name="start" label="Period start" defaultValue={current?.period.startDate} required /><PayDateField name="end" label="Period end" defaultValue={current?.period.endDate} required /></div>
        <PayDateField name="payday" label="Payday" defaultValue={current?.payday} required />
        {otherError ? <p className="c-error" role="alert">{otherError}</p> : null}
        <CorpButton type="submit" kind="secondary" size="md" full>Prepare payroll</CorpButton>
      </fieldset></form></CorpBody> : null}
    </CorpCard>
  </>;
}

/** Completed periods with no original payroll run (oldest first). The oldest whose payday passed opens on arrival with
 * the page's one primary; Payroll's "Start with …" button opens it too. A row never prepares anything by itself. */
function Backlog({ data, operation, lead }: { data: PayrollRunsResponse; operation: Operation; lead: PayrollMissingPeriod | null }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(() => lead ? JSON.stringify(lead) : null);
  const [acknowledged, setAcknowledged] = useState(false);
  const missing = useMemo(() => data.missingPeriods ?? [], [data.missingPeriods]);
  const backlog = data.backlog;
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const key = (item: PayrollMissingPeriod) => JSON.stringify(item);
  useEffect(() => {
    const openFromHash = () => {
      const start = window.location.hash.match(/^#unpaid-(\d{4}-\d{2}-\d{2})$/)?.[1];
      const index = start ? missing.findIndex(item => item.period.startDate === start) : -1;
      if (index < 0) return;
      if (index >= 3) setExpanded(true);
      setSelected(JSON.stringify(missing[index])); setAcknowledged(false);
      requestAnimationFrame(() => {
        const row = document.getElementById(`unpaid-${start}`);
        row?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        row?.querySelector<HTMLElement>('button.c-row')?.focus({ preventScroll: true });
      });
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, [missing]);
  if (!backlog || (!backlog.overflow && backlog.missingCount === 0 && missing.length === 0)) return null;
  const visible = expanded ? missing : missing.slice(0, 3);
  // R7: the count is the label; the sentence that repeated it is gone. A scan that hit its limit still says so.
  const count = !backlog.overflow && backlog.missingCount !== null ? backlog.missingCount : null;
  return <PayGroup id="payroll-backlog" label={count !== null ? <>Periods with no payroll <span className="c-pay__count"><Num>{count}</Num></span></> : 'Periods with no payroll'}
    aside={missing.length > 3 ? <button type="button" className="c-link" disabled={locked} onClick={() => setExpanded(value => !value)}>{expanded ? 'Show fewer' : `Show all ${missing.length}`}</button> : undefined}>
    {count === null || (backlog.ambiguousCount !== null && backlog.ambiguousCount > 0) ? <CorpBody tight>
      {count === null ? <p className="c-pay__detail">{backlogDescription(backlog)}</p> : null}
      {backlog.ambiguousCount !== null && backlog.ambiguousCount > 0 ? <p className="c-pay__detail">{`${backlog.ambiguousCount} ${backlog.ambiguousCount === 1 ? 'period needs its' : 'periods need their'} dates checked.`}</p> : null}
    </CorpBody> : null}
    <ul className="c-rows" aria-label="Periods with no payroll">{visible.map(item => {
      const open = selected === key(item);
      const id = `period-${item.period.startDate}-${item.settingsRevision}`;
      const range = quietRange(item.period.startDate, item.period.endDate);
      // The oldest period whose payday passed is the page's one primary once its row is open.
      const primary = !!lead && key(lead) === key(item);
      return <li key={key(item)} id={unpaidHash(item)}>
        <button type="button" className="c-row" aria-expanded={open} aria-controls={id} disabled={locked} onClick={() => { setSelected(open ? null : key(item)); setAcknowledged(false); }}>
          <span className="c-row__main"><span className="c-row__title c-row__title--b"><Num>{range}</Num></span><span className="c-row__detail"><span>Payday <Num>{quietDay(item.payday)}</Num></span></span></span>
          {item.state === 'AMBIGUOUS_TRANSITION' ? <CorpPill tone="neutral">Check dates</CorpPill> : null}
          <span className="c-link c-link--l">{open ? 'Close' : 'Prepare'}</span>
        </button>
        {open ? <div id={id} className="c-pay__expand">
          {item.state === 'AMBIGUOUS_TRANSITION' ? <div className="c-pay__check-dates"><b className="c-pay__strong">Check this period’s dates</b><p className="c-pay__detail">{item.issues.join(' ')} Confirm these period boundaries and payday before you prepare it.</p></div> : null}
          <p className="c-pay__detail">Uses your saved payroll settings. You review its timecards and amounts, then approve it separately.</p>
          {item.state === 'AMBIGUOUS_TRANSITION' ? <Check checked={acknowledged} disabled={locked} onChange={setAcknowledged}>I reviewed this schedule transition, period boundaries and payday.</Check> : null}
          <CorpButton kind={primary ? undefined : 'secondary'} size="md" full aria-label={`Prepare payroll for ${range}`} disabled={locked || (item.state === 'AMBIGUOUS_TRANSITION' && !acknowledged)} onClick={() => void operation.submit({ action: 'PREPARE', period: item.period, payday: item.payday })}>Prepare payroll</CorpButton>
        </div> : null}
      </li>;
    })}</ul>
    {backlog.remainingCount !== null && backlog.remainingCount > 0 ? <CorpBody tight><p className="c-pay__detail">{`${backlog.remainingCount} more ${backlog.remainingCount === 1 ? 'period follows' : 'periods follow'}. Prepare one to see the next oldest.`}</p></CorpBody> : null}
  </PayGroup>;
}

/** Every payroll, the pay statements and any delivery work not tied to one payroll. */
function PayHistory({ data, names, operation }: { data: PayrollRunsResponse; names: Record<string, string>; operation: Operation }) {
  const runs = [...data.runs].sort((a, b) => b.period.startDate.localeCompare(a.period.startDate) || b.createdAt.localeCompare(a.createdAt));
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const loose = data.jobs.filter(job => !job.runId);
  return <>
    <PayGroup id="payroll-all" label="Payrolls">
      {runs.length ? <CorpRows label="Payrolls">{runs.map(item => <li key={item.id}><RunRow item={item} /></li>)}</CorpRows>
        : <div className="c-empty c-pay__empty"><b>No payrolls yet</b><span>Prepare payroll from Up next.</span></div>}
    </PayGroup>
    <PortalStatements runs={data.runs} names={names} />
    {loose.length ? <Jobs jobs={loose} canApprove={data.capabilities.canApprove} locked={locked} operation={operation} /> : null}
  </>;
}
