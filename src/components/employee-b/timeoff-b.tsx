'use client';

import Link from 'next/link';
import {dateRange} from '@/lib/duration-format';
import {OwnLeaveNote} from '../leave-staffing/own-leave-note';
import type {ReactNode} from 'react';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {CalendarMinusIcon} from '@phosphor-icons/react/dist/ssr/CalendarMinus';
import {BAvatar, BButtonLink, BCard, BChip, BHero, BIcon, BList, BRow, BScreen, BSeg, BStack, BState} from '../owner-b/b-kit';
import {Dotted} from './parts';
import {BEmpty, BStateCard, BText, FormMark, bTone} from './requests-b';
import {timeOffPill} from '../employee-requests-corp';
import {sentDay, timeOffDates, timeOffDecision, timeOffLength, type TimeOffView} from '../employee-mobile/timeoff-parts';
import {formatTime} from '@/lib/date-utils';
import {keepWhole} from '@/lib/keep-whole';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {requestsCopy, spanIn, type RequestsLang} from './requests-copy';
import './requests.css';

/* Time off on the Employee phone, Direction B: the list (Waiting / Decided on glass), one request, and the request form's
 * page (its form is the corporate view's own, kept once in the page and drawn as this screen's card). Presentation only:
 * the planning read, its states, the withdraw and request operations are the corporate view's. */

const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', ...options});
const weekday = (date: string) => fmt({weekday: 'short'}).format(utc(date));

/** "Nov 12–14", "Oct 30–Nov 2" or "Nov 13" (the app's one date-range form, Nov 21, 2026). */
export function timeOffRange(request: TimeOffView, lang: RequestsLang = 'en') {
  return dateRange(request.startDate, request.endDate, {year: 'never', locale: lang === 'es' ? 'es-PR' : 'en-US'});
}
/** "Thu – Sat · All day · 3 days", "Fri · All day" or "Fri · 9:00 AM – 12:00 PM" (Phase 4, EM-023: a time range already
 * says it is part of the day). */
export function timeOffSpan(request: TimeOffView, lang: RequestsLang = 'en') {
  const days = request.startDate === request.endDate ? weekday(request.startDate) : `${weekday(request.startDate)} – ${weekday(request.endDate)}`;
  const count = Math.round((utc(request.endDate).getTime() - utc(request.startDate).getTime()) / 86_400_000) + 1;
  const copy = requestsCopy(lang);
  const length = request.startTime && request.endTime ? `${formatTime(request.startTime)} – ${formatTime(request.endTime)}` : count > 1 ? `${copy.allDay} · ${copy.days(count)}` : copy.allDay;
  return spanIn(`${days} · ${length}`, lang);
}

export type TimeOffPage = 'list' | 'new' | 'detail';
const listHref = (filter: string) => filter === 'decided' ? '/app/requests?filter=decided' : '/app/requests';

/** The hero: the list has Waiting and Decided on glass; the form closes with Cancel; a request goes back to Requests. */
function TimeOffHero({page, filter, tabs, waiting}: {page: TimeOffPage; filter: string; tabs: boolean;
  /** Phase 4 (EM-023): how many requests wait, for the Waiting tab's count pill; null while the read isn't shown. */
  waiting?: number | null}) {
  const copy = requestsCopy(usePortalLang());
  if (page === 'new') return <BHero back={{href: listHref(filter), label: copy.cancel, close: true}} title={copy.requestTimeOff} titleId="b-timeoff-title"/>;
  // Review B1 (NV-164): Request time off is the band's white action at every width, so it stays even when the list fails.
  return <BHero back={{href: '/app/requests/hub', label: copy.requests}} title={copy.timeOff} titleId="b-timeoff-title"
    right={page === 'list' ? <BButtonLink href="/app/requests?tab=new" kind="white"><PlusIcon size={16} weight="bold" aria-hidden="true"/>{copy.requestTimeOff}</BButtonLink> : undefined}>
    {page === 'list' && tabs ? <BSeg label={copy.timeOffRequests} items={[
      {key: 'waiting', label: waiting ? <>{copy.waiting}<span className="eb-segn"><span className="b-sr">, </span>{waiting}</span></> : copy.waiting, href: '/app/requests', current: filter !== 'decided'},
      {key: 'decided', label: copy.decided, href: '/app/requests?filter=decided', current: filter === 'decided'},
    ]}/> : null}
  </BHero>;
}

function TimeOffRowB({request, filter}: {request: TimeOffView; filter: string}) {
  const lang = usePortalLang();
  const pill = timeOffPill(request.status, lang);
  return <BRow href={`/app/requests?requestId=${encodeURIComponent(request.id)}${filter === 'decided' ? '&filter=decided' : ''}`}
    lead={<BIcon tone="grey"><CalendarMinusIcon weight="bold"/></BIcon>} title={keepWhole(timeOffRange(request, lang))} sub={<Dotted text={timeOffSpan(request, lang)}/>}
    // Phase 4 (EM-023): every row ends with its state before the chevron, so "did it go through?" is answered on the row:
    // amber Waiting, green Approved, grey Declined or Withdrawn. (Review B1, NV-280, had left the Waiting tab's rows bare.)
    end={<BChip tone={bTone(pill.tone)}>{pill.text}</BChip>} chevron/>;
}

