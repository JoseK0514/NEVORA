import type {ReactNode} from 'react';
import {dateRange} from '@/lib/duration-format';
import {formatTime} from '@/lib/date-utils';
import {CorpButtonLink, CorpCard, CorpLink, CorpPage, CorpRow, CorpRows, CorpTitle} from './corp/corp';
import './employee-requests-corp.css';
import {LOCALE, esTime, type FormatLang} from './employee-b/es-format';
import {employeeRequestsCorpCopy} from './employee-requests-corp-copy';

/* An Employee's Requests on the corporate kit (Release 1, board G-E-Requests; Nov 1 upscale S4, S7): "Requests" with the
 * one primary, Request time off, then what is Waiting (for your manager) and what was Decided, each state in grey text. Presentation only: callers pass rows
 * from their own authorized reads (the phone's private snapshot or the desktop page's server read) and keep their states. */

type Tone = 'teal' | 'amber' | 'blue' | 'red' | 'neutral';
export type CorpRequestRow = {key: string; href: string; title: string; detail: string; pill: {tone: Tone; text: string}; id?: string; label?: string};

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
/** "Thu, Nov 12" */
export const requestDay = (date: string, lang: FormatLang = 'en') => new Intl.DateTimeFormat(LOCALE[lang], {timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric'}).format(utcDay(date));

/** A time-off request's dates and length, the same words on phone and desktop: "Fri, Nov 13 · All day",
 * "Nov 11–12 · 2 days", "Oct 30–Nov 2 · 4 days" or "Fri, Nov 13 · 9:00 AM – 1:00 PM". Phase 8 (review C, row 35): part
 * of a day shows its hours, as Time off does. */
export function timeOffDetail(request: {startDate: string; endDate: string; startTime?: string | null; endTime?: string | null}, lang: FormatLang = 'en') {
  const t = employeeRequestsCorpCopy[lang];
  const range = request.startDate === request.endDate ? requestDay(request.startDate, lang)
    : dateRange(request.startDate, request.endDate, {year: 'never', locale: LOCALE[lang]});
  const days = Math.round((utcDay(request.endDate).getTime() - utcDay(request.startDate).getTime()) / 86_400_000) + 1;
  return `${range} · ${request.startTime && request.endTime ? esTime(`${formatTime(request.startTime)} – ${formatTime(request.endTime)}`, lang) : days === 1 ? t.allDay : t.daysOther.replace('{count}', String(days))}`;
}

/** One vocabulary for a time-off request's pill, the same as on Time off. */
export function timeOffPill(status: string, lang: FormatLang = 'en'): {tone: Tone; text: string} {
  const p = employeeRequestsCorpCopy[lang].pill;
  return status === 'PENDING' ? {tone: 'amber', text: p.waiting} : status === 'APPROVED' ? {tone: 'teal', text: p.approved}
    : status === 'DENIED' ? {tone: 'red', text: p.declined} : status === 'CANCELLED' ? {tone: 'neutral', text: p.withdrawn} : {tone: 'neutral', text: p.openToCheck};
}

/** A shift request's pill (swap, cover, pickup or Can't work). */
export function shiftPill(status: string, callout: boolean, lang: FormatLang = 'en'): {tone: Tone; text: string} {
  const p = employeeRequestsCorpCopy[lang].pill;
  if (status === 'EMPLOYEE_PENDING') return {tone: 'amber', text: p.waitingTeammate};
  // Phase 8 (review C, row 16): one word for waiting on the manager, as on time off.
  if (status === 'MANAGER_PENDING' || status === 'PENDING') return {tone: 'amber', text: p.waiting};
  if (status === 'OPEN') return {tone: 'amber', text: p.waitingCover};
  if (status === 'APPROVED') return {tone: 'teal', text: callout ? p.approved : p.completed};
  if (status === 'DENIED') return {tone: 'red', text: p.declined};
  if (status === 'RECORDED') return {tone: 'neutral', text: p.recorded};
  return {tone: 'neutral', text: ({CANCELLED: p.cancelled, EXPIRED: p.expired} as Record<string, string>)[status] ?? p.openToCheck};
}

/** Statuses that still wait on someone. */
export const waitingStatus = (status: string) => ['PENDING', 'EMPLOYEE_PENDING', 'MANAGER_PENDING', 'OPEN'].includes(status);

/** Statuses that wait on the manager (said once, by the Waiting card's label). */
const managerWaits = new Set<string>([employeeRequestsCorpCopy.en.pill.waiting, employeeRequestsCorpCopy.es.pill.waiting]);
/** A row waits on the manager (the Waiting card then says "Waiting for your manager"). */
export const waitsOnManager = (pill: {text: string}) => managerWaits.has(pill.text);

/** Upscale S4: a row's state is grey text, never a pill, and is left out where the card's label already says it. */
function Rows({rows, said}: {rows: CorpRequestRow[]; said?: (row: CorpRequestRow) => boolean}) {
  return <CorpRows>{rows.map(row => {
    const quiet = said?.(row) ?? false;
    return <li key={row.key} id={row.id}>
      <CorpRow href={row.href} title={row.title} detail={row.detail} bold label={row.label ?? (quiet ? `${row.title}, ${row.detail}` : `${row.title}, ${row.detail}, ${row.pill.text}`)}
        trail={quiet ? undefined : <span className="c-meta">{row.pill.text}</span>} chevron/>
    </li>;
  })}</CorpRows>;
}

/** The subtitle: what the page lists. */
export function requestsSubtitle(modules: {timeOff: boolean; marketplace: boolean} | null | undefined, lang: FormatLang = 'en') {
  const t = employeeRequestsCorpCopy[lang];
  return !modules || modules.timeOff && modules.marketplace ? t.subAll : modules.timeOff ? t.subTimeOff : t.subShifts;
}

export function EmployeeRequestsCorp({sub, newHref, waiting, decided, decidedHref, waitingExtra, notice, after, state, className, b, lang = 'en'}: {
  sub: ReactNode;
  /** The one primary ("New request"); omitted when no request can start here. */
  newHref?: string | null;
  /** null: the read is not shown (loading, paused, failed); `notice` says why. */
  waiting: CorpRequestRow[] | null;
  decided: CorpRequestRow[] | null;
  decidedHref?: string | null;
  /** Extra rows or a notice inside the Waiting card (swaps that need your answer). */
  waitingExtra?: ReactNode;
  notice?: ReactNode;
  /** A last card (the desktop page's way to its shift requests). */
  after?: ReactNode;
  state?: string;
  className?: string;
  /** Direction B: the phone screen, the page's first child (phones only; tablets and desktop keep this layout). */
  b?: ReactNode;
  /** The person's language (signed-in Spanish, Nov 23, 2026); English when absent. */
  lang?: FormatLang;
}) {
  const t = employeeRequestsCorpCopy[lang];
  // Upscale S7: the button names what it opens. The Waiting card says who it waits on once, when every row waits on the
  // manager; a row waiting on someone else (a teammate, cover) says so in grey.
  const forManager = !!waiting && waiting.every(row => managerWaits.has(row.pill.text));
  return <CorpPage className={className ? `c-ereq c-page--narrow ${className}` : 'c-ereq c-page--narrow'} label={t.requests}>
    {b ?? null}
    <div className="c-ereq__body" data-requests-state={state}>
      <CorpTitle title={t.requests} sub={sub} actions={newHref ? <CorpButtonLink href={newHref}>{t.requestTimeOff}</CorpButtonLink> : undefined}/>
      {notice ?? null}
      {waiting ? <CorpCard id="requests-waiting" label={forManager && waiting.length ? t.waitingManager : t.waiting}>
        {waitingExtra ?? null}
        {waiting.length ? <Rows rows={waiting} said={row => managerWaits.has(row.pill.text)}/> : waitingExtra ? null : <p className="c-ereq__empty">{t.nothingWaiting}</p>}
      </CorpCard> : null}
      {decided && decided.length ? <CorpCard id="requests-decided" label={t.decided} aside={decidedHref ? <CorpLink href={decidedHref} label={t.seeAllDecided}>{t.seeAll}</CorpLink> : undefined}>
        <Rows rows={decided}/>
      </CorpCard> : null}
      {after ?? null}
    </div>
  </CorpPage>;
}
