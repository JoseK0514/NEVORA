'use client';

import Link from 'next/link';
import type {ReactNode} from 'react';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {ClipboardTextIcon} from '@phosphor-icons/react/dist/ssr/ClipboardText';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {UserMinusIcon} from '@phosphor-icons/react/dist/ssr/UserMinus';
import {CalendarMinusIcon} from '@phosphor-icons/react/dist/ssr/CalendarMinus';
import {BButtonLink, BCard, BChip, BHero, BIcon, BList, BLive, BRow, BScreen, BSeg, BStack, BState, type BLiveItem, type BStateKind, type BTone} from '../owner-b/b-kit';
import {Dotted} from './parts';
import {accountCopy} from './account-copy';
import {REQUESTS_COPY, requestsCopy, pillIn} from './requests-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {useEmployeeDevice} from '../employee-mobile/device-owner';
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
export const bPillText = (text: string, lang: 'en' | 'es' = 'en') => pillIn(text === 'Waiting on teammate' ? 'With teammate' : text, lang);

export type BRequestKind = 'timeOff' | 'shift' | 'callout';
/** What a request is, as a grey icon (teal where the row opens, EM-017). Phase 9 (spec 3.6): the navigation's glyph per
 * concept: CalendarMinus for time off, ArrowsLeftRight for a swap, cover or pickup, UserMinus for can't work. */
export function RequestTypeIcon({kind}: {kind: BRequestKind}) {
  const Icon = kind === 'timeOff' ? CalendarMinusIcon : kind === 'callout' ? UserMinusIcon : ArrowsLeftRightIcon;
  return <BIcon tone="grey"><Icon weight="bold"/></BIcon>;
}

export type BRequestRow = {key: string; href: string; kind: BRequestKind; title: string; sub: string; chip: {tone: BTone; text: string}};
/** One request: its type icon, name, dates, then the status chip and a chevron, all one link. */
export function RequestRowB({row}: {row: BRequestRow}) {
  const lang = usePortalLang();
  return <BRow href={row.href} lead={<RequestTypeIcon kind={row.kind}/>} title={row.title} sub={<Dotted text={row.sub}/>}
    end={<BChip tone={row.chip.tone}>{pillIn(row.chip.text, lang)}</BChip>} chevron/>;
}

/** The read's state in a card: what is happening, then Sign in or Try again (never both, nothing while it checks). */
/** Review B2 (NV-075): the shared state card (icon circle, one line, one teal pill). Without `kind`: signed out is locked,
 * a retry means it failed, otherwise it is still checking. */
export function BStateCard({text, denied, retry, busy, label, kind}: {text: ReactNode; denied?: boolean; retry?: (() => void) | null; busy?: boolean; label?: string; kind?: BStateKind}) {
  const look: BStateKind = kind ?? (denied ? 'locked' : retry ? 'failed' : 'loading');
  const copy = requestsCopy(usePortalLang());
  return <BCard label={label}>
    <BState kind={look} line={text} action={denied ? {label: copy.signIn, href: '/login'} : retry ? {label: copy.tryAgain, onClick: retry, busy} : undefined}/>
  </BCard>;
}

/** A centred empty state: a 48px grey icon, what is missing, then where it will appear. */
export function BEmpty({icon, title, sub}: {icon: ReactNode; title: ReactNode; sub?: ReactNode}) {
  return <div className="eb-empty"><BIcon tone="grey">{icon}</BIcon><p className="eb-empty__t">{title}</p>{sub ? <p className="eb-empty__s">{sub}</p> : null}</div>;
}

