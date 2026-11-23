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
import { momentDay, payDay, periodRange, shortDay } from './payroll-format';
import { usePayrollCopy, type PayrollLang } from './payroll-copy';
import type { runsCopy } from './copy/runs';
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

// Closing F1 (NV-071): done is green on every screen (an approved payroll, like a published week).
const statusTone = { BLOCKED: 'red', WAITING_FOR_AMOUNTS: 'neutral', REVIEW_REQUIRED: 'amber', APPROVED: 'green' } as const;
type RunsCopy = typeof runsCopy.en;

/* The words (copy/runs.ts): PY-14's scope line under the Payroll title (NEVORA calculates pay and makes pay statements;
 * it never pays anyone or sends taxes), PY-3's next steps once a payroll is approved and the line that closes them, and
 * PY-11's settle note (a correction changes amounts on paper only; any difference in pay is settled by the employer). */
/** AR-4: Time exports' "Who’s included" section; Payroll's blocker opens the page there (payroll-export.tsx reads it). */
const INCLUDED_HASH = 'who-is-included';

const quietRange = periodRange;
const quietDay = payDay;
const firstName = (name: string) => name.split(/\s+/)[0] ?? name;
function listNames(names: string[], and: string) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}
/** The day a payroll was approved ("Oct 12", "12 oct"), for its subtitle; approval never says paid (R7, copy 67). */
const approvedDay = momentDay;
/** The payroll named by its frequency ("Weekly payroll"), or "Payroll". */
const frequencyName = (c: RunsCopy, frequency?: OpenPayPeriod['frequency']) => frequency ? c.frequencyPayroll[frequency] : c.payroll;
const reviewHref = (id: string) => `/app/payroll/review?run=${encodeURIComponent(id)}`;
const periodText = (run: Pick<PayrollRun, 'period' | 'payday'>, c: RunsCopy, lang: PayrollLang) => `${quietRange(run.period.startDate, run.period.endDate, lang)} · ${c.payday(quietDay(run.payday, lang))}`;
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
export function EmptyCard({ title, detail, action, alert, label }: { title: string; detail?: ReactNode; action?: { href: string; label: string }; alert?: boolean; label?: string }) {
  const c = usePayrollCopy().runs;
  return <CorpCard as="div" ariaLabel={label ?? c.payroll}>
    <div className="c-pay__empty"><BState kind={alert ? 'failed' : 'empty'} alert={alert} icon={alert ? undefined : <ReceiptIcon weight="bold" />} title={title} line={detail} action={action ? { label: action.label, href: action.href } : undefined} /></div>
  </CorpCard>;
}

function StateCard({ children, alert, retry }: { children: ReactNode; alert?: boolean; retry?: () => void }) {
  const c = usePayrollCopy().runs;
  return <CorpCard as="div" ariaLabel={c.payroll}><CorpBody>
    <p className="c-payroll__state" role={alert ? 'alert' : 'status'}>{children}</p>
    {retry ? <CorpButton kind="secondary" size="md" onClick={retry}>{c.tryAgain}</CorpButton> : null}
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
  const { runs: c, lang } = usePayrollCopy();
  const [today] = useState(() => companyDay(timeZone));
  // A recorded action that made or replaced a run (a prepared draft, a correction) opens that run's review.
  useEffect(() => {
    const next = operation.receipt?.runId;
    if (next && (next !== runId || view === 'fix')) router.push(reviewHref(next));
  }, [operation.receipt, runId, router, view]);
  const data = !resource.loading && resource.data?.capabilities.canReview ? resource.data : null;
  const state = resource.loading ? <StateCard>{c.loading}</StateCard>
    : resource.error ? <StateCard alert retry={() => void resource.reload()}>{resource.error}</StateCard>
    : !data ? <StateCard alert>{c.cantReview}</StateCard> : null;
  const run = data && runId ? data.runs.find(item => item.id === runId) ?? null : null;
  const missingRun = data && (view === 'review' || view === 'fix' || view === 'people') && !run
    ? <EmptyCard alert title={c.missingTitle} detail={c.missingLine} action={{ href: '/app/payroll', label: c.goToPayroll }} /> : null;

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
    <Pushed back={{ href: '/app/payroll', label: c.payroll }} title={c.preparePayroll} id="payroll-prepare-title" />
    <Feedback operation={operation} />
    {state ?? (data && <PreparePayroll current={period} data={data} today={asOf} operation={operation} />)}
  </CorpPage>;
  if (view === 'history') return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-history-title">
    <Pushed back={{ href: '/app/payroll', label: c.payroll }} title={c.payrollHistory} id="payroll-history-title" />
    <Feedback operation={operation} />
    {state ?? (data && <PayHistory data={data} names={names} operation={operation} />)}
  </CorpPage>;
  if (view === 'fix') return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-fix-title">
    <Pushed back={{ href: runId ? reviewHref(runId) : '/app/payroll', label: run?.status === 'APPROVED' ? c.payrollDetails : c.reviewPayroll }} title={c.fixBefore} id="payroll-fix-title" />
    <Feedback operation={operation} />
    {state ?? missingRun ?? (run && data && <FixList run={run} capabilities={data.capabilities} names={names} operation={operation} />)}
  </CorpPage>;
  if (view === 'people') return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-people-title">
    {/* Round 5 (Nov 8): the way back is named like the page it returns to ("Payroll details" once approved). */}
    <Pushed back={{ href: runId ? reviewHref(runId) : '/app/payroll', label: run?.status === 'APPROVED' ? c.payrollDetails : c.reviewPayroll }} title={c.peopleTitle} id="payroll-people-title" />
    {state ?? missingRun ?? (run && <PeopleAmounts run={run} replaced={!!data?.runs.some(item => item.correctionOf === run.id)} />)}
  </CorpPage>;
  return <CorpPage className="c-payroll c-pay c-page--narrow" labelledBy="payroll-review-title">
    {/* Nov 1 upscale: the payroll's period, payday and status are the subtitle ("Oct 5–11 · Payday Tue, Oct 13 · Approved"). */}
    <Pushed back={{ href: '/app/payroll', label: c.payroll }} title={run?.status === 'APPROVED' ? c.payrollDetails : c.reviewPayroll} id="payroll-review-title"
      sub={run && !state ? `${periodText(run, c, lang)} · ${c.status[run.status]}${run.status === 'APPROVED' && run.approvedAt ? ` ${approvedDay(run.approvedAt, lang)}` : ''}` : undefined} />
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
  const { runs: c, lang } = usePayrollCopy();
  const count = data.backlog && !data.backlog.overflow ? data.backlog.missingCount : null;
  const range = quietRange(oldest.period.startDate, oldest.period.endDate, lang);
  const title = count === 1 ? c.rangeNoPayroll(range) : count !== null && count > 1 ? c.periodsNoPayroll(count) : c.someNoPayroll;
  return <section className="c-card c-pay__unpaid" aria-labelledby="payroll-unpaid-title">
    {/* OW-018: as on the phone, the red is the icon's; the title is ink. Phase 9 (spec 2.2): it stops payroll, so it is the
      * circle (WarningCircle); the triangle is amber's "check". */}
    <BIcon tone="red"><BGlyph meaning="stop" /></BIcon>
    <div className="c-pay__unpaid-text">
      <h2 id="payroll-unpaid-title" className="c-pay__unpaid-title">{title}</h2>
      <p className="c-pay__unpaid-body">{count === 1 ? <>{c.paydayWasLead}<Num>{quietDay(oldest.payday, lang)}</Num>.</> : <>{c.oldestIsLead}<Num>{range}</Num>{'. '}{c.paydayWasLead}<Num>{quietDay(oldest.payday, lang)}</Num>.</>}</p>
    </div>
    <CorpButtonLink href={href} size="md" className="c-pay__unpaid-go">{unpaidAction(oldest, c, lang)}</CorpButtonLink>
  </section>;
}
const unpaidHash = (item: PayrollMissingPeriod) => `unpaid-${item.period.startDate}`;
const unpaidAction = (item: PayrollMissingPeriod, c: RunsCopy, lang: PayrollLang) => c.prepareRange(quietRange(item.period.startDate, item.period.endDate, lang));

