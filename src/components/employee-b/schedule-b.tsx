import Link from 'next/link';
import type {ReactNode} from 'react';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {ClockCounterClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {BButtonLink, BCard, BChip, BHero, BIcon, BList, BRow, BScreen, BStack} from '../owner-b/b-kit';
import {BCardNote, BDay, Dotted} from './parts';
import {ExchangeHeroB, OpenShiftsEmptyB} from './requests-b';
import {workCopy} from './work-copy';
import './schedule.css';

const t = workCopy();

/* Employee Schedule on the phone, Direction B (Jose approved the mock, Nov 6, 2026): the week on glass, open shifts to
 * pick up, then the shifts as rows that open the same shift sheet. Presentation only: the corporate view computes every
 * value, link and state and passes them here; this screen shows on phones. */

export type ScheduleBDay = {date: string; short: string; day: number; today: boolean; past: boolean; selected: boolean; assigned: boolean; href: string; label: string};
export type ScheduleBProps = {
  sub: ReactNode;
  range: ReactNode;
  confirmed: boolean;
  todayHref: string | null;
  prevHref: string;
  nextHref: string;
  days: ScheduleBDay[];
  /** The weekly confirmation, when the manager asked for one and it isn't done yet. */
  confirm: {title: string; detail: string; /** Phones: the same reason in fewer words, so the row keeps one line. */ detailShort?: string; control: ReactNode} | null;
  celebration: ReactNode;
  changes: ReactNode;
  swap: {title: string; detail: string; doneHref: string} | null;
  error: ReactNode;
  receipt: ReactNode;
  open: {count: number | null; detail: string; label: string; href: string} | null;
  unavailable: {retryHref: string} | null;
  list: {label: string; wholeWeekHref: string | null; rows: ReactNode; empty: string | null;
    /** Phase 4 (EM-013): on desktop the card beside "This week" shows one day (today, else the week's first shift day)
     * instead of repeating the days of the week card above it. Its rows are the ones whose day lead carries `pick`. */
    wide?: {title: string; meta?: string | null; empty: string | null} | null};
  unpublished: ReactNode;
  /** Desktop only: the whole week as seven days, each with its shifts, and the week's summary line. */
  weekCard?: {days: WeekCardDay[]; summary: ReactNode} | null;
  /** A Lead who leads every shift this week: "You lead all 7 shifts", said once (review B6, NV-289). */
  leadNote?: string | null;
  /** The week is confirmed: a green card where Confirm was (review B6, NV-152). */
  done?: {title: string; detail: string; /** Phones: the line without the week's dates (the strip above shows them). */ detailShort?: string} | null;
};
export type WeekCardShift = {key: string; time: string; position: string | null; place: string; kind: 'past' | 'now' | 'up'; chip: ReactNode; label: string; lead?: boolean;
  /** The chip is "Tomorrow" (a tablet's narrow day leaves it out: the next column is tomorrow). */
  tomorrow?: boolean};
export type WeekCardDay = {date: string; short: string; day: number; today: boolean; selected: boolean; href: string; label: string; shifts: WeekCardShift[];
  /** The day the desktop day card shows when no day is chosen and it isn't today (another week's first shift day). */ wide?: boolean};

/** Desktop: "Your week", seven columns; a day opens as the chosen day (the strip's own link). The week's changes sit in the
 * card's footer beside its summary. */
function WeekCard({days, summary, leadNote}: {days: WeekCardDay[]; summary: ReactNode; leadNote?: string | null}) {
  return <section className="b-card eb-desk eb-wkc" aria-labelledby="b-week-card-h">
    <div className="b-card__h"><h2 id="b-week-card-h">Your week</h2>{leadNote ? <span className="b-card__meta">{leadNote}</span> : null}</div>
    <ol className="eb-wk">{days.map(day => <li key={day.date} className={['eb-wd', day.today ? 'is-today' : '', day.selected ? 'is-on' : '', day.wide ? 'is-wide' : ''].filter(Boolean).join(' ')}>
      <span className="eb-wd__h" aria-hidden="true"><span>{day.short}</span><b>{day.day}</b></span>
      {/* One stop per shift (a day off is one stop too), each opening that day. */}
      {day.shifts.length ? day.shifts.map(shift => <Link key={shift.key} className={`eb-wsh eb-wsh--${shift.kind}`} href={day.href} scroll={false} aria-label={shift.label}>
        {/* Phase 4 (EM-014): each half of the range stays whole; if the block is too narrow the line breaks before the dash. */}
        <b>{shift.time.includes(' – ') ? <><span className="eb-wsh__t">{shift.time.split(' – ')[0]}</span> <span className="eb-wsh__t">– {shift.time.split(' – ')[1]}</span></> : <span className="eb-wsh__t">{shift.time}</span>}</b>{shift.position ? <span className="eb-wsh__l">{shift.position}</span> : null}<span className="eb-wsh__l">{shift.place}</span>
        {/* Review B6 (NV-146): the status chip and a Lead's marker share one row at the block's foot ("Lead" where a
          * tablet's day is narrow). */}
        {shift.chip || shift.lead ? <span className={shift.tomorrow ? 'eb-wsh__chips eb-wsh__chips--tomorrow' : 'eb-wsh__chips'}>{shift.chip}
          {shift.lead ? <span className="b-chip b-chip--grey eb-wsh__lead"><span className="eb-wsh__lead-l">Shift lead</span><span className="eb-wsh__lead-s">Lead</span></span> : null}</span> : null}
      </Link>) : <Link className="eb-wsh eb-wsh--off" href={day.href} scroll={false} aria-label={day.label}/>}
    </li>)}</ol>
    {/* Phase 4 (EM-018): what isn't published yet qualifies this card, so it is the card's footer note. What changed
      * moved to the "This week" card (EM-013). */}
    {summary ? <p className="eb-cardnote eb-wkc__note">{summary}</p> : null}
  </section>;
}

function Week({range, confirmed, todayHref, prevHref, nextHref, days}: Pick<ScheduleBProps, 'range' | 'confirmed' | 'todayHref' | 'prevHref' | 'nextHref' | 'days'>) {
  return <div className="b-week b-glass">
    <div className="b-week__h">
      <span>{range}{confirmed ? <span className="b-chip b-chip--ok">Confirmed</span> : null}</span>
      <span>
        {todayHref ? <Link className="es-today" href={todayHref}>Today</Link> : null}
        <Link className="b-week__arrow" href={prevHref} aria-label="Previous week"><CaretLeftIcon size={18} weight="bold" aria-hidden="true"/></Link>
        <Link className="b-week__arrow" href={nextHref} aria-label="Next week"><CaretRightIcon size={18} weight="bold" aria-hidden="true"/></Link>
      </span>
    </div>
    <nav className="b-week__days" aria-label="Days in this week">
      {days.map(day => <Link key={day.date} href={day.href} scroll={false} aria-label={day.label} aria-current={day.today ? 'date' : undefined}
        className={['b-week__d', day.selected ? 'is-on' : '', day.past ? 'is-past' : ''].filter(Boolean).join(' ')}>
        <span aria-hidden="true">{day.short}</span><b aria-hidden="true">{day.day}</b><i className={day.assigned ? 'has' : undefined} aria-hidden="true"/>
      </Link>)}
    </nav>
  </div>;
}

export function ScheduleB(props: ScheduleBProps) {
  const {sub, confirm, celebration, changes, swap, error, receipt, open, unavailable, list, unpublished, weekCard, leadNote, done} = props;
  return <BScreen>
    <BHero title="Schedule" titleId="b-schedule-title" sub={sub}
      right={<BButtonLink href="/app/availability" kind="glass" label="Availability"><CalendarBlankIcon size={16} weight="bold" aria-hidden="true"/>Availability</BButtonLink>}>
      <Week {...props}/>
    </BHero>
    <BStack>
      {weekCard ? <WeekCard days={weekCard.days} summary={weekCard.summary} leadNote={leadNote}/> : null}
      {celebration}
      {done && !confirm ? <BCard id="b-my-review" label={done.title}>
        <BList><BRow lead={<BIcon tone="green"><CheckIcon weight="bold"/></BIcon>} title={<span role="status">{done.title}</span>}
          sub={done.detailShort ? <><span className="eb-phone">{done.detailShort}</span><span className="eb-desk">{done.detail}</span></> : done.detail}/></BList>
      </BCard> : null}
      {confirm ? <BCard id="b-my-review" label={confirm.title}>
        <div className="b-row es-confirm" role="group" aria-labelledby="b-my-review-title">
          <BIcon tone="teal"><CalendarBlankIcon weight="bold"/></BIcon>
          <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt" id="b-my-review-title">{confirm.title}</span></span>
            {confirm.detailShort ? <><span className="b-row__s eb-phone">{confirm.detailShort}</span><span className="b-row__s eb-desk">{confirm.detail}</span></> : <span className="b-row__s">{confirm.detail}</span>}</span>
          <span className="es-confirm__act">{confirm.control}</span>
        </div>
      </BCard> : null}
      {/* Phase 4 (EM-022, EM-013): one "This week" card: open shifts, then what changed, as rows that share the 36px icon
        * column. On a phone it joins the Confirm row above it as one card of 64px rows; from tablets up it has its own
        * heading and, on desktop, sits beside the day card. Confirm stays the screen's one filled pill (EM-004). */}
      {open || changes ? <section className="b-card es-tw" aria-labelledby="b-this-week-h">
        <div className="b-card__h es-tw__h"><h2 id="b-this-week-h">{t.thisWeek}</h2></div>
        <ul className="b-list">
          {open ? open.count ? <BRow href={open.href} label={open.label} lead={<BIcon tone="teal"><PlusIcon weight="bold"/></BIcon>} title={`${open.count} open ${open.count === 1 ? 'shift' : 'shifts'} to pick up`} sub={open.detail}/>
            // Review B2 (NV-275): none to pick up is a fact, not a row to open (grey: it doesn't open, EM-017).
            : open.count === 0 ? <BRow lead={<BIcon tone="grey"><PlusIcon weight="bold"/></BIcon>} title="No open shifts right now" sub={open.detail}/>
            : <BRow href={open.href} label={open.label} lead={<BIcon tone="teal"><PlusIcon weight="bold"/></BIcon>} title="Open shifts" sub={open.detail}/> : null}
          {changes ? <li className="b-li"><div className="es-chg"><BIcon tone="teal"><ClockCounterClockwiseIcon weight="bold"/></BIcon>{changes}</div></li> : null}
        </ul>
      </section> : null}
      {swap ? <BCard title={<span role="status">{swap.title}</span>} link={{href: swap.doneHref, label: 'Done'}}><BCardNote>{swap.detail}</BCardNote></BCard> : null}
      {error ? <div className="b-card es-error" role="alert">{error}</div> : null}
      {receipt}
      {unavailable ? <BCard title="Schedule unavailable">
        <div className="es-state"><p className="b-state" role="status"><span className="b-sr">Schedule unavailable. </span>We couldn’t load your schedule.</p>
          <BButtonLink href={unavailable.retryHref} kind="quiet" full>Try again<span className="b-sr"> to load your schedule</span></BButtonLink></div>
      </BCard> : <section className="b-card" id="b-my-agenda" aria-labelledby="b-my-agenda-h" data-wide={list.wide ? 'day' : undefined}>
        <div className="b-card__h"><h2 id="b-my-agenda-h">{list.wide ? <><span className="es-narrow">{list.label}</span><span className="es-wide">{list.wide.title}</span></> : list.label}</h2>
          {list.wholeWeekHref ? <Link className="b-card__a" href={list.wholeWeekHref}>Whole week</Link>
            : <>{leadNote ? <span className={list.wide ? 'b-card__meta es-narrow' : 'b-card__meta'}>{leadNote}</span> : null}{list.wide?.meta ? <span className="b-card__meta es-wide">{list.wide.meta}</span> : null}</>}</div>
        {list.empty ? <p className="b-state es-empty">{list.empty}</p> : <BList>{list.rows}</BList>}
        {list.wide?.empty && !list.empty ? <p className="b-state es-empty es-wide">{list.wide.empty}</p> : null}
        {/* Phase 4 (EM-018): on a phone the publication note is this card's footer (from tablets up the week card carries it). */}
        {unpublished ? <p className={weekCard ? 'eb-cardnote eb-phone' : 'eb-cardnote'}>{unpublished}</p> : null}
      </section>}
    </BStack>
  </BScreen>;
}

/* ---------- Open shifts (Schedule ?view=open), one of the three tabs of "Pick up and swap" ---------- */
export type OpenB = {id: string; date: string; hours: string; facts: string; place: string; href: string; requested: boolean; nextWeek: boolean; label: string};
export function OpenShiftsB({backHref, rows, empty, blocked, unavailableHref, note}: {backHref: string; rows: OpenB[] | null; empty: boolean; blocked: ReactNode; unavailableHref: string; note: string}) {
  return <BScreen back>
    {/* The same place as /app/exchange's Open shifts: the same hero and tabs. */}
    <ExchangeHeroB tab="open" back={backHref}/>
    <BStack>
      {rows === null ? <BCard title="Open shifts"><div className="es-state"><p className="b-state">We couldn’t check open shifts right now.</p>
        <BButtonLink href={unavailableHref} kind="quiet" full>Open shift requests</BButtonLink></div></BCard>
        : empty ? <BCard label="Open shifts"><OpenShiftsEmptyB/></BCard>
        : <BCard title="You can pick up" count={rows.filter(row => !row.requested).length || undefined}>
          <BList>{rows.map(row => <BRow key={row.id} lead={<BDay date={row.date}/>} title={row.hours} label={row.label}
            chip={row.requested ? <BChip tone="amber">Waiting</BChip> : undefined}
            sub={<><span className="eb-line"><Dotted text={row.facts}/></span><span className="eb-line"><Dotted text={row.nextWeek ? `${row.place} · Next week` : row.place}/></span></>}
            trail={<BButtonLink href={row.href} kind="ghost" label={row.label} prefetch={false}>{row.requested ? 'View' : 'Pick up'}</BButtonLink>}/>)}</BList>
          <BCardNote>{note}</BCardNote>
        </BCard>}
      {blocked ? <BCard label="Why other shifts aren’t available"><div className="es-blocked"><span className="b-sr">Why other shifts aren’t available</span><BIcon tone="grey"><InfoIcon weight="bold"/></BIcon>{blocked}</div></BCard> : null}
    </BStack>
  </BScreen>;
}