/** Open shifts with nothing to pick up, the same on Schedule's and Pick up and swap's Open shifts. */
export function OpenShiftsEmptyB() {
  // Review B6 (NV-158): the link shows only where this device can get alerts (the workplace has them on and the shell's
  // device read answered); otherwise it would lead to "Your workplace hasn't turned on device alerts".
  const device = useEmployeeDevice()?.snapshot;
  const alerts = !!device && device.state !== 'unavailable';
  const copy = requestsCopy(usePortalLang());
  return <><BEmpty icon={<CalendarBlankIcon weight="bold"/>} title={copy.noOpenShiftsNow} sub={copy.noOpenShiftsSub}/>
    {/* Review B2 (NV-158): "device", since it shows on computers too. */}
    {alerts ? <Link className="es-empty-state__a" href="/app/profile/device-alerts">{copy.getAlerts}<CaretRightIcon size={16} weight="bold" aria-hidden="true"/></Link> : null}</>;
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
  // Review B2 (NV-034): Waiting counts your own requests; a swap that needs your answer has its own card and figure.
  // Phase 8 (review C, row 38): amber marks what waits on you (Needs your answer), not what waits on others.
  const copy = requestsCopy(usePortalLang());
  const figures: BLiveItem[] = waiting ? [{label: copy.waiting, value: waiting.length, meta: copy.waitingMeta},
    ...(typeof answer === 'number' ? [{label: copy.needsYourAnswer, dot: answer ? 'warn' as const : undefined, value: answer, meta: copy.answerMeta(answer)}] : [])] : [];
  return <BScreen>
    {/* Desktop: Request time off is the band's white action and the band counts what's waiting (eb-desk); the phone keeps
      * its full-width button (eb-phone). */}
    <BHero title={copy.requests} titleId="b-requests-title" sub={sub}
      right={newHref ? <span className="eb-desk"><BButtonLink href={newHref} kind="white"><PlusIcon size={16} weight="bold" aria-hidden="true"/>{copy.requestTimeOff}</BButtonLink></span> : undefined}>
      {newHref ? <div className="b-hpad eb-phone"><BButtonLink href={newHref} kind="white" full><PlusIcon size={18} weight="bold" aria-hidden="true"/>{copy.requestTimeOff}</BButtonLink></div> : null}
      {figures.length ? <div className="eb-desk"><BLive label={copy.atAGlance} items={figures}/></div> : null}
    </BHero>
    <BStack>
      {state ?? null}
      {waiting && extraCount && waitingExtra ? <BCard id="b-requests-answer" title={copy.swapsForYou} count={extraCount}>{waitingExtra}</BCard> : null}
      {waiting ? <BCard id="b-requests-waiting" title={forManager && waiting.length ? copy.waitingForManager : copy.waiting} count={waiting.length || undefined}>
        {extraCount ? null : waitingExtra ?? null}
        {waiting.length ? <BList>{waiting.map(row => <RequestRowB key={row.key} row={row}/>)}</BList>
          : waitingExtra && !extraCount ? null : <BEmpty icon={<ClipboardTextIcon weight="bold"/>} title={copy.nothingWaiting} sub={copy.nothingWaitingSub}/>}
      </BCard> : null}
      {decided && decided.length ? <BCard id="b-requests-decided" title={copy.decided} link={decidedHref ? {href: decidedHref, label: copy.seeAll, aria: copy.seeAllDecided} : undefined}>
        <BList>{decided.map(row => <RequestRowB key={row.key} row={row}/>)}</BList>
      </BCard> : null}
      {/* Review B6 (NV-279): phones get the same way to Pick up and swap (under Decided); the second row says what it
        * does and opens Schedule asking for the shift. */}
      {shiftRequests ? <div className="eb-shiftreq"><BCard title={copy.shiftRequests}><BList>
        {/* Round 2 (R5): both rows open something, so both are teal circles (grey is for facts that do not open), and both
          * carry the swap arrows, the one glyph for shift requests (Help's "Swap or give away a shift" has it too). */}
        <BRow href="/app/exchange" lead={<BIcon tone="teal"><ArrowsLeftRightIcon weight="bold"/></BIcon>} title={copy.pickUpAndSwap} sub={copy.pickUpAndSwapSub}/>
        <BRow href="/app/schedule?intent=swap" lead={<BIcon tone="teal"><ArrowsLeftRightIcon weight="bold"/></BIcon>} title={copy.swapOrGiveAway} sub={copy.chooseOneShift}/>
      </BList></BCard></div> : null}
    </BStack>
  </BScreen>;
}

/** Swaps addressed to you, inside the Waiting card: a row when some need your answer, a retry when they couldn't be checked. */
export function IncomingB({count, onRetry}: {count: number | null; onRetry: () => void}) {
  const lang = usePortalLang(), copy = requestsCopy(lang);
  if (count === null) return <div className="eb-inline"><span role="status">{copy.swapsCouldntCheck} <Link className="eb-inline__a" href="/app/exchange?tab=foryou">{copy.openSwapsForYou}</Link></span>
    <button className="eb-inline__b" type="button" onClick={onRetry}>{copy.tryAgain}</button></div>;
  return count ? <BList label={copy.needsYourAnswer}><BRow href="/app/exchange?tab=foryou" lead={<BIcon tone="amber"><ArrowsLeftRightIcon weight="bold"/></BIcon>}
    // Phase 8 (review C, row 17): the same words as the notification for it ("Swap request waiting for you").
    // Round 2 (R4): no filler line under it. This read holds only how many swaps wait (`incoming`), not who sent them,
    // the shift's day or the answer-by time, so the row says no more than the title, the chip and Review.
    title={count === 1 ? accountCopy(lang).swapForYou : copy.swapsNeedAnswer(count)} chip={<BChip tone="amber">{copy.needsYourAnswer}</BChip>}
    trail={<BButtonLink href="/app/exchange?tab=foryou" kind="ghost" label={count === 1 ? copy.reviewSwap : copy.reviewSwaps}>{copy.review}</BButtonLink>}/></BList> : null;
}