/** Owner premium A2 (Codex priority 2): the Up next button is the next step the Owner can take now. Prepare before a
 * draft exists; Review issue(s) when something stops it; Review payroll once a draft is ready; details once approved. */
function nextStep(open: PayrollRun | undefined, c: RunsCopy): { label: string; href: string; quiet?: boolean; fixing?: boolean } {
  if (!open) return { label: c.preparePayroll, href: '/app/payroll/prepare' };
  const fixes = fixItems(open);
  if (fixes.length) return { label: fixes.length === 1 ? c.reviewIssue : c.reviewIssues, href: `/app/payroll/fix?run=${encodeURIComponent(open.id)}`, fixing: true };
  if (open.status === 'APPROVED') return { label: c.payrollDetails, href: reviewHref(open.id), quiet: true };
  return { label: c.reviewPayroll, href: reviewHref(open.id) };
}

/** A payroll row (R7, R9): the period first, " · Correction" when it corrects another, so two rows for one week differ
 * at a glance; then the payday and "Approved" as quiet words (never "Paid"). A status that needs the Owner stays a pill,
 * in grey (R3). The amount shows only when the payroll holds one (a missing amount is never a zero). */
function RunRow({ item, replaced = false }: { item: PayrollRun; replaced?: boolean }) {
  const { runs: c, lang } = usePayrollCopy();
  const approved = item.status === 'APPROVED';
  // Closing F1 (NV-082), batch 1 item 3: a payroll a correction replaced says so once ("Replaced by a correction", Phase 8, a.md #47: the words the statements use; the grey chip that repeated it is gone) and is
  // listed right under its correction (byCorrection), indented.
  if (replaced) return <CorpRow href={reviewHref(item.id)} bold icon={<ReceiptIcon className="c-ic" weight="bold" />}
    title={quietRange(item.period.startDate, item.period.endDate, lang)}
    detail={<BSegs parts={[c.replacedByCorrection, c.payday(quietDay(item.payday, lang)).replace(/ /g, '\u00a0')]} />}
    value={item.totals ? <NetAmount minor={item.totals.netMinor} /> : undefined} valueTone="ink" chevron />;
  // Round 5 (Nov 7, 2026): drawn like Payroll's Recent payrolls: the receipt icon, a "Correction" pill instead of words in
  // the title, the amount bold. A status that needs the Owner still wins the pill.
  return <CorpRow href={reviewHref(item.id)} bold icon={<ReceiptIcon className="c-ic" weight="bold" />}
    title={<>{quietRange(item.period.startDate, item.period.endDate, lang)}{approved && item.correctionOf ? <> <CorpMeta>{c.correction}</CorpMeta></> : null}</>}
    detail={<BSegs parts={[c.payday(quietDay(item.payday, lang)).replace(/ /g, '\u00a0'), approved ? c.approved : null]} />}
    value={item.totals ? <NetAmount minor={item.totals.netMinor} /> : undefined} valueTone="ink"
    trail={!approved ? <CorpPill tone={statusTone[item.status]}>{c.status[item.status]}</CorpPill> : undefined} chevron />;
}

/** OW-018: a row's amount is the payroll's net total (`totals.netMinor`), so it says "Net" under the figure, as the
 * phone's rows do. */
