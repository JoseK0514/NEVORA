'use client';

import Link from 'next/link';
import type {ReactNode} from 'react';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {ClipboardTextIcon} from '@phosphor-icons/react/dist/ssr/ClipboardText';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {ProhibitIcon} from '@phosphor-icons/react/dist/ssr/Prohibit';
import {SunIcon} from '@phosphor-icons/react/dist/ssr/Sun';
import {BButton, BButtonLink, BCard, BChip, BHero, BIcon, BList, BLive, BRow, BScreen, BSeg, BStack, type BLiveItem, type BTone} from '../owner-b/b-kit';
import {Dotted} from './parts';
import './employee-b.css';
import './requests.css';

/* Requests and shifts on the Employee phone, Direction B (Jose approved the mock "Employee mobile, Direction B", Nov 6,
 * 2026): the Requests tab, the loading screens the phone shows before its private read, and the pieces shared by Time
 * off and Pick up and swap. Presentation only: callers pass the rows, links, states and actions their own reads and
 * operations already give the corporate view; on tablets and desktop these screens are not shown. */

/** Today's request tones in the B chip palette (board E-Requests): Approved and Completed green, the waiting states amber,
 * Declined, Withdrawn, Cancelled, Expired and Recorded grey (a decision isn't an error). */
export const bTone = (tone: string): BTone => tone === 'teal' ? 'green' : tone === 'amber' ? 'amber' : 'grey';

/** A chip's words on the phone: the hub's, shortened where they would squeeze the name beside them. */
export const bPillText = (text: string) => text === 'Waiting on teammate' ? 'With teammate' : text;

export type BRequestKind = 'timeOff' | 'shift' | 'callout';
/** What a request is, as a grey icon: Sun for time off, ArrowsLeftRight for a swap, cover or pickup, Prohibit for can't work. */
export function RequestTypeIcon({kind}: {kind: BRequestKind}) {
  const Icon = kind === 'timeOff' ? SunIcon : kind === 'callout' ? ProhibitIcon : ArrowsLeftRightIcon;
  return <BIcon tone="grey"><Icon weight="bold"/></BIcon>;
}

export type BRequestRow = {key: string; href: string; kind: BRequestKind; title: string; sub: string; chip: {tone: BTone; text: string}};
/** One request: its type icon, name, dates, then the status chip and a chevron, all one link. */
export function RequestRowB({row}: {row: BRequestRow}) {
  return <BRow href={row.href} lead={<RequestTypeIcon kind={row.kind}/>} title={row.title} sub={<Dotted text={row.sub}/>}
    end={<BChip tone={row.chip.tone}>{row.chip.text}</BChip>} chevron label={`${row.title}, ${row.sub}, ${row.chip.text}`}/>;
}

/** The read's state in a card: what is happening, then Sign in or Try again (never both, nothing while it checks). */
export function BStateCard({text, denied, retry, busy, label}: {text: ReactNode; denied?: boolean; retry?: (() => void) | null; busy?: boolean; label?: string}) {
  return <BCard label={label}>
    <div className="eb-status">
      <p className="b-state" role="status">{text}</p>
      {denied ? <BButtonLink href="/login" kind="teal" full>Sign in</BButtonLink>
        : retry ? <BButton kind="quiet" full onClick={retry} disabled={busy}>{busy ? 'Checking…' : 'Try again'}</BButton> : null}
    </div>
  </BCard>;
}

/** A centred empty state: a 48px grey icon, what is missing, then where it will appear. */
export function BEmpty({icon, title, sub}: {icon: ReactNode; title: ReactNode; sub?: ReactNode}) {
  return <div className="eb-empty"><BIcon tone="grey">{icon}</BIcon><p className="eb-empty__t">{title}</p>{sub ? <p className="eb-empty__s">{sub}</p> : null}</div>;
}

/** Open shifts with nothing to pick up, the same on Schedule's and Pick up and swap's Open shifts. */
export function OpenShiftsEmptyB() {
  return <><BEmpty icon={<CalendarBlankIcon weight="bold"/>} title="No open shifts right now" sub="When a teammate offers a shift you can work, it shows here."/>
    <Link className="es-empty-state__a" href="/app/profile/device-alerts">Get alerts on this phone<CaretRightIcon size={15} weight="bold" aria-hidden="true"/></Link></>;
}

