import type {ReactNode} from 'react';
import {CorpButtonLink, CorpCard, CorpLink, CorpPage, CorpRow, CorpRows, CorpTitle} from './corp/corp';
import './employee-requests-corp.css';

/* An Employee's Requests on the corporate kit (Release 1, board G-E-Requests; Nov 1 upscale S4, S7): "Requests" with the
 * one primary, Request time off, then what is Waiting (for your manager) and what was Decided, each state in grey text. Presentation only: callers pass rows
 * from their own authorized reads (the phone's private snapshot or the desktop page's server read) and keep their states. */

type Tone = 'teal' | 'amber' | 'blue' | 'red' | 'neutral';
export type CorpRequestRow = {key: string; href: string; title: string; detail: string; pill: {tone: Tone; text: string}; id?: string; label?: string};

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
/** "Thu, Nov 12" */
export const requestDay = (date: string) => new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric'}).format(utcDay(date));
const monthDay = (date: string) => new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', month: 'short', day: 'numeric'}).format(utcDay(date));

/** A time-off request's dates and length, the same words on phone and desktop: "Fri, Nov 13 · All day",
 * "Nov 11 – 12 · 2 days", "Oct 30 – Nov 2 · 4 days" or "Fri, Nov 13 · Part of day". */
export function timeOffDetail(request: {startDate: string; endDate: string; startTime?: string | null; endTime?: string | null}) {
  const sameMonth = request.startDate.slice(0, 7) === request.endDate.slice(0, 7);
  const range = request.startDate === request.endDate ? requestDay(request.startDate)
    : `${monthDay(request.startDate)} – ${sameMonth ? Number(request.endDate.slice(8)) : monthDay(request.endDate)}`;
  const days = Math.round((utcDay(request.endDate).getTime() - utcDay(request.startDate).getTime()) / 86_400_000) + 1;
  return `${range} · ${request.startTime && request.endTime ? 'Part of day' : days === 1 ? 'All day' : `${days} days`}`;
}

/** One vocabulary for a time-off request's pill, the same as on Time off. */
export function timeOffPill(status: string): {tone: Tone; text: string} {
  return status === 'PENDING' ? {tone: 'amber', text: 'Waiting'} : status === 'APPROVED' ? {tone: 'teal', text: 'Approved'}
    : status === 'DENIED' ? {tone: 'red', text: 'Declined'} : status === 'CANCELLED' ? {tone: 'neutral', text: 'Withdrawn'} : {tone: 'neutral', text: 'Open to check'};
}

/** A shift request's pill (swap, cover, pickup or Can't work). */
export function shiftPill(status: string, callout: boolean): {tone: Tone; text: string} {
  if (status === 'EMPLOYEE_PENDING') return {tone: 'amber', text: 'Waiting on teammate'};
  if (status === 'MANAGER_PENDING' || status === 'PENDING') return {tone: 'amber', text: 'Needs approval'};
  if (status === 'OPEN') return {tone: 'amber', text: 'Waiting for cover'};
  if (status === 'APPROVED') return {tone: 'teal', text: callout ? 'Approved' : 'Completed'};
  if (status === 'DENIED') return {tone: 'red', text: 'Declined'};
  if (status === 'RECORDED') return {tone: 'neutral', text: 'Recorded'};
  return {tone: 'neutral', text: ({CANCELLED: 'Cancelled', EXPIRED: 'Expired'} as Record<string, string>)[status] ?? 'Open to check'};
}

/** Statuses that still wait on someone. */
export const waitingStatus = (status: string) => ['PENDING', 'EMPLOYEE_PENDING', 'MANAGER_PENDING', 'OPEN'].includes(status);

/** Statuses that wait on the manager (said once, by the Waiting card's label). */
const managerWaits = new Set(['Waiting', 'Needs approval']);

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
export function requestsSubtitle(modules: {timeOff: boolean; marketplace: boolean} | null | undefined) {
  return !modules || modules.timeOff && modules.marketplace ? 'Time off and shift changes you’ve sent' : modules.timeOff ? 'Time off you’ve asked for' : 'Shift changes you’ve sent';
}

export function EmployeeRequestsCorp({sub, newHref, waiting, decided, decidedHref, waitingExtra, notice, after, state, className}: {
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
}) {
  // Upscale S7: the button names what it opens. The Waiting card says who it waits on once, when every row waits on the
  // manager; a row waiting on someone else (a teammate, cover) says so in grey.
  const forManager = !!waiting && waiting.every(row => managerWaits.has(row.pill.text));
  return <CorpPage className={className ? `c-ereq c-page--narrow ${className}` : 'c-ereq c-page--narrow'} label="Requests">
    <div className="c-ereq__body" data-requests-state={state}>
      <CorpTitle title="Requests" sub={sub} actions={newHref ? <CorpButtonLink href={newHref}>Request time off</CorpButtonLink> : undefined}/>
      {notice ?? null}
      {waiting ? <CorpCard id="requests-waiting" label={forManager && waiting.length ? 'Waiting for your manager' : 'Waiting'}>
        {waitingExtra ?? null}
        {waiting.length ? <Rows rows={waiting} said={row => managerWaits.has(row.pill.text)}/> : waitingExtra ? null : <p className="c-ereq__empty">Nothing waiting right now.</p>}
      </CorpCard> : null}
      {decided && decided.length ? <CorpCard id="requests-decided" label="Decided" aside={decidedHref ? <CorpLink href={decidedHref} label="See all decided requests">See all</CorpLink> : undefined}>
        <Rows rows={decided}/>
      </CorpCard> : null}
      {after ?? null}
    </div>
  </CorpPage>;
}