/** A failed part of a read, said inside its card with a quiet Try again. */
export function InlineRetryB({text, onRetry, busy}: {text: string; onRetry: () => void; busy?: boolean}) {
  const copy = requestsCopy(usePortalLang());
  return <div className="eb-inline"><span role="status">{text}</span><button className="eb-inline__b" type="button" disabled={busy} onClick={onRetry}>{copy.tryAgain}</button></div>;
}

/* ---------- Pick up and swap (Open shifts, For you, My requests) ---------- */

export type ExchangeTab = 'open' | 'foryou' | 'mine';
export const EXCHANGE_TABS: {key: ExchangeTab; label: string; href: string}[] = [
  {key: 'open', label: REQUESTS_COPY.en.openShifts, href: '/app/exchange'},
  {key: 'foryou', label: REQUESTS_COPY.en.forYou, href: '/app/exchange?tab=foryou'},
  {key: 'mine', label: REQUESTS_COPY.en.myRequests, href: '/app/exchange?tab=requests'},
];
const tabLabel = (key: ExchangeTab, lang: 'en' | 'es') => {
  const copy = requestsCopy(lang);
  return key === 'open' ? copy.openShifts : key === 'foryou' ? copy.forYou : copy.myRequests;
};

/** The hero of Pick up and swap: back to Schedule, the title, and its three places on glass (left out when shift requests
 * are off for the company). */
export function ExchangeHeroB({tab, tabs = true, back = '/app/schedule', counts}: {tab: ExchangeTab; tabs?: boolean; back?: string;
  /** Desktop: what each place holds, where this page's read knows it ("Open shifts · 2"); phones show the names alone. */
  counts?: Partial<Record<ExchangeTab, number | null>>}) {
  const lang = usePortalLang(), copy = requestsCopy(lang);
  return <BHero back={{href: back, label: copy.schedule}} title={copy.pickUpAndSwap} titleId="b-exchange-title">
    {tabs ? <BSeg label={copy.pickUpAndSwap} items={EXCHANGE_TABS.map(item => {
      const count = counts?.[item.key], name = tabLabel(item.key, lang);
      // Review B6 (NV-165, NV-281): the count is a small pill beside the label at every width; For you's is amber, since
      // it holds swaps that need your answer.
      return {key: item.key, label: typeof count === 'number' && count > 0 ? <>{name}<span className={item.key === 'foryou' ? 'eb-segn eb-segn--amber' : 'eb-segn'}><span className="b-sr">, </span>{count}</span></> : name, href: item.href, current: item.key === tab};
    })}/> : null}
  </BHero>;
}

/** The way to start a swap or cover offer: from a shift on your own schedule. */
export function MyScheduleCardB() {
  const copy = requestsCopy(usePortalLang());
  return <BCard label={copy.swapOrGiveAway}><BList><BRow href="/app/schedule?intent=swap" lead={<BIcon tone="teal"><ArrowsLeftRightIcon weight="bold"/></BIcon>} title={copy.swapOrGiveAway} sub={copy.chooseOneShift}/></BList></BCard>;
}

/** Marks a form's screen (Request time off, Swap shift, Offer for cover, Can't work): while it shows, the shell hides the
 * tab bar, the bell and the avatar (requests.css). */
export function FormMark() {
  return <span className="eb-form" hidden/>;
}

/* ---------- The phone's first frame ---------- */

export type BWaitPage = 'hub' | 'open' | 'foryou' | 'mine' | 'detail-foryou' | 'detail-mine' | 'swap' | 'cover' | 'callout';

/** Before the phone's private read starts (server render and hydration), the page's hero and a loading card, so a phone
 * never shows the desktop layout first. Shown on phones only; it carries no private data. */
export function RequestsWaitB({page, text}: {page: BWaitPage; text: string}) {
  const copy = requestsCopy(usePortalLang());
  const creationTitles = {swap: copy.swapShift, cover: copy.offerForCover, callout: copy.cantWorkThisShift};
  const hero = page === 'hub' ? <BHero title={copy.requests} sub={copy.hubSub}/>
    : page === 'open' || page === 'foryou' || page === 'mine' ? <ExchangeHeroB tab={page}/>
    : page === 'detail-foryou' || page === 'detail-mine' ? <BHero back={{href: page === 'detail-foryou' ? '/app/exchange?tab=foryou' : '/app/exchange?tab=requests', label: page === 'detail-foryou' ? copy.forYou : copy.myRequests}} title={copy.requestDetails}/>
    : <BHero back={{href: '/app/schedule', label: copy.cancel, close: true}} title={creationTitles[page]}/>;
  return <div className="c-page eb-sib" data-corp="">
    <BScreen back={page !== 'hub'}>
      {page === 'swap' || page === 'cover' || page === 'callout' ? <FormMark/> : null}
      {hero}
      <BStack><BCard><p className="b-state" role="status">{text}</p></BCard></BStack>
    </BScreen>
  </div>;
}
