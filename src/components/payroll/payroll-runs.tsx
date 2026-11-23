'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpEmpty, CorpMeta, CorpNav, CorpPage, CorpPill, CorpRow, CorpRows, CorpTitle } from '../corp/corp';
import './payroll-home-corp.css';
import './payroll-corp.css';
import type { OpenPayPeriod } from '@/lib/payroll/pay-calendar.server';
import type { PayrollCapabilities, PayrollJob, PayrollMissingPeriod, PayrollRun, PayrollRunsResponse } from '@/lib/payroll/contracts';
import { readRuns } from './api';
import { payrollImportCopy } from '../payroll-import/copy';
import { formatPayrollMoney, formatSignedPayrollMoney } from './money';
import { usePayrollOperation, usePayrollResource } from './use-payroll';
import { NativeReview } from './native-review';
import { PortalStatements } from './portal-statements';
import { backlogDescription, noticeOutcome, payrollBlockerPlace, payrollExceptionMessage, payrollReviewNotes } from './workflow-status';
import { PayDateField } from './pay-date-field';
import { DocumentRow } from './document-row';
import { Feedback } from './payroll-feedback';
import { PayrollTabs, type PayrollTab } from './payroll-tabs';
import { flagProblems, formKeys } from './form-keys';
import { payDay, periodRange } from './payroll-format';
import { Num, PayGroup } from './pay-group';
import { BButtonLink, BCard, BChip, BGlyph, BHero, BIcon, BList, BLive, BRow, BScreen, BSegs, BStack, BState, BStatusText } from '../owner-b/b-kit';
import { GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { ListChecksIcon } from '@phosphor-icons/react/dist/ssr/ListChecks';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { keepWhole } from '@/lib/keep-whole';

export type PayrollView = 'home' | 'review' | 'fix' | 'people' | 'prepare' | 'history' | 'import';
type Operation = ReturnType<typeof usePayrollOperation>;

const statusLabels = { BLOCKED: 'Needs attention', WAITING_FOR_AMOUNTS: 'Waiting for amounts', REVIEW_REQUIRED: 'Review required', APPROVED: 'Approved' };
// Closing F1 (NV-071): done is green on every screen (an approved payroll, like a published week).
const statusTone = { BLOCKED: 'red', WAITING_FOR_AMOUNTS: 'neutral', REVIEW_REQUIRED: 'amber', APPROVED: 'green' } as const;
const jobLabels = { PREPARE: 'Draft preparation', PDF: 'PDF generation', PUBLISH: 'Pay statement sharing', REMINDER: 'Private payroll notice' };
const FREQUENCY = { WEEKLY: 'Weekly', BIWEEKLY: 'Every two weeks', SEMIMONTHLY: 'Twice a month', MONTHLY: 'Monthly' } as const;

/** PY-14 (Nov 14 inspection): the standing scope line under the Payroll title. NEVORA calculates pay and makes pay
 * statements; it never pays anyone or sends taxes. */
const SCOPE_LINE = 'Calculate pay and share statements. You pay your team outside NEVORA.';
/** PY-3: what is still the Owner's to do once a payroll is approved, and the line that closes it. */
const NEXT_STEPS = ['Pay each person their net pay.', 'Send withheld taxes and employer contributions.', 'Keep the company summary for your accountant.'];
const NEXT_NOTE = 'NEVORA doesn’t pay anyone or send taxes.';
/** PY-11: a correction changes amounts on paper only; any difference in pay is settled by the employer. */
const SETTLE_NOTE = 'If pay changes, settle the difference with the employee outside NEVORA.';
/** AR-4: Time exports' "Who’s included" section; Payroll's blocker opens the page there (payroll-export.tsx reads it). */
const INCLUDED_HASH = 'who-is-included';

const quietRange = periodRange;
const quietDay = payDay;
const firstName = (name: string) => name.split(/\s+/)[0] ?? name;
function listNames(names: string[]) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
/** The day a payroll was approved ("Oct 12"), for its subtitle; approval never says paid (R7, copy 67). */
const approvedDay = (iso: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
const reviewHref = (id: string) => `/app/payroll/review?run=${encodeURIComponent(id)}`;
const periodText = (run: Pick<PayrollRun, 'period' | 'payday'>) => `${quietRange(run.period.startDate, run.period.endDate)} · Payday ${quietDay(run.payday)}`;
/** Blocking items the Fix page lists: everything except the provider-amounts wait (that is the import step). */
const fixItems = (run: PayrollRun) => run.status === 'APPROVED' ? [] : payrollReviewNotes(run.exceptions).blocking.filter(item => item !== 'WAITING_FOR_AMOUNTS');

/** A pushed page's header: "‹ Back · Title" on a phone; on wider screens the kit shows the same back link on its own
 * line over the page title (Owner premium A7), so Payroll no longer draws a second one. */
function Pushed({ back, title, id, sub }: { back: { href: string; label: string }; title: string; id: string; sub?: ReactNode }) {
  return <>
    <CorpNav back={back} title={title} phoneOnly />
    <CorpTitle id={id} title={title} wide sub={sub} />
    {sub ? <p className="c-phone-sub" aria-hidden="true">{sub}</p> : null}
  </>;
}

/** Owner premium (visual-craft K): one empty or "not available" state, a centred card with a 15/600 line, an optional
 * 13px line and at most one secondary next step. No icon or illustration. */
/** Review B5 (NV-254): the one empty-state pattern: an icon in a tinted circle, a 16/22 title, the line, the action as a pill,
 * left-aligned (it was centred with a grey button). */
export function EmptyCard({ title, detail, action, alert, label = 'Payroll' }: { title: string; detail?: ReactNode; action?: { href: string; label: string }; alert?: boolean; label?: string }) {
  return <CorpCard as="div" ariaLabel={label}>
    <div className="c-pay__empty"><BState kind={alert ? 'failed' : 'empty'} alert={alert} icon={alert ? undefined : <ReceiptIcon weight="bold" />} title={title} line={detail} action={action ? { label: action.label, href: action.href } : undefined} /></div>
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

export function PayrollRuns({ recoveryScope, current = null, canEditSettings = false, view = 'home', runId = null, names = {}, company, tabs = null, timeZone }: {
  recoveryScope: string; current?: OpenPayPeriod | null; canEditSettings?: boolean; view?: PayrollView; runId?: string | null; names?: Record<string, string>; company?: string; tabs?: PayrollTab[] | null;
  /** The workspace's zone: "today" (paydays, overdue periods) is the company's day, as on Home (review B2, NV-024). */
  timeZone?: string;
}) {
  const resource = usePayrollResource('/api/payroll/runs', readRuns);
  const operation = usePayrollOperation('/api/payroll/runs', resource.reload, recoveryScope);
  const router = useRouter();
  const [today] = useState(() => companyDay(timeZone));
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

  // Backend (Nov 15, 2026): the runs read names the current period, its payday and the workplace's day (asOfDate). It is
  // the page's period once read; null means no effective pay schedule. Before it arrives (or from an older read) the
  // route's period stands, as before. The route's frequency still names the payroll.
  const fromRead = data?.currentPeriod;
  const period: OpenPayPeriod | null = fromRead === undefined ? current : fromRead === null ? null
    : { period: fromRead.period, payday: fromRead.payday, ...(current?.frequency ? { frequency: current.frequency } : {}) };
  const asOf = fromRead?.asOfDate ?? today;
  if (view === 'home') return <PayrollHome current={period} data={data} state={state} today={asOf} canEditSettings={canEditSettings} company={company} operation={operation} tabs={tabs} />;
  // Single-column pushed pages use the 720px desktop width (visual-craft F).
  if (view === 'prepare') return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-prepare-title">
    <Pushed back={{ href: '/app/payroll', label: 'Payroll' }} title="Prepare payroll" id="payroll-prepare-title" />
    <Feedback operation={operation} />
    {state ?? (data && <PreparePayroll current={period} data={data} today={asOf} operation={operation} />)}
  </CorpPage>;
  if (view === 'history') return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-history-title">
    <Pushed back={{ href: '/app/payroll', label: 'Payroll' }} title="Payroll history" id="payroll-history-title" />
    <Feedback operation={operation} />
    {state ?? (data && <PayHistory data={data} names={names} operation={operation} />)}
  </CorpPage>;
  if (view === 'fix') return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-fix-title">
    <Pushed back={{ href: runId ? reviewHref(runId) : '/app/payroll', label: run?.status === 'APPROVED' ? 'Payroll details' : 'Review payroll' }} title="Fix before payroll" id="payroll-fix-title" />
    <Feedback operation={operation} />
    {state ?? missingRun ?? (run && data && <FixList run={run} capabilities={data.capabilities} names={names} operation={operation} />)}
  </CorpPage>;
  if (view === 'people') return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-people-title">
    {/* Round 5 (Nov 8): the way back is named like the page it returns to ("Payroll details" once approved). */}
    <Pushed back={{ href: runId ? reviewHref(runId) : '/app/payroll', label: run?.status === 'APPROVED' ? 'Payroll details' : 'Review payroll' }} title="People" id="payroll-people-title" />
    {state ?? missingRun ?? (run && <PeopleAmounts run={run} replaced={!!data?.runs.some(item => item.correctionOf === run.id)} />)}
  </CorpPage>;
  return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-review-title">
    {/* Nov 1 upscale: the payroll's period, payday and status are the subtitle ("Oct 5–11 · Payday Tue, Oct 13 · Approved"). */}
    <Pushed back={{ href: '/app/payroll', label: 'Payroll' }} title={run?.status === 'APPROVED' ? 'Payroll details' : 'Review payroll'} id="payroll-review-title"
      sub={run && !state ? `${periodText(run)} · ${statusLabels[run.status]}${run.status === 'APPROVED' && run.approvedAt ? ` ${approvedDay(run.approvedAt)}` : ''}` : undefined} />
    <Feedback operation={operation} />
    {state ?? missingRun ?? (run && data && <RunReview key={`${run.id}:${run.revision}:${run.reviewToken}`} run={run} data={data} names={names} operation={operation} />)}
  </CorpPage>;
}

/** The oldest completed period with no payroll whose payday has already passed (missing periods arrive oldest first;
 * sorted again here so the notice never depends on that order). Null when none has passed, or nothing is known. */
/** Today's date (YYYY-MM-DD) in the company's zone; the device's day only if the zone is unknown or invalid. */
function companyDay(timeZone?: string) {
  const now = new Date();
  try { if (timeZone) return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); } catch { /* fall through */ }
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function overduePeriod(data: PayrollRunsResponse | null, today: string) {
  const passed = (data?.missingPeriods ?? []).filter(item => item.payday < today);
  return passed.sort((a, b) => a.period.startDate.localeCompare(b.period.startDate))[0] ?? null;
}

/** Owner premium A6 (structure P2), round 2 R3: the pay periods with no payroll come first, as a white card whose title
 * is the screen's one red mark, a grey line naming the oldest period and its payday, and the page's one filled button
 * (Nov 1 upscale, "Prepare Sep 21–27") that opens that period on Prepare payroll (it never prepares anything by itself). Only what the page already read: the backlog
 * count when it is known, the oldest period and its payday. Shown on Payroll only; Prepare payroll leads with the row. */
function UnpaidNotice({ data, oldest, href }: { data: PayrollRunsResponse; oldest: PayrollMissingPeriod; href: string }) {
  const count = data.backlog && !data.backlog.overflow ? data.backlog.missingCount : null;
  const range = quietRange(oldest.period.startDate, oldest.period.endDate);
  const title = count === 1 ? `${range} has no payroll` : count !== null && count > 1 ? `${count} pay periods have no payroll` : 'Some pay periods have no payroll';
  return <section className="c-card c-pay__unpaid" aria-labelledby="payroll-unpaid-title">
    {/* OW-018: as on the phone, the red is the icon's; the title is ink. Phase 9 (spec 2.2): it stops payroll, so it is the
      * circle (WarningCircle); the triangle is amber's "check". */}
    <BIcon tone="red"><BGlyph meaning="stop" /></BIcon>
    <div className="c-pay__unpaid-text">
      <h2 id="payroll-unpaid-title" className="c-pay__unpaid-title">{title}</h2>
      <p className="c-pay__unpaid-body">{count === 1 ? <>Scheduled payday was <Num>{quietDay(oldest.payday)}</Num>.</> : <>Oldest is <Num>{range}</Num>. Scheduled payday was <Num>{quietDay(oldest.payday)}</Num>.</>}</p>
    </div>
    <CorpButtonLink href={href} size="md" className="c-pay__unpaid-go">{unpaidAction(oldest)}</CorpButtonLink>
  </section>;
}
const unpaidHash = (item: PayrollMissingPeriod) => `unpaid-${item.period.startDate}`;
const unpaidAction = (item: PayrollMissingPeriod) => `Prepare ${quietRange(item.period.startDate, item.period.endDate)}`;

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
function RunRow({ item, replaced = false }: { item: PayrollRun; replaced?: boolean }) {
  const approved = item.status === 'APPROVED';
  // Closing F1 (NV-082), batch 1 item 3: a payroll a correction replaced says so once ("Replaced by a correction", Phase 8, a.md #47: the words the statements use; the grey chip that repeated it is gone) and is
  // listed right under its correction (byCorrection), indented.
  if (replaced) return <CorpRow href={reviewHref(item.id)} bold icon={<ReceiptIcon className="c-ic" weight="bold" />}
    title={quietRange(item.period.startDate, item.period.endDate)}
    detail={<BSegs parts={['Replaced by a correction', `Payday ${quietDay(item.payday)}`.replace(/ /g, '\u00a0')]} />}
    value={item.totals ? <NetAmount minor={item.totals.netMinor} /> : undefined} valueTone="ink" chevron />;
  // Round 5 (Nov 7, 2026): drawn like Payroll's Recent payrolls: the receipt icon, a "Correction" pill instead of words in
  // the title, the amount bold. A status that needs the Owner still wins the pill.
  return <CorpRow href={reviewHref(item.id)} bold icon={<ReceiptIcon className="c-ic" weight="bold" />}
    title={<>{quietRange(item.period.startDate, item.period.endDate)}{approved && item.correctionOf ? <> <CorpMeta>Correction</CorpMeta></> : null}</>}
    detail={<BSegs parts={[`Payday ${quietDay(item.payday)}`.replace(/ /g, '\u00a0'), approved ? 'Approved' : null]} />}
    value={item.totals ? <NetAmount minor={item.totals.netMinor} /> : undefined} valueTone="ink"
    trail={!approved ? <CorpPill tone={statusTone[item.status]}>{statusLabels[item.status]}</CorpPill> : undefined} chevron />;
}

/** OW-018: a row's amount is the payroll's net total (`totals.netMinor`), so it says "Net" under the figure, as the
 * phone's rows do. */
function NetAmount({ minor }: { minor: string }) {
  return <span className="c-pay__amt"><Num>{formatPayrollMoney(minor)}</Num><span className="c-pay__amt-k">Net</span></span>;
}

/** Closing F1 (NV-082): newest first, except that a payroll a correction replaced follows its correction (flagged
 * `replaced`), so "Oct 19–25" twice reads as one correction and the run it replaced. */
function byCorrection(runs: PayrollRun[]): { item: PayrollRun; replaced: boolean }[] {
  const replacedBy = new Map<string, string>();
  for (const run of runs) if (run.correctionOf && runs.some(other => other.id === run.correctionOf)) replacedBy.set(run.correctionOf, run.id);
  const out: { item: PayrollRun; replaced: boolean }[] = [];
  const place = (run: PayrollRun) => {
    out.push({ item: run, replaced: replacedBy.has(run.id) });
    for (const original of runs) if (original.id === run.correctionOf && replacedBy.get(original.id) === run.id) place(original);
  };
  for (const run of runs) if (!replacedBy.has(run.id)) place(run);
  return out;
}

/** PY-3 (Nov 14 inspection): an approved payroll's hand-off, on Payroll and on Payroll details. Approval ends NEVORA's
 * part; paying people and sending taxes stay with the Owner. Not shown for a correction or a payroll a correction
 * replaced (their amounts aren't the ones to pay in full). */
function WhatsNext() {
  return <div className="c-pay__next">
    <ul>{NEXT_STEPS.map(text => <li key={text}>{text}</li>)}</ul>
    <p className="c-pay__next-note">{NEXT_NOTE}</p>
  </div>;
}
/** Whether an approved payroll still stands as the one to act on (no correction replaced it). */
const standsApproved = (run: PayrollRun | undefined, runs: PayrollRun[]) => !!run && run.status === 'APPROVED' && !run.correctionOf && !runs.some(item => item.correctionOf === run.id);

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
  // and desktop. Nov 1 upscale (three cards at most): on phones Time exports is the last row of Recent payrolls and
  // Payroll settings is a "Settings" link on the title row.
  const isTab = (href: string) => !!tabs?.some(item => item.href === href);
  const exportsHref = current ? `/app/payroll-export?start=${current.period.startDate}&end=${current.period.endDate}` : '/app/payroll-export';
  const paidHref = current ? `/app/payroll-export/paid-time?start=${current.period.startDate}&end=${current.period.endDate}` : '/app/payroll-export/paid-time';
  const exportsRow = <li className={isTab('/app/payroll-export') ? 'c-only-phone' : undefined}><CorpRow href={exportsHref} one title="Time exports" chevron /></li>;
  // Backend (Nov 15, 2026): this period's timecards, with the day approval opens while the period runs and "Pay period
  // ended" after (the words Things to do uses; it doesn't claim what's left to approve). It opens Timecards on that period.
  const timecards = current ? { href: `/app/timecards?start=${current.period.startDate}&end=${current.period.endDate}`,
    line: today > current.period.endDate ? 'Pay period ended' : `Can be approved from ${quietDay(new Date(Date.parse(`${current.period.endDate}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10))}` } : null;
  const settings = canEditSettings ? <Link className={isTab('/app/settings/payroll') ? 'c-link c-link--l c-only-phone' : 'c-link c-link--l'} href="/app/settings/payroll" aria-label="Payroll settings">Settings</Link> : undefined;
  const frequency = `${current?.frequency ? FREQUENCY[current.frequency] : ''} payroll`.trim().replace(/^payroll$/, 'Payroll');
  // Up next is one row (Nov 1 upscale): the payroll, its period and payday; it opens the next step (Prepare, Review issues,
  // Review payroll or the approved details). Once a draft exists, that step is the row's grey value ("Review issue").
  const nextValue = open && open.status !== 'APPROVED' ? step.label : undefined;
  // Direction B (Jose approved Nov 5, 2026; mock "Owner · Payroll"): the dark ink hero for money, the open period as its
  // headline with this payroll's own figures (people, gross, net once it holds amounts; never an estimate), the three
  // steps with the same next-step button, then Recent payrolls. Tablets and desktop keep the layout below.
  const days = current ? Math.round((Date.parse(`${current.payday}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000) : null;
  // Phase 8 (a.md #15): a date from the pay schedule is the "Scheduled payday" (DESIGN, payroll scope wording).
  const paydayWhen = days === null || days < 0 ? null : days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  const paydayChip = days === null ? null : days === 0 ? 'Scheduled payday today' : days === 1 ? 'Scheduled payday tomorrow' : days > 1 ? `Scheduled payday in ${days} days` : 'Scheduled payday passed';
  const fixing = /issue/i.test(step.label);
  // Phase 8 (a.md #35): before a draft exists the action is named by its period, as the overdue one is ("Prepare Nov 16–22").
  const stepName = !open && current ? `Prepare ${quietRange(current.period.startDate, current.period.endDate)}` : step.label;
  // PY-4: a payroll NEVORA calculates shares its pay statements by itself once approved (the worker queues it); an imported
  // one keeps the manual share step. Before a draft exists, new payrolls are calculated here whenever the calculator is on.
  const native = open ? open.sourceAuthority === 'NATIVE_RECORDED_TIME' : !!data?.capabilities.internalCalculatorAvailable;
  const handOff = standsApproved(open, runs);
  const stepState = (n: 1 | 2 | 3) => n === 1 ? (open ? 'done' : 'now') : n === 2 ? (open?.status === 'APPROVED' ? 'done' : open ? 'now' : '') : open?.status === 'APPROVED' ? 'done' : '';
  const bStep = (n: 1 | 2 | 3, title: string, detail: string) => <div className={`b-step${stepState(n) ? ` b-step--${stepState(n)}` : ''}`}>
    <span className="b-step__n" aria-hidden="true">{n}</span><span className="b-step__tx"><span className="b-step__t">{title}</span><span className="b-step__s">{detail}</span></span>
    <span className="b-sr">{stepState(n) === 'done' ? 'Done' : stepState(n) === 'now' ? 'Next' : 'Later'}</span></div>;
  // OW-005 / BR-8: the same three steps on the phone card and, without the button, under desktop's Up next row.
  const steps = <>
    {bStep(1, 'Prepare payroll', open ? 'Started from approved time' : 'Bring in approved time for this period')}
    {bStep(2, fixing ? 'Fix issues' : 'Review pay', fixing ? 'Something stops this payroll' : 'Hours, rates and deductions')}
    {bStep(3, 'Approve payroll', native ? 'Statements are shared with your team automatically' : 'Then share pay statements')}
  </>;
  const bScreen = <BScreen ink>
    <BHero title="Payroll" titleId="b-payroll-title" sub={sub || undefined} right={canEditSettings ? <BButtonLink href="/app/settings/payroll" kind="glass" label="Payroll settings"><GearSixIcon size={16} weight="bold" aria-hidden="true" />Settings</BButtonLink> : undefined}>
      <p className="b-sub c-pay__scope c-pay__scope--hero">{SCOPE_LINE}</p>
      {current ? <div className="b-hpad">
        <div className="b-hkicker">{/* Premium pass FA (final verification A #6, spec 3.1): how far
          * away the scheduled payday is is a time fact, so it is grey header text on the kicker's line, as Home's payday tile
          * says it; only a payday that passed is an exception and keeps the amber chip. Final regression review #4: the
          * kicker and the time fact are one facts line (BSegs), so they never run together without the dot. */}
          {paydayChip && days !== null && days < 0
            ? <><span>{`Up next · ${frequency}`}</span><span className="b-chip b-chip--due">{paydayChip}</span></>
            : <BSegs parts={['Up next', frequency]} />}</div>
        <p className="b-hbig">{quietRange(current.period.startDate, current.period.endDate)}</p>
      </div> : null}
      {/* Phase 8 (a.md #28): honest figures. People shows once the payroll knows them and Net pay once it holds amounts;
        * a tile is never a bare dash. */}
      {current ? <BLive label="This payroll" items={[
        // Polish (Nov 20, 2026): how far away the payday is is said once, as the tile's caption (the band said "Scheduled
        // payday in 7 days" and the tile repeated its label). A payday that passed keeps the amber chip above.
        { label: 'Scheduled payday', value: quietDay(current.payday).replace(/^\w+,\s*/, ''), meta: paydayWhen ?? undefined },
        ...(open?.totals || people.length ? [{ label: 'People', value: open?.totals ? open.totals.employeeCount : people.length }] : []),
        ...(open?.totals ? [{ label: 'Net pay', value: formatPayrollMoney(open.totals.netMinor) }] : []),
      ]} /> : null}
    </BHero>
    <BStack>
      <Feedback operation={operation} />
      {state ?? <>
        {data && oldest ? <BCard label="Pay periods with no payroll"><div className="b-notice"><BIcon tone="red"><BGlyph meaning="stop" /></BIcon>
          <span className="b-notice__tx"><span className="b-notice__t">{data.backlog && !data.backlog.overflow && data.backlog.missingCount !== null && data.backlog.missingCount > 1 ? `${data.backlog.missingCount} pay periods have no payroll` : `${quietRange(oldest.period.startDate, oldest.period.endDate)} has no payroll`}</span>
            <span className="b-notice__s">{data.backlog && !data.backlog.overflow && data.backlog.missingCount === 1 ? `Scheduled payday was ${quietDay(oldest.payday)}` : `Oldest is ${quietRange(oldest.period.startDate, oldest.period.endDate).replace(/ /g, '\u00a0').replace(/\u2009/g, '\u202f').replace(/–/g, '–\u2060')}, scheduled payday ${quietDay(oldest.payday).replace(/ /g, '\u00a0').replace(/\u2009/g, '\u202f')}`}</span></span>
          {/* Review B5 (NV-081): the overdue period is the page's one filled action; the current period's steps back. */}
          {/* Phase 8 (a.md #35): the button says its period, as on desktop ("Prepare Nov 2–8"). */}
          <BButtonLink href={`/app/payroll/prepare#${unpaidHash(oldest)}`} kind="teal">{unpaidAction(oldest)}</BButtonLink></div></BCard> : null}
        {/* Phase 8 (a.md #35): the steps say "Prepare payroll" once; the card has no second heading for it. */}
        {current ? <BCard title={open?.status === 'APPROVED' ? 'Payroll approved' : undefined} label="Payroll steps" id="b-payroll-steps">
          <div className="b-steps">
            {steps}
            {/* The period's timecards read as one more line of the steps (same circle, text column and divider), above the
              * card's action, so it doesn't trail after the button. */}
            {timecards ? <Link className="b-step b-step--link" href={timecards.href}>
              {/* Phase 9 (spec 3.6): timecards are the Clock everywhere (the sidebar's Time). */}
              <span className="b-step__n" aria-hidden="true"><ClockIcon weight="bold" /></span>
              <span className="b-step__tx"><span className="b-step__t">Timecards</span><span className="b-step__s">{keepWhole(timecards.line)}</span></span>
              <CaretRightIcon className="b-step__chev" size={18} weight="bold" aria-hidden="true" />
            </Link> : null}
            {/* OW-005: while an overdue period leads, its Prepare is the screen's one button and this period's step is a
              * quiet teal link (as on Prepare payroll), not a second button in another style. */}
            {data && oldest ? <Link className="b-link c-pay__steplink" href={step.href} aria-label={stepName === step.label ? `${step.label}, ${quietRange(current.period.startDate, current.period.endDate)}` : undefined}>{stepName}</Link>
              : <BButtonLink href={step.href} kind={step.quiet ? 'ghost' : 'teal'} full big label={stepName === step.label ? `${step.label}, ${quietRange(current.period.startDate, current.period.endDate)}` : undefined}>{stepName}</BButtonLink>}
          </div>
          {missing && !oldest ? <BList label="Periods with no payroll"><BRow href="/app/payroll/prepare" title="Periods with no payroll" sub="Prepare payroll for each one" end={<b className="c-num">{missing.missingCount === null ? 'Check' : String(missing.missingCount)}</b>} /></BList> : null}
        </BCard> : <BCard label="Pay schedule"><div className="b-notice"><span className="b-notice__tx"><span className="b-notice__t">No pay schedule yet</span><span className="b-notice__s">Set your pay schedule to see the current period.</span></span>
          {canEditSettings ? <BButtonLink href="/app/settings/payroll" kind="ghost">Settings</BButtonLink> : null}</div></BCard>}
        {handOff ? <BCard title="What’s next" id="b-payroll-handoff"><WhatsNext /></BCard> : null}
        <BCard title="Recent payrolls" id="b-payroll-recent" link={{ href: '/app/payroll/history', label: 'Payroll history' }}>
          {past.length ? <BList label="Past periods">{byCorrection(past).slice(0, 3).map(({ item, replaced }) => {
            const approved = item.status === 'APPROVED';
            // Closing F1 (NV-082): a replaced payroll follows its correction; it says so once, in its line ("Replaced by a correction").
            // Premium pass FA (final verification A #30): one payroll row, the one Payroll history draws: a row that opens leads
            // with the teal circle, "Approved" is the last fact of its line, and the amount is "Net".
            return <BRow key={item.id} href={reviewHref(item.id)} lead={<BIcon tone="teal"><ReceiptIcon weight="bold" /></BIcon>}
              title={<span className={replaced ? 'c-pay__was' : undefined}>{quietRange(item.period.startDate, item.period.endDate)}</span>} chip={replaced ? /* Batch 1 item 3 (as RunRow): the line below already says "Replaced by a correction", so no chip repeats it. */ undefined : item.correctionOf ? /* Final polish (Nov 20, 2026): a correction is a fact about the payroll, so grey meta beside the period; the chip stays for "Replaced". */ <BStatusText>Correction</BStatusText> : approved ? undefined : <BChip tone="amber">{statusLabels[item.status]}</BChip>}
              /* Premium pass FA (final verification A #10): "Payday Fri, Nov 6" is one unit and never splits. */
              sub={<BSegs parts={[replaced ? 'Replaced by a correction' : null, `Payday ${quietDay(item.payday)}`.replace(/ /g, '\u00a0'), approved && !replaced ? 'Approved' : null]} />}
              end={item.totals ? <><b className="c-num">{formatPayrollMoney(item.totals.netMinor)}</b><span>Net</span></> : undefined} chevron={!item.totals} />;
          })}</BList> : <p className="b-state">No past payrolls yet. Approved payrolls appear here.</p>}
        </BCard>
        <BCard label="Payroll tools"><BList label="Payroll tools">
          {/* Phase 8 (a.md #14, #22): a row that opens leads with the teal-50 circle, and Time exports says what Timecards says. */}
          {/* Premium pass FA (final verification B #9): a download is the down arrow, as its words say (it drew the upload arrow). */}
          <BRow href={exportsHref} lead={<BIcon tone="teal"><DownloadSimpleIcon weight="bold" /></BIcon>} title="Time exports" sub="Download hours for payroll" />
          <BRow href={paidHref} lead={<BIcon tone="teal"><ListChecksIcon weight="bold" /></BIcon>} title={payrollImportCopy.en.exp.entry.title} sub={payrollImportCopy.en.exp.entry.line} />
        </BList></BCard>
      </>}
    </BStack>
  </BScreen>;
  return <CorpPage className="c-payroll c-pay c-pay--home c-page--narrow" labelledBy="payroll-title">
    {bScreen}
    <CorpTitle id="payroll-title" title="Payroll" sub={<><span className="c-pay__cadence">{sub}</span><span className="c-pay__scope">{SCOPE_LINE}</span></>} actions={settings} />
    <PayrollTabs items={tabs} current="/app/payroll" />
    <Feedback operation={operation} />
    {state ?? <>
      {/* OW-018: from 1024px Payroll is a list with a right rail, like Team. Up next (the period, its payday and the
        * three steps) is the rail card; the notice and Recent payrolls are the list. Tablets keep one column in this
        * order, which is also the reading and focus order at every width. */}
      <div className="c-pay__cols">
      {data && oldest ? <UnpaidNotice data={data} oldest={oldest} href={`/app/payroll/prepare#${unpaidHash(oldest)}`} /> : null}
      {current ? <PayGroup id="payroll-next" label="Up next">
        <CorpRows label="Up next">
          <li className="c-payroll__upnext"><CorpRow href={step.href} bold title={frequency}
            detail={<><Num>{quietRange(current.period.startDate, current.period.endDate)}</Num>{' · Scheduled payday '}<Num>{quietDay(current.payday)}</Num>{nextValue ? null : <span className="c-sr">{`. ${step.label}`}</span>}</>}
            // Sweep 1: no aria-label; the row is named by its own text, and the step it opens is read (not drawn) when the row doesn't show it.
            value={nextValue} valueTone="soft" chevron /></li>
          {timecards ? <li><CorpRow href={timecards.href} title="Timecards" detail={timecards.line} chevron /></li> : null}
          {missing && !oldest ? <li><CorpRow href="/app/payroll/prepare" bold title="Periods with no payroll" detail="Prepare payroll for each one" value={missing.missingCount === null ? 'Check' : <Num>{String(missing.missingCount)}</Num>} chevron /></li> : null}
        </CorpRows>
        <div className="b-steps c-pay__steps" role="group" aria-label="Payroll steps">{steps}</div>
      </PayGroup> : <EmptyCard label="Pay schedule" title="No pay schedule yet" detail="Set your pay schedule to see the current period."
        action={canEditSettings ? { href: '/app/settings/payroll', label: 'Payroll settings' } : undefined} />}
      {handOff ? <PayGroup id="payroll-handoff" label="What’s next"><WhatsNext /></PayGroup> : null}
      <PayGroup id="payroll-recent" label="Recent payrolls" aside={<Link className="c-link" href="/app/payroll/history">Payroll history</Link>}>
        {past.length ? <CorpRows label="Past periods">{byCorrection(past).slice(0, 3).map(({ item, replaced }) => <li key={item.id} className={replaced ? 'c-pay__replaced' : undefined}><RunRow item={item} replaced={replaced} /></li>)}{exportsRow}</CorpRows>
          : <><div className="c-empty c-pay__empty"><b>No past payrolls yet</b><span>Approved payrolls appear here.</span></div><CorpRows label="Payroll tools">{exportsRow}</CorpRows></>}
      </PayGroup>
      </div>
    </>}
  </CorpPage>;
}

