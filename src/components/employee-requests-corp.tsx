import type {ReactNode} from 'react';
import {CorpButtonLink, CorpCard, CorpLink, CorpPage, CorpPill, CorpRow, CorpRows, CorpTitle} from './corp/corp';
import './employee-requests-corp.css';

/* An Employee's Requests on the corporate kit (Release 1, board G-E-Requests): "Requests" with the one primary, New
 * request, then what is Waiting and what was Decided, each row with its status pill. Presentation only: callers pass rows
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

function Rows({rows}: {rows: CorpRequestRow[]}) {
  return <CorpRows>{rows.map(row => <li key={row.key} id={row.id}>
    <CorpRow href={row.href} title={row.title} detail={row.detail} bold label={row.label ?? `${row.title}, ${row.detail}, ${row.pill.text}`}
      trail={<CorpPill tone={row.pill.tone}>{row.pill.text}</CorpPill>} chevron/>
  </li>)}</CorpRows>;
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
  return <CorpPage className={className ? `c-ereq ${className}` : 'c-ereq'} label="Requests">
    <div className="c-ereq__body" data-requests-state={state}>
      <CorpTitle title="Requests" sub={sub} actions={newHref ? <CorpButtonLink href={newHref}>New request</CorpButtonLink> : undefined}/>
      {notice ?? null}
      {waiting ? <CorpCard id="requests-waiting" label="Waiting">
        {waitingExtra ?? null}
        {waiting.length ? <Rows rows={waiting}/> : waitingExtra ? null : <p className="c-ereq__empty">Nothing waiting right now.</p>}
      </CorpCard> : null}
      {decided && decided.length ? <CorpCard id="requests-decided" label="Decided" aside={decidedHref ? <CorpLink href={decidedHref} label="See all decided requests">See all</CorpLink> : undefined}>
        <Rows rows={decided}/>
      </CorpCard> : null}
      {after ?? null}
    </div>
  </CorpPage>;
}