function NetAmount({ minor }: { minor: string }) {
  const { runs: c, lang } = usePayrollCopy();
  return <span className="c-pay__amt"><Num>{formatPayrollMoney(minor, lang)}</Num><span className="c-pay__amt-k">{c.net}</span></span>;
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
  const c = usePayrollCopy().runs;
  return <div className="c-pay__next">
    <ul>{c.nextSteps.map(text => <li key={text}>{text}</li>)}</ul>
    <p className="c-pay__next-note">{c.nextNote}</p>
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
  const { runs: c, lang } = usePayrollCopy();
  const runs = data?.runs ?? [];
  const open = current ? runs.find(item => item.period.startDate === current.period.startDate && item.period.endDate === current.period.endDate && !item.correctionOf) : undefined;
  const past = runs.filter(item => item.id !== open?.id).sort((a, b) => b.period.startDate.localeCompare(a.period.startDate) || b.createdAt.localeCompare(a.createdAt));
  const people = open?.rows ?? [];
  const missing = data?.backlog && (data.backlog.overflow || (data.backlog.missingCount ?? 0) > 0) ? data.backlog : null;
  const oldest = overduePeriod(data, today);
  const step = nextStep(open, c);
  const sub = [current?.frequency ? c.frequency[current.frequency] : null, open?.totals ? c.people(open.totals.employeeCount) : null, company || null].filter(Boolean).join(' · ');
  // R7: each place once. Pay history is the Recent payrolls link; Time exports and Payroll settings are tabs on tablets
  // and desktop. Nov 1 upscale (three cards at most): on phones Time exports is the last row of Recent payrolls and
  // Payroll settings is a "Settings" link on the title row.
  const isTab = (href: string) => !!tabs?.some(item => item.href === href);
  const exportsHref = current ? `/app/payroll-export?start=${current.period.startDate}&end=${current.period.endDate}` : '/app/payroll-export';
  const paidHref = current ? `/app/payroll-export/paid-time?start=${current.period.startDate}&end=${current.period.endDate}` : '/app/payroll-export/paid-time';
  const exportsRow = <li className={isTab('/app/payroll-export') ? 'c-only-phone' : undefined}><CorpRow href={exportsHref} one title={c.timeExports} chevron /></li>;
  // Backend (Nov 15, 2026): this period's timecards, with the day approval opens while the period runs and "Pay period
  // ended" after (the words Things to do uses; it doesn't claim what's left to approve). It opens Timecards on that period.
  const timecards = current ? { href: `/app/timecards?start=${current.period.startDate}&end=${current.period.endDate}`,
    line: today > current.period.endDate ? c.periodEnded : c.approvableFrom(quietDay(new Date(Date.parse(`${current.period.endDate}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10), lang)) } : null;
  const settings = canEditSettings ? <Link className={isTab('/app/settings/payroll') ? 'c-link c-link--l c-only-phone' : 'c-link c-link--l'} href="/app/settings/payroll" aria-label={c.payrollSettings}>{c.settings}</Link> : undefined;
  const frequency = frequencyName(c, current?.frequency);
  // Up next is one row (Nov 1 upscale): the payroll, its period and payday; it opens the next step (Prepare, Review issues,
  // Review payroll or the approved details). Once a draft exists, that step is the row's grey value ("Review issue").
  const nextValue = open && open.status !== 'APPROVED' ? step.label : undefined;
  // Direction B (Jose approved Nov 5, 2026; mock "Owner · Payroll"): the dark ink hero for money, the open period as its
  // headline with this payroll's own figures (people, gross, net once it holds amounts; never an estimate), the three
  // steps with the same next-step button, then Recent payrolls. Tablets and desktop keep the layout below.
  const days = current ? Math.round((Date.parse(`${current.payday}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000) : null;
  // Phase 8 (a.md #15): a date from the pay schedule is the "Scheduled payday" (DESIGN, payroll scope wording).
  const paydayWhen = days === null || days < 0 ? null : days === 0 ? c.today : days === 1 ? c.tomorrow : c.inDays(days);
  const paydayChip = days === null ? null : days === 0 ? c.chipToday : days === 1 ? c.chipTomorrow : days > 1 ? c.chipInDays(days) : c.chipPassed;
  const fixing = !!step.fixing;
  // Phase 8 (a.md #35): before a draft exists the action is named by its period, as the overdue one is ("Prepare Nov 16–22").
  const stepName = !open && current ? c.prepareRange(quietRange(current.period.startDate, current.period.endDate, lang)) : step.label;
  // PY-4: a payroll NEVORA calculates shares its pay statements by itself once approved (the worker queues it); an imported
  // one keeps the manual share step. Before a draft exists, new payrolls are calculated here whenever the calculator is on.
  const native = open ? open.sourceAuthority === 'NATIVE_RECORDED_TIME' : !!data?.capabilities.internalCalculatorAvailable;
  const handOff = standsApproved(open, runs);
  const stepState = (n: 1 | 2 | 3) => n === 1 ? (open ? 'done' : 'now') : n === 2 ? (open?.status === 'APPROVED' ? 'done' : open ? 'now' : '') : open?.status === 'APPROVED' ? 'done' : '';
  const bStep = (n: 1 | 2 | 3, title: string, detail: string) => <div className={`b-step${stepState(n) ? ` b-step--${stepState(n)}` : ''}`}>
    <span className="b-step__n" aria-hidden="true">{n}</span><span className="b-step__tx"><span className="b-step__t">{title}</span><span className="b-step__s">{detail}</span></span>
    <span className="b-sr">{stepState(n) === 'done' ? c.stepDone : stepState(n) === 'now' ? c.stepNext : c.stepLater}</span></div>;
  // OW-005 / BR-8: the same three steps on the phone card and, without the button, under desktop's Up next row.
  const steps = <>
    {bStep(1, c.preparePayroll, open ? c.step1Started : c.step1Bring)}
    {bStep(2, fixing ? c.fixIssues : c.reviewPay, fixing ? c.somethingStops : c.hoursRates)}
    {bStep(3, c.approvePayroll, native ? c.sharedAutomatically : c.thenShare)}
  </>;
  const bScreen = <BScreen ink>
    <BHero title={c.payroll} titleId="b-payroll-title" sub={sub || undefined} right={canEditSettings ? <BButtonLink href="/app/settings/payroll" kind="glass" label={c.payrollSettings}><GearSixIcon size={16} weight="bold" aria-hidden="true" />{c.settings}</BButtonLink> : undefined}>
      <p className="b-sub c-pay__scope c-pay__scope--hero">{c.scopeLine}</p>
      {current ? <div className="b-hpad">
        <div className="b-hkicker">{/* Premium pass FA (final verification A #6, spec 3.1): how far
          * away the scheduled payday is is a time fact, so it is grey header text on the kicker's line, as Home's payday tile
          * says it; only a payday that passed is an exception and keeps the amber chip. Final regression review #4: the
          * kicker and the time fact are one facts line (BSegs), so they never run together without the dot. */}
          {paydayChip && days !== null && days < 0
            ? <><span>{c.upNextWith(frequency)}</span><span className="b-chip b-chip--due">{paydayChip}</span></>
            : <BSegs parts={[c.upNext, frequency]} />}</div>
        <p className="b-hbig">{quietRange(current.period.startDate, current.period.endDate, lang)}</p>
      </div> : null}
      {/* Phase 8 (a.md #28): honest figures. People shows once the payroll knows them and Net pay once it holds amounts;
        * a tile is never a bare dash. */}
      {current ? <BLive label={c.thisPayroll} items={[
        // Polish (Nov 20, 2026): how far away the payday is is said once, as the tile's caption (the band said "Scheduled
        // payday in 7 days" and the tile repeated its label). A payday that passed keeps the amber chip above.
        { label: c.scheduledPayday, value: shortDay(current.payday, lang), meta: paydayWhen ?? undefined },
        ...(open?.totals || people.length ? [{ label: c.peopleTitle, value: open?.totals ? open.totals.employeeCount : people.length }] : []),
        ...(open?.totals ? [{ label: c.netPay, value: formatPayrollMoney(open.totals.netMinor, lang) }] : []),
      ]} /> : null}
    </BHero>
    <BStack>
      <Feedback operation={operation} />
      {state ?? <>
        {data && oldest ? <BCard label={c.payPeriodsNoPayroll}><div className="b-notice"><BIcon tone="red"><BGlyph meaning="stop" /></BIcon>
          <span className="b-notice__tx"><span className="b-notice__t">{data.backlog && !data.backlog.overflow && data.backlog.missingCount !== null && data.backlog.missingCount > 1 ? c.periodsNoPayroll(data.backlog.missingCount) : c.rangeNoPayroll(quietRange(oldest.period.startDate, oldest.period.endDate, lang))}</span>
            <span className="b-notice__s">{data.backlog && !data.backlog.overflow && data.backlog.missingCount === 1 ? c.paydayWas(quietDay(oldest.payday, lang)) : c.oldestIs(quietRange(oldest.period.startDate, oldest.period.endDate, lang).replace(/ /g, '\u00a0').replace(/\u2009/g, '\u202f').replace(/–/g, '–\u2060'), quietDay(oldest.payday, lang).replace(/ /g, '\u00a0').replace(/\u2009/g, '\u202f'))}</span></span>
          {/* Review B5 (NV-081): the overdue period is the page's one filled action; the current period's steps back. */}
          {/* Phase 8 (a.md #35): the button says its period, as on desktop ("Prepare Nov 2–8"). */}
          <BButtonLink href={`/app/payroll/prepare#${unpaidHash(oldest)}`} kind="teal">{unpaidAction(oldest, c, lang)}</BButtonLink></div></BCard> : null}
        {/* Phase 8 (a.md #35): the steps say "Prepare payroll" once; the card has no second heading for it. */}
        {current ? <BCard title={open?.status === 'APPROVED' ? c.payrollApproved : undefined} label={c.payrollSteps} id="b-payroll-steps">
          <div className="b-steps">
            {steps}
            {/* The period's timecards read as one more line of the steps (same circle, text column and divider), above the
              * card's action, so it doesn't trail after the button. */}
            {timecards ? <Link className="b-step b-step--link" href={timecards.href}>
              {/* Phase 9 (spec 3.6): timecards are the Clock everywhere (the sidebar's Time). */}
              <span className="b-step__n" aria-hidden="true"><ClockIcon weight="bold" /></span>
              <span className="b-step__tx"><span className="b-step__t">{c.timecards}</span><span className="b-step__s">{keepWhole(timecards.line)}</span></span>
              <CaretRightIcon className="b-step__chev" size={18} weight="bold" aria-hidden="true" />
            </Link> : null}
            {/* OW-005: while an overdue period leads, its Prepare is the screen's one button and this period's step is a
              * quiet teal link (as on Prepare payroll), not a second button in another style. */}
            {data && oldest ? <Link className="b-link c-pay__steplink" href={step.href} aria-label={stepName === step.label ? c.stepLabel(step.label, quietRange(current.period.startDate, current.period.endDate, lang)) : undefined}>{stepName}</Link>
              : <BButtonLink href={step.href} kind={step.quiet ? 'ghost' : 'teal'} full big label={stepName === step.label ? c.stepLabel(step.label, quietRange(current.period.startDate, current.period.endDate, lang)) : undefined}>{stepName}</BButtonLink>}
          </div>
          {missing && !oldest ? <BList label={c.periodsWithNoPayroll}><BRow href="/app/payroll/prepare" title={c.periodsWithNoPayroll} sub={c.prepareEach} end={<b className="c-num">{missing.missingCount === null ? c.check : String(missing.missingCount)}</b>} /></BList> : null}
        </BCard> : <BCard label={c.paySchedule}><div className="b-notice"><span className="b-notice__tx"><span className="b-notice__t">{c.noSchedule}</span><span className="b-notice__s">{c.setSchedule}</span></span>
          {canEditSettings ? <BButtonLink href="/app/settings/payroll" kind="ghost">{c.settings}</BButtonLink> : null}</div></BCard>}
        {handOff ? <BCard title={c.whatsNext} id="b-payroll-handoff"><WhatsNext /></BCard> : null}
        <BCard title={c.recentPayrolls} id="b-payroll-recent" link={{ href: '/app/payroll/history', label: c.payrollHistory }}>
          {past.length ? <BList label={c.pastPeriods}>{byCorrection(past).slice(0, 3).map(({ item, replaced }) => {
            const approved = item.status === 'APPROVED';
            // Closing F1 (NV-082): a replaced payroll follows its correction; it says so once, in its line ("Replaced by a correction").
            // Premium pass FA (final verification A #30): one payroll row, the one Payroll history draws: a row that opens leads
            // with the teal circle, "Approved" is the last fact of its line, and the amount is "Net".
            return <BRow key={item.id} href={reviewHref(item.id)} lead={<BIcon tone="teal"><ReceiptIcon weight="bold" /></BIcon>}
              title={<span className={replaced ? 'c-pay__was' : undefined}>{quietRange(item.period.startDate, item.period.endDate, lang)}</span>} chip={replaced ? /* Batch 1 item 3 (as RunRow): the line below already says "Replaced by a correction", so no chip repeats it. */ undefined : item.correctionOf ? /* Final polish (Nov 20, 2026): a correction is a fact about the payroll, so grey meta beside the period; the chip stays for "Replaced". */ <BStatusText>{c.correction}</BStatusText> : approved ? undefined : <BChip tone="amber">{c.status[item.status]}</BChip>}
              /* Premium pass FA (final verification A #10): "Payday Fri, Nov 6" is one unit and never splits. */
              sub={<BSegs parts={[replaced ? c.replacedByCorrection : null, c.payday(quietDay(item.payday, lang)).replace(/ /g, '\u00a0'), approved && !replaced ? c.approved : null]} />}
              end={item.totals ? <><b className="c-num">{formatPayrollMoney(item.totals.netMinor, lang)}</b><span>{c.net}</span></> : undefined} chevron={!item.totals} />;
          })}</BList> : <p className="b-state">{c.noPastLine}</p>}
        </BCard>
        <BCard label={c.payrollTools}><BList label={c.payrollTools}>
          {/* Phase 8 (a.md #14, #22): a row that opens leads with the teal-50 circle, and Time exports says what Timecards says. */}
          {/* Premium pass FA (final verification B #9): a download is the down arrow, as its words say (it drew the upload arrow). */}
          <BRow href={exportsHref} lead={<BIcon tone="teal"><DownloadSimpleIcon weight="bold" /></BIcon>} title={c.timeExports} sub={c.downloadHours} />
          <BRow href={paidHref} lead={<BIcon tone="teal"><ListChecksIcon weight="bold" /></BIcon>} title={payrollImportCopy[lang].exp.entry.title} sub={payrollImportCopy[lang].exp.entry.line} />
        </BList></BCard>
      </>}
    </BStack>
  </BScreen>;
  return <CorpPage className="c-payroll c-pay c-pay--home c-page--narrow" labelledBy="payroll-title">
    {bScreen}
    <CorpTitle id="payroll-title" title={c.payroll} sub={<><span className="c-pay__cadence">{sub}</span><span className="c-pay__scope">{c.scopeLine}</span></>} actions={settings} />
    <PayrollTabs items={tabs} current="/app/payroll" />
    <Feedback operation={operation} />
    {state ?? <>
      {/* OW-018: from 1024px Payroll is a list with a right rail, like Team. Up next (the period, its payday and the
        * three steps) is the rail card; the notice and Recent payrolls are the list. Tablets keep one column in this
        * order, which is also the reading and focus order at every width. */}
      <div className="c-pay__cols">
      {data && oldest ? <UnpaidNotice data={data} oldest={oldest} href={`/app/payroll/prepare#${unpaidHash(oldest)}`} /> : null}
      {current ? <PayGroup id="payroll-next" label={c.upNext}>
        <CorpRows label={c.upNext}>
          <li className="c-payroll__upnext"><CorpRow href={step.href} bold title={frequency}
            detail={<><Num>{quietRange(current.period.startDate, current.period.endDate, lang)}</Num>{c.scheduledPaydaySep}<Num>{quietDay(current.payday, lang)}</Num>{nextValue ? null : <span className="c-sr">{c.stepRead(step.label)}</span>}</>}
            // Sweep 1: no aria-label; the row is named by its own text, and the step it opens is read (not drawn) when the row doesn't show it.
            value={nextValue} valueTone="soft" chevron /></li>
          {timecards ? <li><CorpRow href={timecards.href} title={c.timecards} detail={timecards.line} chevron /></li> : null}
          {missing && !oldest ? <li><CorpRow href="/app/payroll/prepare" bold title={c.periodsWithNoPayroll} detail={c.prepareEach} value={missing.missingCount === null ? c.check : <Num>{String(missing.missingCount)}</Num>} chevron /></li> : null}
        </CorpRows>
        <div className="b-steps c-pay__steps" role="group" aria-label={c.payrollSteps}>{steps}</div>
      </PayGroup> : <EmptyCard label={c.paySchedule} title={c.noSchedule} detail={c.setSchedule}
        action={canEditSettings ? { href: '/app/settings/payroll', label: c.payrollSettings } : undefined} />}
      {handOff ? <PayGroup id="payroll-handoff" label={c.whatsNext}><WhatsNext /></PayGroup> : null}
      <PayGroup id="payroll-recent" label={c.recentPayrolls} aside={<Link className="c-link" href="/app/payroll/history">{c.payrollHistory}</Link>}>
        {past.length ? <CorpRows label={c.pastPeriods}>{byCorrection(past).slice(0, 3).map(({ item, replaced }) => <li key={item.id} className={replaced ? 'c-pay__replaced' : undefined}><RunRow item={item} replaced={replaced} /></li>)}{exportsRow}</CorpRows>
          : <><div className="c-empty c-pay__empty"><b>{c.noPastTitle}</b><span>{c.noPastDetail}</span></div><CorpRows label={c.payrollTools}>{exportsRow}</CorpRows></>}
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
  const { runs: c, lang } = usePayrollCopy();
  const changed = delta.employees.filter(row => row.deltaNetMinor !== '0');
  return <div className="c-pay__delta">
    <p className="c-pay__detail"><b>{c.netOnStatements(formatSignedPayrollMoney(delta.totalNetMinor, lang))}</b>{changed.length ? c.across(c.people(changed.length)) : delta.totalNetMinor === '0' ? c.noNetChange : ''}</p>
    {changed.length ? <ul className="c-pay__deltalist" aria-label={c.netChangesByPerson}>{changed.map(row => <li key={row.employeeId}>
      <span>{names[row.employeeId] ?? c.teamMember}</span>
      <span className="c-num">{c.wasNow(formatPayrollMoney(row.previousNetMinor, lang), formatPayrollMoney(row.netMinor, lang))}</span>
      <b className="c-num">{formatSignedPayrollMoney(row.deltaNetMinor, lang)}</b>
    </li>)}</ul> : null}
  </div>;
}

/** Board O-PayrollReview: the period and its totals, what stops payroll, then one Approve. Everything an approved run
 * offers (documents, publication, corrections) follows in the same cards. */
function RunReview({ run, data, names, operation }: { run: PayrollRun; data: PayrollRunsResponse; names: Record<string, string>; operation: Operation }) {
  const { runs: c, lang } = usePayrollCopy();
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
    <PayGroup id="payroll-run" label={c.totals}>
      {run.totals ? <dl className="c-pay__totals">
        <div><dt>{c.grossPay}</dt><dd><Num>{formatPayrollMoney(run.totals.grossMinor, lang)}</Num></dd></div>
        <div><dt>{c.employeeDeductions}</dt><dd><Num>{`−${formatPayrollMoney(run.totals.deductionsMinor, lang)}`}</Num></dd></div>
        <div className="c-pay__net"><dt>{c.netPay}</dt><dd><Num>{formatPayrollMoney(run.totals.netMinor, lang)}</Num></dd></div>
      </dl> : <CorpBody><p className="c-payroll__state">{run.status === 'WAITING_FOR_AMOUNTS' ? c.amountsAfterImport : run.status === 'BLOCKED' ? c.amountsAfterFix : c.noAmounts}</p></CorpBody>}
      {run.rows ? <CorpRows label={c.peopleTitle}><li><CorpRow href={`/app/payroll/people?run=${encodeURIComponent(run.id)}`} title={c.peopleTitle} value={<Num>{String(run.totals?.employeeCount ?? run.rows.length)}</Num>} valueTone="soft" chevron /></li></CorpRows> : null}
    </PayGroup>
    {replacement ? <CorpCard as="div" ariaLabel={c.replaced}><CorpRows label={c.replaced}><li>
      <CorpRow href={reviewHref(replacement.id)} bold title={c.replacedByCorrection} chevron />
    </li></CorpRows></CorpCard> : null}
    {run.correctionOf ? <CorpCard as="div" ariaLabel={c.correction}><CorpBody>
      <b className="c-pay__strong">{original ? c.correctionOf(quietRange(original.period.startDate, original.period.endDate, lang)) : c.correctionOfEarlier}</b>
      <p className="c-pay__detail">{reasons.length ? reasons.join(' · ') : c.originalRemains}</p>
      {run.correctionDelta ? <CorrectionDelta delta={run.correctionDelta} names={names} /> : null}
      <p className="c-pay__detail">{c.settleNote}</p>
    </CorpBody></CorpCard> : reasons.length ? <CorpCard as="div" ariaLabel={c.correction}><CorpBody><b className="c-pay__strong">{c.correctionReason}</b><p className="c-pay__detail">{reasons.join(' · ')}</p></CorpBody></CorpCard> : null}
    {standsApproved(run, data.runs) ? <PayGroup id="payroll-handoff" label={c.whatsNext}><WhatsNext /></PayGroup> : null}
    {fixes.length ? <CorpCard as="div" ariaLabel={c.thingsToFix}><CorpRows label={c.thingsToFix}><li>
      <CorpRow href={`/app/payroll/fix?run=${encodeURIComponent(run.id)}`} tall bold title={c.thingsBeforeApproving(fixes.length)} detail={<CorpPill tone="red">{c.stopsPayroll}</CorpPill>} chevron />
    </li></CorpRows></CorpCard> : null}
    {!native && (!approved || correctionOpen) ? <ImportAmounts run={run} capabilities={capabilities} operation={operation} correction={correctionOpen} primary={run.status === 'WAITING_FOR_AMOUNTS' || correctionOpen} /> : null}
    {native && correctionOpen ? <PayGroup id="payroll-correction" label={c.createLinkedCorrection}><CorpBody>
      <form className="c-form" {...formKeys} onSubmit={event => { event.preventDefault(); setCorrectionError(''); const problem = flagProblems(event.currentTarget, lang); if (problem) { setCorrectionError(problem); return; } const reason = String(new FormData(event.currentTarget).get('nativeCorrectionReason') ?? '').trim(); if (reason) void operation.submit({ action: 'CORRECT_NATIVE', runId: run.id, expectedRevision: run.revision, reason }); }}>
        <fieldset className="c-pay__fieldset" disabled={locked || !capabilities.canReview}>
          <p className="c-pay__detail">{c.nativeCorrectionLine}{c.settleNote}</p>
          <label className="c-field"><span className="c-field__label">{c.correctionReason}</span><textarea className="c-in" name="nativeCorrectionReason" required maxLength={300} rows={3} /></label>
          {correctionError ? <p className="c-error" role="alert">{correctionError}</p> : null}
          <CorpButton type="submit" full>{c.createCorrectionDraft}</CorpButton>
        </fieldset>
      </form>
    </CorpBody></PayGroup> : null}
    {approved ? <Documents run={run} native={native} names={names} /> : null}
    {jobs.length ? <Jobs jobs={jobs} canApprove={capabilities.canApprove} locked={locked} operation={operation} /> : null}
    {(native && !approved && !fixes.length) || (approved && !replacement) ? <CorpCard as="div" ariaLabel={c.moreActions}><CorpRows label={c.moreActions}>
      {native && !approved && !fixes.length ? <li><CorpRow onClick={locked || !capabilities.canReview ? undefined : () => void operation.submit({ action: 'RECALCULATE', runId: run.id, expectedRevision: run.revision })} disabled={locked || !capabilities.canReview}
        title={c.recalculateDraft} detail={c.freshRevision} chevron /></li> : null}
      {approved && !replacement ? <li><CorpRow onClick={locked || !capabilities.canReview ? undefined : () => setCorrectionOpen(value => !value)} disabled={locked || !capabilities.canReview}
        title={correctionOpen ? c.closeCorrection : c.fixThisPayroll} detail={c.startsCorrection} chevron /></li> : null}
      {/* PY-17: the server never makes payment instructions for a correction (payment-policy.ts), so the row isn't offered there. */}
      {approved && !native && !run.correctionOf && !replacement && capabilities.canApprove ? <li><CorpRow onClick={locked ? undefined : () => void operation.submit({ action: 'PAYMENT_EXPORT', runId: run.id, expectedRevision: run.revision })} disabled={locked}
        title={c.preparePaymentInstructions} detail={c.fileOnly} chevron /></li> : null}
    </CorpRows>
      {approved && !native && run.correctionOf && capabilities.canApprove ? <CorpBody tight><p className="c-pay__detail">{c.noInstructionsForCorrection}{c.settleNote}</p></CorpBody> : null}
    </CorpCard> : null}
    {(run.status === 'REVIEW_REQUIRED' || run.status === 'BLOCKED') ? (capabilities.canApprove ? <div className="c-pay__approve">
      {run.status === 'REVIEW_REQUIRED' ? <Check checked={reviewed} onChange={setReviewed} disabled={locked || operation.revisionConflict}>{c.reviewedCheck(run.revision, native)}</Check> : null}
      {/* Owner premium A2 (Codex priority 2): while something stops payroll, the step the Owner can take (Review issues)
        * is the primary; the unavailable Approve stays visible as a quiet secondary. Its rule (canApproveNow) is unchanged. */}
      {fixes.length ? <CorpButtonLink full href={`/app/payroll/fix?run=${encodeURIComponent(run.id)}`}>{fixes.length === 1 ? c.reviewIssue : c.reviewIssues}</CorpButtonLink> : null}
      {/* PY-4, PY-9: what approving does and doesn't do, said before the button. Only a payroll NEVORA calculated carries
        * the calculation caveat and shares its statements by itself; an imported one keeps its own share step below. */}
      {run.status === 'REVIEW_REQUIRED' ? <div className="c-pay__approve-notes">
        {native ? <p>{c.nativeCalculated}</p> : null}
        <p>{c.approvingDoesnt}{native ? c.sharedWhenReady : ''}</p>
      </div> : null}
      <CorpButton full kind={fixes.length ? 'secondary' : undefined} disabled={!canApproveNow} onClick={() => run.reviewToken && void operation.submit({ action: 'APPROVE', runId: run.id, expectedRevision: run.revision, reviewToken: run.reviewToken })}>{c.approvePayroll}</CorpButton>
      <p className="c-note c-note--center">{fixes.length ? c.fixToApprove(fixes.length) : c.approvingLocks}</p>
    </div> : <p className="c-note c-note--center">{c.someoneApprove}</p>) : null}
    {approved && unpublished ? (capabilities.canApprove ? <div className="c-pay__approve">
      <Check checked={publishConfirmed} onChange={setPublishConfirmed} disabled={locked}>{c.shareConfirm}</Check>
      <CorpButton full disabled={locked || !publishConfirmed} onClick={() => void operation.submit({ action: 'PUBLISH', runId: run.id, expectedRevision: run.revision })}>{c.sharePayStatements}</CorpButton>
    </div> : <p className="c-note c-note--center">{c.someoneShare}</p>) : null}
  </>;
}

/** Approved documents (R9): one row each, name first. A statement is named only from this payroll's own rows or the team
 * list by its employee ID, never from its file name; the file name and revision sit in the Download label. */
function Documents({ run, native, names }: { run: PayrollRun; native: boolean; names: Record<string, string> }) {
  const c = usePayrollCopy().runs;
  const published = run.documents.some(document => document.kind === 'EMPLOYEE_STATEMENT' && document.published);
  const nameOf = (employeeId: string | null) => employeeId ? run.rows?.find(row => row.employeeId === employeeId)?.employeeName ?? names[employeeId] ?? null : null;
  return <PayGroup id="payroll-documents" label={c.documents}>
    {run.documents.length ? <CorpRows label={c.documents}>{run.documents.map(document => <li key={document.id}><DocumentRow document={document} name={nameOf(document.employeeId)} revision={run.revision} /></li>)}</CorpRows>
      : <CorpBody><p className="c-payroll__state" role="status">{c.documentsMaking}</p></CorpBody>}
    {native && !published ? <CorpBody tight><p className="c-pay__detail" role="status"><b className="c-pay__strong">{c.notSharedYet}</b>{c.notSharedLine}</p></CorpBody> : null}
  </PayGroup>;
}

function Jobs({ jobs, canApprove, locked, operation }: { jobs: PayrollJob[]; canApprove: boolean; locked: boolean; operation: Operation }) {
  const { runs: c, lang } = usePayrollCopy();
  return <PayGroup id="payroll-jobs" label={c.preparationDelivery}>
    <CorpRows label={c.preparationDelivery}>{jobs.map(job => <li key={job.id}>
      <CorpRow title={c.job[job.kind]} detail={job.error ?? (job.kind === 'REMINDER' ? noticeOutcome(job.outcome, lang) : c.attempts(job.attempts))}
        trail={job.status === 'FAILED' && canApprove
          ? <CorpButton kind="secondary" size="xs" className="c-pay__tap" disabled={locked} onClick={() => void operation.submit({ action: 'RETRY_JOB', jobId: job.id })} aria-label={c.retryJob[job.kind]}>{c.retry}</CorpButton>
          : <CorpPill tone={job.status === 'FAILED' ? 'red' : 'neutral'}>{job.status === 'SUCCEEDED' ? c.jobState.done : job.status === 'FAILED' ? c.jobState.failed : job.status === 'RUNNING' ? c.jobState.running : c.jobState.waiting}</CorpPill>} />
    </li>)}</CorpRows>
  </PayGroup>;
}

/** Provider or accountant amounts (historical provider runs): the way into the import (U01, /app/payroll/import), or
 * into a linked correction once the payroll is approved. The file, the matching, the amounts and the save live there;
 * this card no longer takes a file itself. */
function ImportAmounts({ run, capabilities, operation, correction, primary }: { run: PayrollRun; capabilities: PayrollCapabilities; operation: Operation; correction: boolean; primary: boolean }) {
  const { runs: c, lang } = usePayrollCopy();
  const entry = payrollImportCopy[lang].imp.entry, locked = operation.busy || (!!operation.pending && !operation.resuming);
  const href = `/app/payroll/import?run=${encodeURIComponent(run.id)}`;
  return <PayGroup id="payroll-import" label={correction ? c.createLinkedCorrection : c.importProviderAmounts} aside={run.sourceName ? <span className="c-pay__aside">{run.sourceName}</span> : undefined}><CorpBody>
    <b className="c-pay__strong">{correction ? entry.titleCorrection : entry.title}</b>
    <p className="c-pay__detail">{correction ? entry.lineCorrection : entry.line}</p>
    <p className="c-pay__detail">{capabilities.internalCalculatorAvailable ? c.historicalProvider : c.keepsImported}</p>
    {correction ? <p className="c-pay__detail">{c.settleNote}</p> : null}
    {locked ? <CorpButton full kind={primary ? undefined : 'secondary'} disabled>{correction ? entry.actionCorrection : entry.action}</CorpButton>
      : <CorpButtonLink full href={href} kind={primary ? undefined : 'secondary'}>{correction ? entry.actionCorrection : entry.action}</CorpButtonLink>}
  </CorpBody></PayGroup>;
}

/** Board O-PayrollFix: one card per thing that stops payroll, each with the place to fix it. */
function FixList({ run, capabilities, names, operation }: { run: PayrollRun; capabilities: PayrollCapabilities; names: Record<string, string>; operation: Operation }) {
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const { runs: c, lang } = usePayrollCopy();
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
    const who = people.length ? `${listNames(known.map(firstName), c.and)}${unknown ? `${known.length ? ` ${c.and} ` : ''}${c.otherPeople(unknown)}` : ''}` : '';
    const title = code === 'TIME_NOT_FINALIZED' ? c.timecardsNotFinalized(people.length)
      : code === 'POPULATION_DISPOSITION' ? c.chooseWhatToDo(people.length)
      : payrollExceptionMessage(code, lang);
    const detail = code === 'TIME_NOT_FINALIZED' || code === 'POPULATION_DISPOSITION' ? who : who ? c.forWho(who) : '';
    // PY-10: the button goes where the sentence says the next step is. AR-4: "Who’s included" opens on arrival.
    const place = payrollBlockerPlace(code);
    const action = place === 'time' ? { href: `/app/timecards?${period}`, label: c.reviewTimecards }
      : place === 'people' ? { href: `/app/payroll-export?${period}#${INCLUDED_HASH}`, label: c.chooseIncluded }
      : place === 'setup' && capabilities.canConfigure ? { href: '/app/settings/payroll?open=setup', label: c.openSetup }
      : place === 'settings' && capabilities.canConfigure ? { href: '/app/settings/payroll', label: c.openSettings }
      : place === 'support' ? { href: '/app/help', label: c.contactSupport } : null;
    return <CorpCard as="div" key={code} ariaLabel={title}>
      <div className="c-pay__fix"><b className="c-pay__strong">{title}</b>{detail ? <span className="c-pay__detail">{detail}</span> : null}</div>
      {action ? <div className="c-card__foot"><CorpButtonLink href={action.href} kind="secondary" size="md" full>{action.label}</CorpButtonLink></div> : null}
    </CorpCard>;
  });
  return <>
    {/* Nov 8: the Owner empty-state card (title on the card's text edge), as on the other Owner pages. */}
    {cards.length ? cards : <CorpEmpty title={c.nothingStops} label={c.payroll} />}
    {cards.length ? <p className="c-note">{c.approvableOnce(cards.length)}{native ? c.thenRecalculate : ''}</p> : null}
    {native ? <CorpButton kind="secondary" full disabled={locked || !capabilities.canReview} onClick={() => void operation.submit({ action: 'RECALCULATE', runId: run.id, expectedRevision: run.revision })}>{c.recalculateDraft}</CorpButton> : null}
  </>;
}

/** Each person's amounts for the review (opened from the People row). */
function PeopleAmounts({ run, replaced = false }: { run: PayrollRun; replaced?: boolean }) {
  const { runs: c, lang } = usePayrollCopy();
  const [filter, setFilter] = useState('');
  const searchId = useId();
  const native = run.sourceAuthority === 'NATIVE_RECORDED_TIME';
  const rows = run.rows?.filter(row => row.employeeName.toLowerCase().includes(filter.toLowerCase())) ?? [];
  return <>
    {run.totals ? <PayGroup id="payroll-people-totals" label={replaced ? `${periodText(run, c, lang)} · ${c.replacedByCorrection}` : periodText(run, c, lang)}>
      <dl className="c-pay__totals">
        <div><dt>{c.grossPay}</dt><dd>{formatPayrollMoney(run.totals.grossMinor, lang)}</dd></div>
        <div><dt>{c.employeeDeductions}</dt><dd>{`−${formatPayrollMoney(run.totals.deductionsMinor, lang)}`}</dd></div>
        <div><dt>{c.employerContributions}</dt><dd>{formatPayrollMoney(run.totals.employerContributionsMinor, lang)}</dd></div>
        <div className="c-pay__net"><dt>{c.netPayEmployees(run.totals.employeeCount)}</dt><dd>{formatPayrollMoney(run.totals.netMinor, lang)}</dd></div>
      </dl>
    </PayGroup> : null}
    {/* Batch 1 item 3: the approved title stays; "Net pay" is said once, as the column label beside it, not on each row. */}
    {run.rows ? <PayGroup id="payroll-people" label={c.employeeAmounts} aside={<span className="c-pay__aside">{c.netPay}</span>}>
      <div className="c-pay__search"><label className="c-sr" htmlFor={searchId}>{c.findEmployeeAmounts}</label><input id={searchId} className="c-in" type="search" enterKeyHint="search" autoComplete="off" placeholder={c.findEmployee} value={filter} onChange={event => setFilter(event.target.value)} /></div>
      <ul className="c-rows" aria-label={c.employeeAmounts}>{rows.map(row => {
        const result = native ? run.nativeCalculation?.employees.find(item => item.employeeId === row.employeeId) : undefined;
        const exception = run.exceptionRevisions.find(item => item.employeeId === row.employeeId)?.revision;
        return <li key={row.employeeId}><details className="c-pay__person">
          <summary className="c-row"><span className="c-row__main"><span className="c-row__title c-row__title--b">{row.employeeName}</span></span><span className="c-row__value">{formatPayrollMoney(row.netMinor, lang)}</span></summary>
          <div className="c-pay__lines">
            <dl>
              <div><dt>{c.grossPay}</dt><dd>{formatPayrollMoney(row.grossMinor, lang)}</dd></div>
              {row.earnings?.map((line, index) => <div key={`earnings${index}`}><dt>{line.label}</dt><dd>{formatPayrollMoney(line.amountMinor, lang)}</dd></div>)}
              <div className="c-pay__linehead"><dt>{c.employeeDeductions}</dt><dd /></div>
              {row.employeeDeductions.length ? row.employeeDeductions.map((line, index) => <div key={`deduction${index}`}><dt>{line.label}</dt><dd>{formatPayrollMoney(line.amountMinor, lang)}</dd></div>) : <div><dt>{native ? c.noEmployeeDeductions : c.noImportedEmployeeDeductions}</dt><dd /></div>}
              <div className="c-pay__linehead"><dt>{c.employerContributions}</dt><dd /></div>
              {row.employerContributions.length ? row.employerContributions.map((line, index) => <div key={`employer${index}`}><dt>{line.label}</dt><dd>{formatPayrollMoney(line.amountMinor, lang)}</dd></div>) : <div><dt>{native ? c.noEmployerContributions : c.noImportedEmployerContributions}</dt><dd /></div>}
            </dl>
            {result ? <div className="payroll-workflow c-pay__native"><NativeReview result={result} /></div> : null}
            {exception ? <p className="c-pay__detail">{c.exceptionRevision(exception)}</p> : null}
          </div>
        </details></li>;
      })}</ul>
      {rows.length === 0 ? <div className="c-empty c-pay__empty" role="status"><b>{c.noEmployeesMatch}</b><span>{c.checkSpelling}</span></div> : null}
    </PayGroup> : <EmptyCard title={c.noEmployeeAmounts} />}
  </>;
}

/** Up next's Prepare before a draft exists: prepare it (or a period that never had one). When a payday has already
 * passed with no payroll, that period leads (structure PP1, round 2 R3): its row in "Periods with no payroll" opens with
 * the page's one filled "Prepare payroll", and the current week's button steps back to secondary. Payroll's red notice
 * isn't repeated here. Every Prepare still needs its own press, and "Prepare payroll" is the only name for it (R7). */
function PreparePayroll({ current, data, today, operation }: { current: OpenPayPeriod | null; data: PayrollRunsResponse; today: string; operation: Operation }) {
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const open = current ? data.runs.find(item => item.period.startDate === current.period.startDate && item.period.endDate === current.period.endDate && !item.correctionOf) : undefined;
  const { runs: c, lang } = usePayrollCopy();
  const [other, setOther] = useState(false);
  const [otherError, setOtherError] = useState('');
  const oldest = overduePeriod(data, today);
  const step = nextStep(open, c);
  const range = current ? quietRange(current.period.startDate, current.period.endDate, lang) : '';
  return <>
    {current ? <PayGroup id="payroll-prepare" label={c.upNext}>
      <div className="c-payroll__next">
        <b>{frequencyName(c, current.frequency)}</b>
        <span><Num>{range}</Num>{c.scheduledPaydaySep}<Num>{quietDay(current.payday, lang)}</Num></span>
      </div>
      <CorpBody tight>
        <p className="c-pay__detail">{c.addsUp}</p>
        {/* Nov 1 upscale: one filled button on the page. While an overdue period leads, this week's step is a teal text
          * action (the same press, the same Prepare), so the open overdue row's Prepare payroll is the only filled one. */}
        {open ? oldest ? <Link className="c-link c-link--l c-pay__gap c-pay__quiet-go" href={step.href}>{step.label}</Link>
          : <CorpButtonLink href={step.href} full size="md" kind={step.quiet ? 'secondary' : undefined} className="c-pay__gap">{step.label}</CorpButtonLink>
          : oldest ? <button type="button" className="c-link c-link--l c-pay__gap c-pay__quiet-go" disabled={locked} aria-label={c.prepareRangeLabel(range)} onClick={() => void operation.submit({ action: 'PREPARE', period: current.period, payday: current.payday })}>{c.prepareRange(range)}</button>
          : <CorpButton full size="md" className="c-pay__gap" disabled={locked} aria-label={c.prepareRangeLabel(range)} onClick={() => void operation.submit({ action: 'PREPARE', period: current.period, payday: current.payday })}>{c.prepareRange(range)}</CorpButton>}
      </CorpBody>
    </PayGroup> : null}
    <Backlog data={data} operation={operation} lead={oldest} today={today} />
    {/* R7: "Other dates" is one row that opens its form, like the period rows above (and its action no longer sits past
      * the card edge). */}
    <CorpCard as="div" id="payroll-other" ariaLabel={c.otherDates}>
      <button type="button" className="c-row c-pay__other" aria-expanded={other} aria-controls="payroll-other-form" onClick={() => setOther(value => !value)}>
        <span className="c-row__main"><span className="c-row__title c-row__title--b">{c.otherDates}</span><span className="c-row__detail"><span>{c.outsideSchedule}</span></span></span>
        {other ? null : <span className="c-pay__rowpill" aria-hidden="true">{c.chooseDates}</span>}
        <CaretDownIcon className="c-pay__caret" weight="bold" aria-hidden="true" />
      </button>
      {other ? <CorpBody><form id="payroll-other-form" className="c-form" {...formKeys} onSubmit={event => {
        event.preventDefault(); setOtherError('');
        const problem = flagProblems(event.currentTarget, lang); if (problem) { setOtherError(problem); return; }
        const values = new FormData(event.currentTarget);
        void operation.submit({ action: 'PREPARE', period: { startDate: String(values.get('start')), endDate: String(values.get('end')) }, payday: String(values.get('payday')) });
      }}><fieldset className="c-pay__fieldset" disabled={locked}>
        <div className="c-field__row"><PayDateField name="start" label={c.periodStart} defaultValue={current?.period.startDate} required /><PayDateField name="end" label={c.periodEnd} defaultValue={current?.period.endDate} required /></div>
        <PayDateField name="payday" label={c.paydayField} defaultValue={current?.payday} required />
        {otherError ? <p className="c-error" role="alert">{otherError}</p> : null}
        <CorpButton type="submit" kind="secondary" size="md" full>{c.preparePayroll}</CorpButton>
      </fieldset></form></CorpBody> : null}
    </CorpCard>
  </>;
}

/** Completed periods with no original payroll run (oldest first). The oldest whose payday passed opens on arrival with
 * the page's one primary; Payroll's "Start with …" button opens it too. A row never prepares anything by itself. */
function Backlog({ data, operation, lead, today }: { data: PayrollRunsResponse; operation: Operation; lead: PayrollMissingPeriod | null; today: string }) {
  const { runs: c, lang } = usePayrollCopy();
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
  return <PayGroup id="payroll-backlog" label={count !== null ? <>{c.periodsWithNoPayroll} <span className="c-pay__count c-num">{count}</span></> : c.periodsWithNoPayroll}
    aside={missing.length > 3 ? <button type="button" className="c-link" disabled={locked} onClick={() => setExpanded(value => !value)}>{expanded ? c.showFewer : c.showAll(missing.length)}</button> : undefined}>
    {count === null || (backlog.ambiguousCount !== null && backlog.ambiguousCount > 0) ? <CorpBody tight>
      {count === null ? <p className="c-pay__detail">{backlogDescription(backlog, lang)}</p> : null}
      {backlog.ambiguousCount !== null && backlog.ambiguousCount > 0 ? <p className="c-pay__detail">{c.datesChecked(backlog.ambiguousCount)}</p> : null}
    </CorpBody> : null}
    <ul className="c-rows" aria-label={c.periodsWithNoPayroll}>{visible.map(item => {
      const open = selected === key(item);
      const id = `period-${item.period.startDate}-${item.settingsRevision}`;
      const range = quietRange(item.period.startDate, item.period.endDate, lang);
      // The oldest period whose payday passed is the page's one primary once its row is open.
      const primary = !!lead && key(lead) === key(item);
      return <li key={key(item)} id={unpaidHash(item)}>
        <button type="button" className="c-row" aria-expanded={open} aria-controls={id} disabled={locked} onClick={() => { setSelected(open ? null : key(item)); setAcknowledged(false); }}>
          {/* Phase 8 (a.md #15): the payday comes from the pay schedule, and a passed one says so (Payroll's own words). */}
          <span className="c-row__main"><span className="c-row__title c-row__title--b">{range}</span><span className="c-row__detail"><span>{item.payday < today ? c.paydayWasLead : c.scheduledPaydayLead}<Num>{quietDay(item.payday, lang)}</Num></span></span></span>
          {item.state === 'AMBIGUOUS_TRANSITION' ? <CorpPill tone="neutral">{c.checkDates}</CorpPill> : null}
          {/* Closing F1 (NV-081): a closed period shows a quiet "Prepare" pill (the open one's Prepare payroll is the filled
            action) and every row a CaretDown that turns when it is open; no "Close" text link. */}
          {open ? null : <span className="c-pay__rowpill" aria-hidden="true">{c.prepare}</span>}
          <CaretDownIcon className="c-pay__caret" weight="bold" aria-hidden="true" />
        </button>
        {open ? <div id={id} className="c-pay__expand">
          {item.state === 'AMBIGUOUS_TRANSITION' ? <div className="c-pay__check-dates"><b className="c-pay__strong">{c.checkPeriodDates}</b><p className="c-pay__detail">{item.issues.join(' ')}{c.confirmBoundaries}</p></div> : null}
          <p className="c-pay__detail">{c.usesSettings}</p>
          {item.state === 'AMBIGUOUS_TRANSITION' ? <Check checked={acknowledged} disabled={locked} onChange={setAcknowledged}>{c.reviewedTransition}</Check> : null}
          <CorpButton kind={primary ? undefined : 'secondary'} size="md" full aria-label={c.prepareRangeLabel(range)} disabled={locked || (item.state === 'AMBIGUOUS_TRANSITION' && !acknowledged)} onClick={() => void operation.submit({ action: 'PREPARE', period: item.period, payday: item.payday })}>{c.prepareRange(range)}</CorpButton>
        </div> : null}
      </li>;
    })}</ul>
    {backlog.remainingCount !== null && backlog.remainingCount > 0 ? <CorpBody tight><p className="c-pay__detail">{c.moreFollow(backlog.remainingCount)}</p></CorpBody> : null}
  </PayGroup>;
}

/** Every payroll, the pay statements and any delivery work not tied to one payroll. */
function PayHistory({ data, names, operation }: { data: PayrollRunsResponse; names: Record<string, string>; operation: Operation }) {
  const c = usePayrollCopy().runs;
  const runs = [...data.runs].sort((a, b) => b.period.startDate.localeCompare(a.period.startDate) || b.createdAt.localeCompare(a.createdAt));
  const locked = operation.busy || (!!operation.pending && !operation.resuming);
  const loose = data.jobs.filter(job => !job.runId);
  return <>
    <PayGroup id="payroll-all" label={c.payrolls}>
      {runs.length ? <CorpRows label={c.payrolls}>{byCorrection(runs).map(({ item, replaced }) => <li key={item.id} className={replaced ? 'c-pay__replaced' : undefined}><RunRow item={item} replaced={replaced} /></li>)}</CorpRows>
        : <div className="c-empty c-pay__empty"><b>{c.noPayrolls}</b><span>{c.prepareFromUpNext}</span></div>}
    </PayGroup>
    <PortalStatements runs={data.runs} names={names} />
    {loose.length ? <Jobs jobs={loose} canApprove={data.capabilities.canApprove} locked={locked} operation={operation} /> : null}
  </>;
}
