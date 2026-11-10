'use client';

import Link from 'next/link';
import {useEffect, useRef, type ReactNode} from 'react';
import {CalendarCheckIcon} from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {ClockCounterClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {BButton, BCard, BChip, BHero, BIcon, BList, BRow, BScreen, BStack, type BTone} from '../owner-b/b-kit';
import {BCardNote, BDay, Dotted} from './parts';
import {BEmpty, BText, bPillText, ExchangeHeroB, MyScheduleCardB, RequestTypeIcon, type ExchangeTab, OpenShiftsEmptyB} from './requests-b';
import type {OpenEmployeeShift} from '@/lib/employee-requests';
import type {EmployeeRequestDetail, HistorySlot, RequestSlot, RequestSummary} from '@/lib/employee-exchange';
import {addDays, formatTime} from '@/lib/date-utils';
import {keepWhole} from '@/lib/keep-whole';

/* Pick up and swap on the Employee phone, Direction B: Open shifts, For you and My requests as one place with three tabs
 * on glass (back to Schedule), and a request's own page. Presentation only: the reads, the Pick up operation, the
 * response controls and every state are the corporate view's; callers pass them in. */

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
/** "Thu, Nov 12" */
export const dayB = (date: string) => new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric'}).format(utcDay(date));
const weekdayB = (date: string) => new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday: 'short'}).format(utcDay(date));
const stamp = (at: string, timeZone: string) => new Intl.DateTimeFormat('en-US', {timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(at));
const range = (slot: {startTime: string; endTime: string}) => keepWhole(`${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}`);

/* ---------- Open shifts ---------- */

export type OpenRowB = {
  shift: OpenEmployeeShift; hours: string; nextWeek: boolean; selected: boolean;
  /** The real Pick up button (the same operation as the corporate view), or null once it has a result. */
  action: ReactNode;
  /** The pickup's outcome and recovery, when it has one. */
  status: ReactNode;
};

function OpenShiftRow({row}: {row: OpenRowB}) {
  const {shift} = row, title = useRef<HTMLSpanElement>(null);
  // A deep link to one shift brings its row into view (the corporate card does the same on tablets).
  useEffect(() => { if (row.selected && title.current?.getClientRects().length) title.current.scrollIntoView({block: 'center'}); }, [row.selected]);
  const overnight = shift.endTime <= shift.startTime;
  // An overnight shift ends the next day; the row's day already says which, so its weekday is enough ("ends Sat").
  const first = [shift.position, row.hours, overnight ? `ends ${weekdayB(addDays(shift.date, 1))}` : null].filter(Boolean).join(' · ');
  return <BRow lead={<BDay date={shift.date}/>} title={<span ref={title} id={`b-request-${shift.id}`} data-selected={row.selected || undefined}>{range(shift)}</span>}
    sub={<><span className="eb-line"><Dotted text={first}/></span><span className="eb-line">{/* "Next week" rides on the place line (board E-Open draws no chip). */}<Dotted text={row.nextWeek ? `${shift.location} · Next week` : shift.location}/></span></>}
    trail={row.action ?? undefined} actions={row.status ?? undefined}/>;
}

/** Why other shifts aren't available: one row that opens the list of refused shifts, each with its reason. */
function WhyNot({refused}: {refused: OpenEmployeeShift[]}) {
  return <BCard label="Why other shifts aren’t available">
    <details className="eb-why">
      <summary className="b-row"><BIcon tone="grey"><InfoIcon weight="bold"/></BIcon>
        <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">Why other shifts aren’t available</span></span><span className="b-row__s">{`${refused.length} ${refused.length === 1 ? 'shift' : 'shifts'} · date, location and the reason for each`}</span></span>
        <CaretDownIcon className="b-chev eb-why__chev" size={18} weight="bold" aria-hidden="true"/></summary>
      <ul className="eb-why__list">{refused.map(row => <li key={row.id}><strong>{keepWhole(`${dayB(row.date)} · ${formatTime(row.startTime)}`)}</strong><span>{row.location}</span>{row.notice ? <p>{row.notice}</p> : null}</li>)}</ul>
    </details>
  </BCard>;
}

export function OpenShiftsB({state, enabled, failed, refreshing, onRefresh, results, rows, unconfirmed, refused, note, forYou}: {
  /** The read's state card while it isn't shown (checking, paused, denied, failed). */
  state: ReactNode;
  /** Shift requests are on for the company; null while unknown. */
  enabled: boolean | null;
  /** Open shifts couldn't be checked. */
  failed: boolean;
  refreshing: boolean; onRefresh: () => void;
  /** Pickups whose shift has left the list, with their outcome. */
  results: ReactNode;
  rows: OpenRowB[]; unconfirmed: OpenEmployeeShift[]; refused: OpenEmployeeShift[];
  /** What a pickup does here (yours right away, or your manager confirms). */
  note: string | null;
  /** Desktop: swaps waiting on your answer, for the For you tab's count. */
  forYou?: number | null;
}) {
  return <BScreen back>
    <ExchangeHeroB tab="open" tabs={enabled !== false} counts={{open: failed ? null : rows.length, foryou: forYou}}/>
    <BStack>
      {state ?? (enabled === false ? <BCard><BText status>Your workplace doesn’t use shift pickup in NEVORA.</BText></BCard> : <>
        {results}
        {failed ? <BCard><div className="eb-status"><p className="b-state" role="status">Open shifts couldn’t be checked.</p><BButton kind="quiet" full disabled={refreshing} onClick={onRefresh}>Try again</BButton></div></BCard> : <>
          {rows.length ? <BCard id="b-open-eligible" title="You can pick up" count={rows.length}>
            <BList>{rows.map(row => <OpenShiftRow key={row.shift.id} row={row}/>)}</BList>
            {note ? <BCardNote>{note}</BCardNote> : null}
          </BCard> : unconfirmed.length ? <BCard><div className="eb-status"><p className="b-state" role="status">We’re still checking whether you can take some shifts. Refresh to try again.</p>
            <BButton kind="quiet" full disabled={refreshing} onClick={onRefresh}>Refresh</BButton></div></BCard>
            : <BCard><OpenShiftsEmptyB/></BCard>}
          {unconfirmed.length ? <BCard id="b-open-unconfirmed" title="We couldn’t check these shifts"><BList>{unconfirmed.map(row => <BRow key={row.id} title={keepWhole(`${dayB(row.date)} · ${formatTime(row.startTime)}`)}
            sub={row.notice ? `${row.location} · ${row.notice}` : row.location}/>)}</BList></BCard> : null}
          {refused.length ? <WhyNot refused={refused}/> : null}
          {/* Desktop: the way to more shifts sits beside them (eb-desk). */}
          <div className="eb-desk eb-moreshifts"><BCard label="Want more shifts?"><BList><BRow href="/app/availability" lead={<BIcon tone="grey"><CalendarCheckIcon weight="bold"/></BIcon>} title="Want more shifts?" sub="Update when you can work"/></BList></BCard></div>
        </>}
      </>)}
    </BStack>
  </BScreen>;
}

/** A pickup's outcome and recovery, as one card (its shift has left the list). */
export function PickupResultB({children}: {children: ReactNode}) {
  return <BCard label="Your pickup result"><div className="eb-status">{children}</div></BCard>;
}

/* ---------- For you and My requests ---------- */

/** A shift request's chip: the hub's words and tones; a swap that waits on you says so. */
export function exchangeChip(row: RequestSummary, pill: {tone: BTone; text: string}) {
  return row.status === 'EMPLOYEE_PENDING' && row.viewer === 'recipient' ? {tone: 'amber' as const, text: 'Needs your answer'} : {...pill, text: bPillText(pill.text)};
}

export type ExchangeRowB = {row: RequestSummary; href: string; title: string; sub: string; chip: {tone: BTone; text: string}; status: string};
/** Desktop For you (Direction B, Nov 8, 2026): the chosen request's details beside the list. Choosing a row shows it in the
 * pane; Enter also moves focus into the pane. */
export type ExchangeSplitB = {chosen: string; onChoose: (id: string, keyboard: boolean) => void; pane: ReactNode};

export function ExchangeListB({mode, state, enabled, recoveries, rows, split}: {
  mode: 'incoming' | 'mine'; state: ReactNode; enabled: boolean | null; recoveries: ReactNode;
  /** null: couldn't be checked. */
  rows: ExchangeRowB[] | null;
  split?: ExchangeSplitB | null;
}) {
  const tab: ExchangeTab = mode === 'incoming' ? 'foryou' : 'mine';
  const waiting = mode === 'incoming' && rows ? rows.length : null;
  const paned = split && rows?.length ? split : null;
  const list = rows?.length ? <BList>{rows.map(item => <li key={item.row.id} className="b-li"><BRowLink item={item} split={paned}/></li>)}</BList> : null;
  return <BScreen back>
    <ExchangeHeroB tab={tab} tabs={enabled !== false} counts={{foryou: waiting}}/>
    <BStack>
      {state ?? (enabled === false ? <BCard><BText status>Shift requests are turned off for your company.</BText></BCard> : <>
        {recoveries}
        {rows === null ? <BCard><BText status>{mode === 'incoming' ? 'Incoming swaps' : 'Your request activity'} couldn’t be checked. Refresh to try again.</BText></BCard>
          : mode === 'incoming' ? <BCard label="Needs your answer">{list ?? <BEmpty icon={<ArrowsLeftRightIcon weight="bold"/>} title="No swaps need your answer" sub="A request addressed to you will appear here."/>}</BCard>
          : rows.length ? <BCard id="b-exchange-activity" title="Recent activity">{list}</BCard>
          : <BCard><BEmpty icon={<ArrowsLeftRightIcon weight="bold"/>} title="No recent shift requests" sub="Start a swap or cover offer from your own schedule."/></BCard>}
        {paned ? paned.pane : <MyScheduleCardB/>}
      </>)}
    </BStack>
  </BScreen>;
}

/** A request row as one link with its own id, so the list can return focus to it after its page closes. Beside the
 * desktop pane, choosing it shows the request there instead (its address still opens the page in a new tab). */
function BRowLink({item, split}: {item: ExchangeRowB; split?: ExchangeSplitB | null}) {
  const chosen = split?.chosen === item.row.id;
  return <Link className="b-row b-row--link" id={`b-exchange-request-${item.row.id}`} href={item.href} aria-label={`${item.title}, ${item.sub}, ${item.status}`}
    aria-current={chosen ? 'true' : undefined} aria-controls={split ? 'b-xpane' : undefined}
    onClick={split ? event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); split.onChoose(item.row.id, event.detail === 0); } : undefined}>
    <RequestTypeIcon kind={item.row.kind === 'callout' ? 'callout' : 'shift'}/>
    <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{item.title}</span></span><span className="b-row__s"><Dotted text={item.sub}/></span></span>
    <span className="b-row__end"><BChip tone={item.chip.tone}>{item.chip.text}</BChip></span>
    <CaretRightIcon className="b-chev" size={18} weight="bold" aria-hidden="true"/>
  </Link>;
}