/** Backend (Nov 15, 2026): a correction's `correctionDelta` compares net pay on the earlier statements with this draft,
 * in signed USD minor units, per person and in total. It is a statement comparison: it never says money was paid or
 * taxes remitted (the settle note under it says what to do). Only people whose net pay changes are listed; a person's
 * name is shown when the page has it, otherwise "A team member". */
function CorrectionDelta({ delta, names }: { delta: NonNullable<PayrollRun['correctionDelta']>; names: Record<string, string> }) {
  const changed = delta.employees.filter(row => row.deltaNetMinor !== '0');
  return <div className="c-pay__delta">
    <p className="c-pay__detail"><b>{`Net pay on statements: ${formatSignedPayrollMoney(delta.totalNetMinor)}`}</b>{changed.length ? ` across ${plural(changed.length, 'person', 'people')}` : delta.totalNetMinor === '0' ? ' (no one’s net pay changes)' : ''}</p>
    {changed.length ? <ul className="c-pay__deltalist" aria-label="Net pay changes by person">{changed.map(row => <li key={row.employeeId}>
      <span>{names[row.employeeId] ?? 'A team member'}</span>
      <span className="c-num">{`was ${formatPayrollMoney(row.previousNetMinor)} · now ${formatPayrollMoney(row.netMinor)}`}</span>
      <b className="c-num">{formatSignedPayrollMoney(row.deltaNetMinor)}</b>
    </li>)}</ul> : null}
  </div>;
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
  // Batch 1 item 1: a payroll a correction replaced says so and opens the correction; it isn't fixed or paid again here.
  const replacement = data.runs.find(item => item.correctionOf === run.id);
  const reasons = [...(run.nativeCorrection ? [run.nativeCorrection.reason] : []), ...notes.corrections];
  const jobs = data.jobs.filter(job => job.runId === run.id);
  const canApproveNow = !locked && !operation.revisionConflict && reviewed && !!run.reviewToken && !!run.rows && !!run.totals && notes.blocking.length === 0;
  const unpublished = !native && run.documents.some(document => document.kind === 'EMPLOYEE_STATEMENT' && !document.published);
  return <>
    {/* Closing F1 (NV-237): the band already names the period and payday, so the card is "Totals". */}
    <PayGroup id="payroll-run" label="Totals">
      {run.totals ? <dl className="c-pay__totals">
        <div><dt>Gross pay</dt><dd><Num>{formatPayrollMoney(run.totals.grossMinor)}</Num></dd></div>
        <div><dt>Employee deductions</dt><dd><Num>{`−${formatPayrollMoney(run.totals.deductionsMinor)}`}</Num></dd></div>
        <div className="c-pay__net"><dt>Net pay</dt><dd><Num>{formatPayrollMoney(run.totals.netMinor)}</Num></dd></div>
      </dl> : <CorpBody><p className="c-payroll__state">{run.status === 'WAITING_FOR_AMOUNTS' ? 'Amounts appear after your provider’s amounts are imported.' : run.status === 'BLOCKED' ? 'Amounts appear after the items below are fixed and the draft is recalculated.' : 'No pay amounts were entered for this payroll.'}</p></CorpBody>}
      {run.rows ? <CorpRows label="People"><li><CorpRow href={`/app/payroll/people?run=${encodeURIComponent(run.id)}`} title="People" value={<Num>{String(run.totals?.employeeCount ?? run.rows.length)}</Num>} valueTone="soft" chevron /></li></CorpRows> : null}
    </PayGroup>
    {replacement ? <CorpCard as="div" ariaLabel="Replaced"><CorpRows label="Replaced"><li>
      <CorpRow href={reviewHref(replacement.id)} bold title="Replaced by a correction" chevron />
    </li></CorpRows></CorpCard> : null}
    {run.correctionOf ? <CorpCard as="div" ariaLabel="Correction"><CorpBody>
      <b className="c-pay__strong">{original ? `Correction of ${quietRange(original.period.startDate, original.period.endDate)}` : 'Correction of an earlier payroll'}</b>
      <p className="c-pay__detail">{reasons.length ? reasons.join(' · ') : 'The original approval and statements remain in history.'}</p>
      {run.correctionDelta ? <CorrectionDelta delta={run.correctionDelta} names={names} /> : null}
      <p className="c-pay__detail">{SETTLE_NOTE}</p>
    </CorpBody></CorpCard> : reasons.length ? <CorpCard as="div" ariaLabel="Correction"><CorpBody><b className="c-pay__strong">Correction reason</b><p className="c-pay__detail">{reasons.join(' · ')}</p></CorpBody></CorpCard> : null}
    {standsApproved(run, data.runs) ? <PayGroup id="payroll-handoff" label="What’s next"><WhatsNext /></PayGroup> : null}
    {fixes.length ? <CorpCard as="div" ariaLabel="Things to fix"><CorpRows label="Things to fix"><li>
      <CorpRow href={`/app/payroll/fix?run=${encodeURIComponent(run.id)}`} tall bold title={`${plural(fixes.length, 'thing', 'things')} to fix before approving`} detail={<CorpPill tone="red">Stops payroll</CorpPill>} chevron />
    </li></CorpRows></CorpCard> : null}
    {!native && (!approved || correctionOpen) ? <ImportAmounts run={run} capabilities={capabilities} operation={operation} correction={correctionOpen} primary={run.status === 'WAITING_FOR_AMOUNTS' || correctionOpen} /> : null}
    {native && correctionOpen ? <PayGroup id="payroll-correction" label="Create a linked correction"><CorpBody>
      <form className="c-form" {...formKeys} onSubmit={event => { event.preventDefault(); setCorrectionError(''); const problem = flagProblems(event.currentTarget); if (problem) { setCorrectionError(problem); return; } const reason = String(new FormData(event.currentTarget).get('nativeCorrectionReason') ?? '').trim(); if (reason) void operation.submit({ action: 'CORRECT_NATIVE', runId: run.id, expectedRevision: run.revision, reason }); }}>
        <fieldset className="c-pay__fieldset" disabled={locked || !capabilities.canReview}>
          <p className="c-pay__detail">Corrections recalculate a separate linked draft from recorded time and current facts. The replacement requires a new review and approval; original statements stay in history. {SETTLE_NOTE}</p>
          <label className="c-field"><span className="c-field__label">Correction reason</span><textarea className="c-in" name="nativeCorrectionReason" required maxLength={300} rows={3} /></label>
          {correctionError ? <p className="c-error" role="alert">{correctionError}</p> : null}
          <CorpButton type="submit" full>Create correction draft</CorpButton>
        </fieldset>
      </form>
    </CorpBody></PayGroup> : null}
    {approved ? <Documents run={run} native={native} names={names} /> : null}
    {jobs.length ? <Jobs jobs={jobs} canApprove={capabilities.canApprove} locked={locked} operation={operation} /> : null}
    {(native && !approved && !fixes.length) || (approved && !replacement) ? <CorpCard as="div" ariaLabel="More actions"><CorpRows label="More actions">
      {native && !approved && !fixes.length ? <li><CorpRow onClick={locked || !capabilities.canReview ? undefined : () => void operation.submit({ action: 'RECALCULATE', runId: run.id, expectedRevision: run.revision })} disabled={locked || !capabilities.canReview}
        title="Recalculate draft" detail="A fresh revision from current recorded time" chevron /></li> : null}
      {approved && !replacement ? <li><CorpRow onClick={locked || !capabilities.canReview ? undefined : () => setCorrectionOpen(value => !value)} disabled={locked || !capabilities.canReview}
        title={correctionOpen ? 'Close correction' : 'Fix this payroll'} detail="Starts a correction you approve separately" chevron /></li> : null}
      {/* PY-17: the server never makes payment instructions for a correction (payment-policy.ts), so the row isn't offered there. */}
      {approved && !native && !run.correctionOf && !replacement && capabilities.canApprove ? <li><CorpRow onClick={locked ? undefined : () => void operation.submit({ action: 'PAYMENT_EXPORT', runId: run.id, expectedRevision: run.revision })} disabled={locked}
        title="Prepare payment instructions" detail="A file only. NEVORA doesn’t send money." chevron /></li> : null}
    </CorpRows>
      {approved && !native && run.correctionOf && capabilities.canApprove ? <CorpBody tight><p className="c-pay__detail">NEVORA doesn’t make payment instructions for a correction. {SETTLE_NOTE}</p></CorpBody> : null}
    </CorpCard> : null}
    {(run.status === 'REVIEW_REQUIRED' || run.status === 'BLOCKED') ? (capabilities.canApprove ? <div className="c-pay__approve">
      {run.status === 'REVIEW_REQUIRED' ? <Check checked={reviewed} onChange={setReviewed} disabled={locked || operation.revisionConflict}>I reviewed revision {run.revision}, {native ? 'the recorded-time calculation' : 'the provider amounts'} and all employee details.</Check> : null}
      {/* Owner premium A2 (Codex priority 2): while something stops payroll, the step the Owner can take (Review issues)
        * is the primary; the unavailable Approve stays visible as a quiet secondary. Its rule (canApproveNow) is unchanged. */}
      {fixes.length ? <CorpButtonLink full href={`/app/payroll/fix?run=${encodeURIComponent(run.id)}`}>{fixes.length === 1 ? 'Review issue' : 'Review issues'}</CorpButtonLink> : null}
      {/* PY-4, PY-9: what approving does and doesn't do, said before the button. Only a payroll NEVORA calculated carries
        * the calculation caveat and shares its statements by itself; an imported one keeps its own share step below. */}
      {run.status === 'REVIEW_REQUIRED' ? <div className="c-pay__approve-notes">
        {native ? <p>NEVORA calculated these amounts from your setup. Check withholding with your accountant.</p> : null}
        <p>Approving doesn’t pay anyone or send taxes.{native ? ' Pay statements are shared with each employee once they’re ready.' : ''}</p>
      </div> : null}
      <CorpButton full kind={fixes.length ? 'secondary' : undefined} disabled={!canApproveNow} onClick={() => run.reviewToken && void operation.submit({ action: 'APPROVE', runId: run.id, expectedRevision: run.revision, reviewToken: run.reviewToken })}>Approve payroll</CorpButton>
      <p className="c-note c-note--center">{fixes.length ? `Fix the ${fixes.length === 1 ? 'thing' : `${fixes.length} things`} above to approve.` : 'Approving locks the reviewed amounts, finalized time, settings and employee exceptions. If any of them change, review again.'}</p>
    </div> : <p className="c-note c-note--center">Someone who can approve payroll needs to approve this version.</p>) : null}
    {approved && unpublished ? (capabilities.canApprove ? <div className="c-pay__approve">
      <Check checked={publishConfirmed} onChange={setPublishConfirmed} disabled={locked}>Share the approved pay statements with each employee.</Check>
      <CorpButton full disabled={locked || !publishConfirmed} onClick={() => void operation.submit({ action: 'PUBLISH', runId: run.id, expectedRevision: run.revision })}>Share pay statements</CorpButton>
    </div> : <p className="c-note c-note--center">Someone who can approve payroll needs to share the pay statements.</p>) : null}
  </>;
}