/** A plain paragraph inside a card (a notice, a reason). */
export function BText({children, status}: {children: ReactNode; status?: boolean}) {
  return <p className="eb-text" role={status ? 'status' : undefined}>{children}</p>;
}

/* ---------- Requests (the tab) ---------- */

export type RequestsHubBProps = {
  sub: string;
  /** Request time off, when time off is on. */
  newHref: string | null;
  /** null until the read is shown (loading, paused, failed); `state` says why. */
  waiting: BRequestRow[] | null;
  decided: BRequestRow[] | null;
  decidedHref: string | null;
  /** Every waiting row waits on the manager (the card then says so once). */
  forManager: boolean;
  /** Swaps that need your answer, or why they couldn't be checked, inside the Waiting card. */
  waitingExtra?: ReactNode;
  /** How many of those swaps there are (counted in the Waiting card's pill). */
  extraCount?: number;
  state?: ReactNode;
  /** Desktop: swaps waiting on your answer (the band's second figure), when shift requests are on. */
  answer?: number | null;
  /** Desktop: the Shift requests card (Pick up and swap, My schedule), when shift requests are on. */
  shiftRequests?: boolean;
};

export function RequestsHubB({sub, newHref, waiting, decided, decidedHref, forManager, waitingExtra, extraCount = 0, state, answer, shiftRequests}: RequestsHubBProps) {
  const figures: BLiveItem[] = waiting ? [{label: 'Waiting', dot: 'warn', value: waiting.length + extraCount, meta: 'on your manager or a teammate'},
    ...(typeof answer === 'number' ? [{label: 'Needs your answer', value: answer, meta: answer === 1 ? 'a swap from a teammate' : 'swaps from teammates'}] : [])] : [];
  return <BScreen>
    {/* Desktop: Request time off is the band's white action and the band counts what's waiting (eb-desk); the phone keeps
      * its full-width button (eb-phone). */}
    <BHero title="Requests" titleId="b-requests-title" sub={sub}
      right={newHref ? <span className="eb-desk"><BButtonLink href={newHref} kind="white"><PlusIcon size={17} weight="bold" aria-hidden="true"/>Request time off</BButtonLink></span> : undefined}>
      {newHref ? <div className="b-hpad eb-phone"><BButtonLink href={newHref} kind="white" full><PlusIcon size={18} weight="bold" aria-hidden="true"/>Request time off</BButtonLink></div> : null}
      {figures.length ? <div className="eb-desk"><BLive label="Your requests at a glance" items={figures}/></div> : null}
    </BHero>
    <BStack>
      {state ?? null}
      {waiting ? <BCard id="b-requests-waiting" title={forManager && waiting.length && !extraCount ? 'Waiting for your manager' : 'Waiting'} count={waiting.length + extraCount || undefined}>
        {waitingExtra ?? null}
        {waiting.length ? <BList>{waiting.map(row => <RequestRowB key={row.key} row={row}/>)}</BList>
          : waitingExtra ? null : <BEmpty icon={<ClipboardTextIcon weight="bold"/>} title="Nothing waiting right now" sub="Requests you send show here until they’re decided."/>}
      </BCard> : null}
      {decided && decided.length ? <BCard id="b-requests-decided" title="Decided" link={decidedHref ? {href: decidedHref, label: 'See all', aria: 'See all decided requests'} : undefined}>
        <BList>{decided.map(row => <RequestRowB key={row.key} row={row}/>)}</BList>
      </BCard> : null}
      {shiftRequests ? <div className="eb-desk eb-shiftreq"><BCard title="Shift requests"><BList>
        <BRow href="/app/exchange" lead={<BIcon tone="grey"><ArrowsLeftRightIcon weight="bold"/></BIcon>} title="Pick up and swap" sub="Open shifts, swaps for you, your requests"/>
        <BRow href="/app/schedule" lead={<BIcon tone="grey"><CalendarBlankIcon weight="bold"/></BIcon>} title="My schedule" sub="Start a swap or cover offer"/>
      </BList></BCard></div> : null}
    </BStack>
  </BScreen>;
}