/* ---------- A request's own page ---------- */

function SlotCard({slot, title}: {slot: RequestSlot | null; title: string}) {
  if (!slot) return <BCard title={title}><p className="b-state">Recorded shift details are unavailable.</p></BCard>;
  const lines = [[slot.location, slot.position].filter(Boolean).join(' · '), slot.lead ? 'Shift lead' : null,
    slot.endTime <= slot.startTime ? `Ends ${dayB(addDays(slot.date, 1))} at ${formatTime(slot.endTime)}.` : null].filter(Boolean) as string[];
  return <BCard title={title}><BList><BRow lead={<BDay date={slot.date}/>} title={range(slot)} sub={<>{lines.map(line => <span key={line} className="eb-line">{line}</span>)}</>}/></BList></BCard>;
}

function HistoryTime({slot, title}: {slot: HistorySlot | null; title: string}) {
  return slot ? <span>{title}: {dayB(slot.date)} · {formatTime(slot.startTime)} – {formatTime(slot.endTime)}{slot.endTime <= slot.startTime ? ` · Ends ${dayB(addDays(slot.date, 1))}` : ''}</span> : null;
}

export function ExchangeDetailB({mode, title, back, state, enabled, recoveries, detail, timeZone, status, controls}: {
  mode: 'incoming' | 'mine'; title: string; back: string; state: ReactNode; enabled: boolean | null; recoveries: ReactNode;
  /** undefined while not read; null when this request isn't available to the account. */
  detail: EmployeeRequestDetail | null | undefined; timeZone: string; status: string;
  /** The response controls (the same operation as the corporate view). */
  controls: ReactNode;
}) {
  return <BScreen back>
    <BHero back={{href: back, label: mode === 'incoming' ? 'For you' : 'My requests'}} title={title} titleId="b-exchange-detail-title"/>
    <BStack>
      <DetailCardsB state={state} enabled={enabled} recoveries={recoveries} detail={detail} timeZone={timeZone} status={status} controls={controls}/>
    </BStack>
  </BScreen>;
}

