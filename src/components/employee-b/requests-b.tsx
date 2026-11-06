'use client';

import Link from 'next/link';
import type {ReactNode} from 'react';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {ProhibitIcon} from '@phosphor-icons/react/dist/ssr/Prohibit';
import {SunIcon} from '@phosphor-icons/react/dist/ssr/Sun';
import {BButton, BButtonLink, BCard, BChip, BHero, BIcon, BList, BRow, BScreen, BSeg, BStack, type BTone} from '../owner-b/b-kit';
import './employee-b.css';
import './requests.css';

/* Requests and shifts on the Employee phone, Direction B (Jose approved the mock "Employee mobile, Direction B", Nov 6,
 * 2026): the Requests tab, the loading screens the phone shows before its private read, and the pieces shared by Time
 * off and Pick up and swap. Presentation only: callers pass the rows, links, states and actions their own reads and
 * operations already give the corporate view; on tablets and desktop these screens are not shown. */

/** Today's request tones in the B chip palette: Approved and Completed green, Declined red, the waiting states amber,
 * Withdrawn, Cancelled, Expired and Recorded grey. */
export const bTone = (tone: string): BTone => tone === 'teal' ? 'green' : tone === 'amber' ? 'amber' : tone === 'red' ? 'red' : 'grey';

export type BRequestKind = 'timeOff' | 'shift' | 'callout';
/** What a request is, as a grey icon: Sun for time off, ArrowsLeftRight for a swap, cover or pickup, Prohibit for can't work. */
export function RequestTypeIcon({kind}: {kind: BRequestKind}) {
  const Icon = kind === 'timeOff' ? SunIcon : kind === 'callout' ? ProhibitIcon : ArrowsLeftRightIcon;
  return <BIcon tone="grey"><Icon weight="bold"/></BIcon>;
}

export type BRequestRow = {key: string; href: string; kind: BRequestKind; title: string; sub: string; chip: {tone: BTone; text: string}};
/** One request: its type icon, name, dates, then the status chip and a chevron, all one link. */
export function RequestRowB({row}: {row: BRequestRow}) {
  return <BRow href={row.href} lead={<RequestTypeIcon kind={row.kind}/>} title={row.title} sub={row.sub}
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
  state?: ReactNode;
};

export function RequestsHubB({sub, newHref, waiting, decided, decidedHref, forManager, waitingExtra, state}: RequestsHubBProps) {
  return <BScreen>
    <BHero title="Requests" titleId="b-requests-title" sub={sub}>
      {newHref ? <div className="b-hpad"><BButtonLink href={newHref} kind="white" full><PlusIcon size={18} weight="bold" aria-hidden="true"/>Request time off</BButtonLink></div> : null}
    </BHero>
    <BStack>
      {state ?? null}
      {waiting ? <BCard id="b-requests-waiting" title={forManager && waiting.length ? 'Waiting for your manager' : 'Waiting'} count={waiting.length || undefined}>
        {waitingExtra ?? null}
        {waiting.length ? <BList>{waiting.map(row => <RequestRowB key={row.key} row={row}/>)}</BList>
          : waitingExtra ? null : <div className="eb-tof-empty"><p className="eb-tof-empty__t">Nothing waiting right now</p><p className="eb-tof-empty__s">Requests you send show here until they’re decided.</p></div>}
      </BCard> : null}
      {decided && decided.length ? <BCard id="b-requests-decided" title="Decided" link={decidedHref ? {href: decidedHref, label: 'See all', aria: 'See all decided requests'} : undefined}>
        <BList>{decided.map(row => <RequestRowB key={row.key} row={row}/>)}</BList>
      </BCard> : null}
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