/** Swaps addressed to you, inside the Waiting card: a row when some need your answer, a retry when they couldn't be checked. */
export function IncomingB({count, onRetry}: {count: number | null; onRetry: () => void}) {
  if (count === null) return <div className="eb-inline"><span role="status">Swaps for you couldn’t be checked. <Link className="eb-inline__a" href="/app/exchange?tab=foryou">Open swaps for you</Link></span>
    <button className="eb-inline__b" type="button" onClick={onRetry}>Try again</button></div>;
  return count ? <BList label="Needs your answer"><BRow href="/app/exchange?tab=foryou" lead={<BIcon tone="teal"><ArrowsLeftRightIcon weight="bold"/></BIcon>}
    title={count === 1 ? 'A teammate requested a swap' : `${count} swaps need your answer`} sub="Review the shifts before responding"/></BList> : null;
}

/** A failed part of a read, said inside its card with a quiet Try again. */
export function InlineRetryB({text, onRetry, busy}: {text: string; onRetry: () => void; busy?: boolean}) {
  return <div className="eb-inline"><span role="status">{text}</span><button className="eb-inline__b" type="button" disabled={busy} onClick={onRetry}>Try again</button></div>;
}

/* ---------- Pick up and swap (Open shifts, For you, My requests) ---------- */

export type ExchangeTab = 'open' | 'foryou' | 'mine';
export const EXCHANGE_TABS: {key: ExchangeTab; label: string; href: string}[] = [
  {key: 'open', label: 'Open shifts', href: '/app/exchange'},
  {key: 'foryou', label: 'For you', href: '/app/exchange?tab=foryou'},
  {key: 'mine', label: 'My requests', href: '/app/exchange?tab=requests'},
];

/** The hero of Pick up and swap: back to Schedule, the title, and its three places on glass (left out when shift requests
 * are off for the company). */
export function ExchangeHeroB({tab, tabs = true, back = '/app/schedule'}: {tab: ExchangeTab; tabs?: boolean; back?: string}) {
  return <BHero back={{href: back, label: 'Schedule'}} title="Pick up and swap" titleId="b-exchange-title">
    {tabs ? <BSeg label="Pick up and swap" items={EXCHANGE_TABS.map(item => ({key: item.key, label: item.label, href: item.href, current: item.key === tab}))}/> : null}
  </BHero>;
}

/** The way to start a swap or cover offer: from a shift on your own schedule. */
export function MyScheduleCardB() {
  return <BCard label="My schedule"><BList><BRow href="/app/schedule" lead={<BIcon tone="grey"><CalendarBlankIcon weight="bold"/></BIcon>} title="My schedule" sub="Start a swap or cover offer"/></BList></BCard>;
}

/** Marks a form's screen (Request time off, Swap shift, Offer for cover, Can't work): while it shows, the shell hides the
 * tab bar, the bell and the avatar (requests.css). */
export function FormMark() {
  return <span className="eb-form" hidden/>;
}

/* ---------- The phone's first frame ---------- */

export type BWaitPage = 'hub' | 'open' | 'foryou' | 'mine' | 'detail-foryou' | 'detail-mine' | 'swap' | 'cover' | 'callout';
const creationTitles = {swap: 'Swap shift', cover: 'Offer for cover', callout: 'Can’t work this shift'};

/** Before the phone's private read starts (server render and hydration), the page's hero and a loading card, so a phone
 * never shows the desktop layout first. Shown on phones only; it carries no private data. */
export function RequestsWaitB({page, text}: {page: BWaitPage; text: string}) {
  const hero = page === 'hub' ? <BHero title="Requests" sub="Time off and shift changes you’ve sent"/>
    : page === 'open' || page === 'foryou' || page === 'mine' ? <ExchangeHeroB tab={page}/>
    : page === 'detail-foryou' || page === 'detail-mine' ? <BHero back={{href: page === 'detail-foryou' ? '/app/exchange?tab=foryou' : '/app/exchange?tab=requests', label: page === 'detail-foryou' ? 'For you' : 'My requests'}} title="Request details"/>
    : <BHero back={{href: '/app/schedule', label: 'Cancel', close: true}} title={creationTitles[page]}/>;
  return <div className="c-page eb-sib" data-corp="">
    <BScreen back={page !== 'hub'}>
      {page === 'swap' || page === 'cover' || page === 'callout' ? <FormMark/> : null}
      {hero}
      <BStack><BCard><p className="b-state" role="status">{text}</p></BCard></BStack>
    </BScreen>
  </div>;
}