type DetailCardsProps = {state: ReactNode; enabled: boolean | null; recoveries: ReactNode; detail: EmployeeRequestDetail | null | undefined; timeZone: string; status: string; controls: ReactNode};

/** The desktop For you pane: the request page's cards beside the list. Its first card carries the request's name (the
 * page's title); Escape, or the Back to the list control, returns to the row. */
export function ExchangePaneB({title, onBack, ...cards}: DetailCardsProps & {title: string; onBack: () => void}) {
  const named = !!cards.detail && cards.enabled !== false && !cards.state;
  return <section className="eb-xpane" id="b-xpane" tabIndex={-1} aria-labelledby={named ? 'b-xpane-s-h' : undefined} aria-label={named ? undefined : title}
    onKeyDown={event => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); onBack(); } }}>
    <button type="button" className="eb-xpane__back" onClick={onBack}>Back to the list</button>
    <DetailCardsB {...cards} title={title}/>
  </section>;
}

function DetailCardsB({state, enabled, recoveries, detail, timeZone, status, controls, title}: DetailCardsProps & {
  /** In the desktop pane, the status card's heading. */
  title?: string;
}) {
  const row = detail?.summary, incoming = !!row && row.kind === 'swap' && row.viewer === 'recipient' && row.status === 'EMPLOYEE_PENDING';
  return <>
      {state ?? (enabled === false ? <BCard><BText status>Shift requests are turned off for your company.</BText></BCard> : <>
        {recoveries}
        {detail && row ? <>
          <BCard label={title ? undefined : 'Current request status'} title={title} id={title ? 'b-xpane-s' : undefined}><BList><BRow lead={<RequestTypeIcon kind={row.kind === 'callout' ? 'callout' : 'shift'}/>} title={status}
            sub={<Dotted text={[row.counterparty ? `${row.viewer === 'requester' ? 'With' : 'From'} ${row.counterparty}` : null, `Submitted ${keepWhole(stamp(row.createdAt, timeZone))}`].filter(Boolean).join(' · ')}/>}/></BList></BCard>
          {detail.notice ? <BCard><BText status>{detail.notice}</BText></BCard> : null}
          {incoming ? <><SlotCard title="Your current shift" slot={detail.requested}/><SlotCard title="You would work" slot={detail.offered}/></>
            : <><SlotCard title={row.kind === 'swap' ? 'Offered shift' : row.kind === 'callout' ? 'Reported shift' : 'Offered coverage'} slot={detail.offered}/>{row.kind === 'swap' ? <SlotCard title="Requested shift" slot={detail.requested}/> : null}</>}
          {detail.reason ? <BCard title="Your reported reason"><BText>{detail.reason}</BText></BCard> : null}
          <section className="b-card eb-resp-card" aria-label="Your response">{controls}</section>
          {detail.history === null ? <BCard><BText status>Request history couldn’t be checked. Refresh to try again.</BText></BCard>
            : detail.history.length ? <BCard label="Recorded request history"><details className="eb-why">
              <summary className="b-row"><BIcon tone="grey"><ClockCounterClockwiseIcon weight="bold"/></BIcon><span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">Request history</span></span></span>
                <CaretDownIcon className="b-chev eb-why__chev" size={18} weight="bold" aria-hidden="true"/></summary>
              <ol className="eb-why__list">{detail.history.map((event, index) => <li key={event.revision + '-' + index}><strong>{event.label}</strong><time dateTime={event.at}>{stamp(event.at, timeZone)}</time>
                <HistoryTime title="Offered" slot={event.offered}/><HistoryTime title="Requested" slot={event.requested}/></li>)}</ol>
            </details></BCard>
            : <BCard><BText>No recorded history is available for this request.</BText></BCard>}
        </> : <BCard><BText status>This request isn’t available to your current account. Return to your requests to see what is available.</BText></BCard>}
      </>)}
  </>;
}