/** Approved documents (R9): one row each, name first. A statement is named only from this payroll's own rows or the team
 * list by its employee ID, never from its file name; the file name and revision sit in the Download label. */
function Documents({ run, native, names }: { run: PayrollRun; native: boolean; names: Record<string, string> }) {
  const published = run.documents.some(document => document.kind === 'EMPLOYEE_STATEMENT' && document.published);
  const nameOf = (employeeId: string | null) => employeeId ? run.rows?.find(row => row.employeeId === employeeId)?.employeeName ?? names[employeeId] ?? null : null;
  return <PayGroup id="payroll-documents" label="Documents">
    {run.documents.length ? <CorpRows label="Documents">{run.documents.map(document => <li key={document.id}><DocumentRow document={document} name={nameOf(document.employeeId)} revision={run.revision} /></li>)}</CorpRows>
      : <CorpBody><p className="c-payroll__state" role="status">Documents are being made. They show here when they’re ready.</p></CorpBody>}
    {native && !published ? <CorpBody tight><p className="c-pay__detail" role="status"><b className="c-pay__strong">Pay statements not shared yet</b>Approved pay statements are shared with employees automatically once they are made and checked. Approval alone doesn’t mean a PDF is ready.</p></CorpBody> : null}
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

/** Provider or accountant amounts (historical provider runs): the way into the import (U01, /app/payroll/import), or
 * into a linked correction once the payroll is approved. The file, the matching, the amounts and the save live there;
 * this card no longer takes a file itself. */
function ImportAmounts({ run, capabilities, operation, correction, primary }: { run: PayrollRun; capabilities: PayrollCapabilities; operation: Operation; correction: boolean; primary: boolean }) {
  const entry = payrollImportCopy.en.imp.entry, locked = operation.busy || (!!operation.pending && !operation.resuming);
  const href = `/app/payroll/import?run=${encodeURIComponent(run.id)}`;
  return <PayGroup id="payroll-import" label={correction ? 'Create a linked correction' : 'Import provider amounts'} aside={run.sourceName ? <span className="c-pay__aside">{run.sourceName}</span> : undefined}><CorpBody>
    <b className="c-pay__strong">{correction ? entry.titleCorrection : entry.title}</b>
    <p className="c-pay__detail">{correction ? entry.lineCorrection : entry.line}</p>
    <p className="c-pay__detail">{capabilities.internalCalculatorAvailable ? 'Historical provider runs retain their imported amounts. Native payroll does not replace the source of this historical review.' : 'NEVORA keeps the amounts you import as they are. It doesn’t calculate taxes or deductions.'}</p>
    {correction ? <p className="c-pay__detail">{SETTLE_NOTE}</p> : null}
    {locked ? <CorpButton full kind={primary ? undefined : 'secondary'} disabled>{correction ? entry.actionCorrection : entry.action}</CorpButton>
      : <CorpButtonLink full href={href} kind={primary ? undefined : 'secondary'}>{correction ? entry.actionCorrection : entry.action}</CorpButtonLink>}
  </CorpBody></PayGroup>;
}

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
    const title = code === 'TIME_NOT_FINALIZED' ? `${plural(people.length, 'timecard', 'timecards')} not finalized`
      : code === 'POPULATION_DISPOSITION' ? `Choose what to do with ${plural(people.length, 'person', 'people')} this period`
      : payrollExceptionMessage(code);
    const detail = code === 'TIME_NOT_FINALIZED' || code === 'POPULATION_DISPOSITION' ? who : who ? `For ${who}` : '';
    // PY-10: the button goes where the sentence says the next step is. AR-4: "Who’s included" opens on arrival.
    const place = payrollBlockerPlace(code);
    const action = place === 'time' ? { href: `/app/timecards?${period}`, label: 'Review timecards' }
      : place === 'people' ? { href: `/app/payroll-export?${period}#${INCLUDED_HASH}`, label: 'Choose who’s included' }
      : place === 'setup' && capabilities.canConfigure ? { href: '/app/settings/payroll?open=setup', label: 'Open payroll setup' }
      : place === 'settings' && capabilities.canConfigure ? { href: '/app/settings/payroll', label: 'Open Payroll settings' }
      : place === 'support' ? { href: '/app/help', label: 'Contact support' } : null;
    return <CorpCard as="div" key={code} ariaLabel={title}>
      <div className="c-pay__fix"><b className="c-pay__strong">{title}</b>{detail ? <span className="c-pay__detail">{detail}</span> : null}</div>
      {action ? <div className="c-card__foot"><CorpButtonLink href={action.href} kind="secondary" size="md" full>{action.label}</CorpButtonLink></div> : null}
    </CorpCard>;
  });
  return <>
    {/* Nov 8: the Owner empty-state card (title on the card's text edge), as on the other Owner pages. */}
    {cards.length ? cards : <CorpEmpty title="Nothing stops this payroll" label="Payroll" />}
    {cards.length ? <p className="c-note">{cards.length === 1 ? 'Payroll can be approved once this is fixed.' : cards.length === 2 ? 'Payroll can be approved once both are fixed.' : 'Payroll can be approved once these are fixed.'}{native ? ' Then recalculate the draft.' : ''}</p> : null}
    {native ? <CorpButton kind="secondary" full disabled={locked || !capabilities.canReview} onClick={() => void operation.submit({ action: 'RECALCULATE', runId: run.id, expectedRevision: run.revision })}>Recalculate draft</CorpButton> : null}
  </>;
}