/** One request: its dates as the title with its status chip (amber Waiting, as in the list), then its length, when it was
 * sent and the person's note, then who it waits on or who decided it (review B6, NV-093: the dates lead, not "Sent"). */
function RequestCardB({request, zone}: {request: TimeOffView; zone: string}) {
  const lang = usePortalLang(), copy = requestsCopy(lang);
  const sent = request.createdAt ? sentDay(request.createdAt, zone, lang) : '';
  const {by, title, detail} = timeOffDecision(request, zone, lang);
  const pill = timeOffPill(request.status, lang);
  return <BCard id="b-timeoff-request" title={keepWhole(timeOffDates(request, lang))} chip={<BChip tone={bTone(pill.tone)}>{pill.text}</BChip>}>
    <div className="eb-tof-req">
      <p className="eb-tof-req__l"><Dotted text={[keepWhole(timeOffLength(request, lang)), sent ? keepWhole(copy.sent(sent)) : null, request.note || null].filter(Boolean).join(' · ')}/></p>
    </div>
    <BList><BRow lead={by ? <BAvatar name={by}/> : undefined} title={keepWhole(title)} sub={detail ?? undefined}/></BList>
  </BCard>;
}

export function TimeOffB({page, filter, state, enabled, earlier, requests, request, zone, waiting}: {
  page: TimeOffPage; filter: string;
  /** The planning read's state card while it isn't shown. */
  state: ReactNode;
  /** Time off is on for the company; null while unknown. */
  enabled: boolean | null;
  /** An earlier submission still needs checking (shown on the list and a request's page). */
  earlier: boolean;
  /** The list's requests (already filtered to Waiting or Decided). */
  requests: TimeOffView[];
  /** A request's page: the request, or null when it isn't available to the account. */
  request?: TimeOffView | null;
  zone: string;
  /** How many requests wait on a decision (the Waiting tab's count), when the read is shown. */
  waiting?: number | null;
}) {
  const copy = requestsCopy(usePortalLang());
  // The form's page: its card is the form itself, kept once in the page (b-keep) and lifted over this hero.
  const stack = state ?? (enabled === false ? <BCard><BText status>{copy.noTimeOffInNevora}</BText></BCard> : page === 'new' ? null : <>
    {earlier ? <BCard><div className="eb-status"><p className="b-state">{copy.earlierSubmission}</p><Link className="b-link" href="/app/requests?tab=new">{copy.returnToSubmission}</Link></div></BCard> : null}
    {page === 'list' ? <BCard label={filter === 'decided' ? copy.decidedRequests : copy.waitingRequests}>
      {requests.length ? null : <BEmpty icon={<CalendarMinusIcon weight="bold"/>} title={filter === 'decided' ? copy.noDecisionsYet : copy.nothingWaiting}
        sub={filter === 'decided' ? copy.decidedEmptySub : copy.waitingEmptySub}/>}
      <BList>
        {/* Review B2 (NV-140): waiting soonest first; decided most recently decided first. */}
        {[...requests].sort(filter === 'decided' ? (a, b) => (b.reviewedAt ?? '').localeCompare(a.reviewedAt ?? '') : (a, b) => a.startDate.localeCompare(b.startDate)).map(item => <TimeOffRowB key={item.id} request={item} filter={filter}/>)}
      </BList>
    </BCard>
      : request ? <><RequestCardB request={request} zone={zone}/><OwnLeaveNote request={request}/></>
      // Review B2 (NV-139): the shared state card, with the way back as a pill.
      : <BCard><BState kind="locked" line={copy.requestNotAvailable} action={{label: copy.backToTimeOff, href: '/app/requests'}}/></BCard>}
  </>);
  return <BScreen back>
    {page === 'new' ? <FormMark/> : null}
    <TimeOffHero page={page} filter={filter} tabs={enabled !== false} waiting={waiting}/>
    {stack ? <BStack>{stack}</BStack> : null}
  </BScreen>;
}

/** The planning read's state, said in a card: paused, denied (Sign in), checking, or failed (Try again). */
export function TimeOffStateB({paused, denied, refreshing, onRetry}: {paused: boolean; denied: boolean; refreshing: boolean; onRetry: () => void}) {
  const copy = requestsCopy(usePortalLang());
  return <BStateCard label={copy.timeOff} text={paused ? copy.timeOffPaused : denied ? copy.accessChanged : refreshing ? copy.loadingTimeOff : copy.timeOffDidntLoad}
    denied={denied} retry={refreshing || paused ? null : onRetry} kind={paused ? 'paused' : undefined}/>;
}

/** The phone's first frame on Time off, before its private read starts: the page's hero, checking. No private data. */
export function TimeOffWaitB({selection, filter}: {selection: string; filter: string}) {
  const page: TimeOffPage = selection === 'new' ? 'new' : selection === 'list' ? 'list' : 'detail';
  const copy = requestsCopy(usePortalLang());
  return <BScreen back>
    {page === 'new' ? <FormMark/> : null}
    <TimeOffHero page={page} filter={filter} tabs/>
    <BStack><BCard><p className="b-state" role="status">{copy.loadingTimeOff}</p></BCard></BStack>
  </BScreen>;
}