/** Each person's amounts for the review (opened from the People row). */
function PeopleAmounts({ run, replaced = false }: { run: PayrollRun; replaced?: boolean }) {
  const [filter, setFilter] = useState('');
  const searchId = useId();
  const native = run.sourceAuthority === 'NATIVE_RECORDED_TIME';
  const rows = run.rows?.filter(row => row.employeeName.toLowerCase().includes(filter.toLowerCase())) ?? [];
  return <>
    {run.totals ? <PayGroup id="payroll-people-totals" label={replaced ? `${periodText(run)} · Replaced by a correction` : periodText(run)}>
      <dl className="c-pay__totals">
        <div><dt>Gross pay</dt><dd>{formatPayrollMoney(run.totals.grossMinor)}</dd></div>
        <div><dt>Employee deductions</dt><dd>{`−${formatPayrollMoney(run.totals.deductionsMinor)}`}</dd></div>
        <div><dt>Employer contributions</dt><dd>{formatPayrollMoney(run.totals.employerContributionsMinor)}</dd></div>
        <div className="c-pay__net"><dt>{`Net pay · ${plural(run.totals.employeeCount, 'employee', 'employees')}`}</dt><dd>{formatPayrollMoney(run.totals.netMinor)}</dd></div>
      </dl>
    </PayGroup> : null}
    {/* Batch 1 item 3: the approved title stays; "Net pay" is said once, as the column label beside it, not on each row. */}
    {run.rows ? <PayGroup id="payroll-people" label="Employee amounts" aside={<span className="c-pay__aside">Net pay</span>}>
      <div className="c-pay__search"><label className="c-sr" htmlFor={searchId}>Find employee amounts</label><input id={searchId} className="c-in" type="search" enterKeyHint="search" autoComplete="off" placeholder="Find an employee" value={filter} onChange={event => setFilter(event.target.value)} /></div>
      <ul className="c-rows" aria-label="Employee amounts">{rows.map(row => {
        const result = native ? run.nativeCalculation?.employees.find(item => item.employeeId === row.employeeId) : undefined;
        const exception = run.exceptionRevisions.find(item => item.employeeId === row.employeeId)?.revision;
        return <li key={row.employeeId}><details className="c-pay__person">
          <summary className="c-row"><span className="c-row__main"><span className="c-row__title c-row__title--b">{row.employeeName}</span></span><span className="c-row__value">{formatPayrollMoney(row.netMinor)}</span></summary>
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
        <span><Num>{range}</Num>{' · Scheduled payday '}<Num>{quietDay(current.payday)}</Num></span>
      </div>
      <CorpBody tight>
        <p className="c-pay__detail">Adds up approved hours. Nothing is approved until you say so, and no money moves.</p>
        {/* Nov 1 upscale: one filled button on the page. While an overdue period leads, this week's step is a teal text
          * action (the same press, the same Prepare), so the open overdue row's Prepare payroll is the only filled one. */}
        {open ? oldest ? <Link className="c-link c-link--l c-pay__gap c-pay__quiet-go" href={step.href}>{step.label}</Link>
          : <CorpButtonLink href={step.href} full size="md" kind={step.quiet ? 'secondary' : undefined} className="c-pay__gap">{step.label}</CorpButtonLink>
          : oldest ? <button type="button" className="c-link c-link--l c-pay__gap c-pay__quiet-go" disabled={locked} aria-label={`Prepare ${range} payroll`} onClick={() => void operation.submit({ action: 'PREPARE', period: current.period, payday: current.payday })}>{`Prepare ${range}`}</button>
          : <CorpButton full size="md" className="c-pay__gap" disabled={locked} aria-label={`Prepare ${range} payroll`} onClick={() => void operation.submit({ action: 'PREPARE', period: current.period, payday: current.payday })}>{`Prepare ${range}`}</CorpButton>}
      </CorpBody>
    </PayGroup> : null}
    <Backlog data={data} operation={operation} lead={oldest} today={today} />
    {/* R7: "Other dates" is one row that opens its form, like the period rows above (and its action no longer sits past
      * the card edge). */}
    <CorpCard as="div" id="payroll-other" ariaLabel="Other dates">
      <button type="button" className="c-row c-pay__other" aria-expanded={other} aria-controls="payroll-other-form" onClick={() => setOther(value => !value)}>
        <span className="c-row__main"><span className="c-row__title c-row__title--b">Other dates</span><span className="c-row__detail"><span>Outside your pay schedule</span></span></span>
        {other ? null : <span className="c-pay__rowpill" aria-hidden="true">Choose dates</span>}
        <CaretDownIcon className="c-pay__caret" weight="bold" aria-hidden="true" />
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
function Backlog({ data, operation, lead, today }: { data: PayrollRunsResponse; operation: Operation; lead: PayrollMissingPeriod | null; today: string }) {
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
  return <PayGroup id="payroll-backlog" label={count !== null ? <>Periods with no payroll <span className="c-pay__count c-num">{count}</span></> : 'Periods with no payroll'}
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
          {/* Phase 8 (a.md #15): the payday comes from the pay schedule, and a passed one says so (Payroll's own words). */}
          <span className="c-row__main"><span className="c-row__title c-row__title--b">{range}</span><span className="c-row__detail"><span>{item.payday < today ? 'Scheduled payday was ' : 'Scheduled payday '}<Num>{quietDay(item.payday)}</Num></span></span></span>
          {item.state === 'AMBIGUOUS_TRANSITION' ? <CorpPill tone="neutral">Check dates</CorpPill> : null}
          {/* Closing F1 (NV-081): a closed period shows a quiet "Prepare" pill (the open one's Prepare payroll is the filled
            action) and every row a CaretDown that turns when it is open; no "Close" text link. */}
          {open ? null : <span className="c-pay__rowpill" aria-hidden="true">Prepare</span>}
          <CaretDownIcon className="c-pay__caret" weight="bold" aria-hidden="true" />
        </button>
        {open ? <div id={id} className="c-pay__expand">
          {item.state === 'AMBIGUOUS_TRANSITION' ? <div className="c-pay__check-dates"><b className="c-pay__strong">Check this period’s dates</b><p className="c-pay__detail">{item.issues.join(' ')} Confirm these period boundaries and payday before you prepare it.</p></div> : null}
          <p className="c-pay__detail">Uses your saved payroll settings. You review its timecards and amounts, then approve it separately.</p>
          {item.state === 'AMBIGUOUS_TRANSITION' ? <Check checked={acknowledged} disabled={locked} onChange={setAcknowledged}>I reviewed this schedule transition, period boundaries and payday.</Check> : null}
          <CorpButton kind={primary ? undefined : 'secondary'} size="md" full aria-label={`Prepare ${range} payroll`} disabled={locked || (item.state === 'AMBIGUOUS_TRANSITION' && !acknowledged)} onClick={() => void operation.submit({ action: 'PREPARE', period: item.period, payday: item.payday })}>{`Prepare ${range}`}</CorpButton>
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
      {runs.length ? <CorpRows label="Payrolls">{byCorrection(runs).map(({ item, replaced }) => <li key={item.id} className={replaced ? 'c-pay__replaced' : undefined}><RunRow item={item} replaced={replaced} /></li>)}</CorpRows>
        : <div className="c-empty c-pay__empty"><b>No payrolls yet</b><span>Prepare payroll from Up next.</span></div>}
    </PayGroup>
    <PortalStatements runs={data.runs} names={names} />
    {loose.length ? <Jobs jobs={loose} canApprove={data.capabilities.canApprove} locked={locked} operation={operation} /> : null}
  </>;
}
