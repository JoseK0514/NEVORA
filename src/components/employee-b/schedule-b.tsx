import Link from 'next/link';
import type {ReactNode} from 'react';
import {CalendarCheckIcon} from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {ClockCounterClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {UserCheckIcon} from '@phosphor-icons/react/dist/ssr/UserCheck';
import {BButtonLink, BCard, BChip, BHero, BIcon, BList, BRow, BScreen, BStack} from '../owner-b/b-kit';
import {BDoneArrival} from '../owner-b/b-arrival';
import {BCardNote, BDay, Dotted, Range} from './parts';
import {ExchangeHeroB, OpenShiftsEmptyB} from './requests-b';
import {workCopy} from './work-copy';
import type {FormatLang} from './es-format';
import './schedule.css';

/* Employee Schedule on the phone, Direction B (Jose approved the mock, Nov 6, 2026): the week on glass, open shifts to
 * pick up, then the shifts as rows that open the same shift sheet. Presentation only: the corporate view computes every
 * value, link and state and passes them here; this screen shows on phones. */

export type ScheduleBDay = {date: string; short: string; day: number; today: boolean; past: boolean; selected: boolean; assigned: boolean; href: string; label: string};
export type ScheduleBProps = {
  /** Signed-in Spanish (Nov 23, 2026): the person's language; this screen renders on the server, so the page passes it. */
  lang?: FormatLang;
  sub: ReactNode;
  range: ReactNode;
  confirmed: boolean;
  todayHref: string | null;
  prevHref: string;
  nextHref: string;
  days: ScheduleBDay[];
  /** The weekly confirmation, when the manager asked for one and it isn't done yet. */
  confirm: {title: string; detail: string; /** Phones: the same reason in fewer words, so the row keeps one line. */ detailShort?: string; control: ReactNode;
    /** Round 2 (S2): the manager asked for it and it isn't done, so the row carries Home's amber "Action needed" chip. */ needed?: boolean} | null;
  celebration: ReactNode;
  changes: ReactNode;
  swap: {title: string; detail: string; doneHref: string} | null;
  error: ReactNode;
  receipt: ReactNode;
  open: {count: number | null; detail: string; href: string} | null;
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
  done?: {title: string; detail: string; /** Names this week's confirmation ("week:2026-11-16"), for BDoneArrival. */ occurrence: string; /** Phones: the line without the week's dates (the strip above shows them). */ detailShort?: string} | null;
};
export type WeekCardShift = {key: string; time: string; position: string | null; place: string; kind: 'past' | 'now' | 'up'; chip: ReactNode;
  /** Gaps G66: what the block doesn't show (its date, "shift lead" when no chip says so), read after what it shows. */ rest: string; lead?: boolean;
  /** The chip is "Tomorrow" (a tablet's narrow day leaves it out: the next column is tomorrow). */
  tomorrow?: boolean};
export type WeekCardDay = {date: string; short: string; day: number; today: boolean; selected: boolean; href: string; label: string; shifts: WeekCardShift[];
  /** The day the desktop day card shows when no day is chosen and it isn't today (another week's first shift day). */ wide?: boolean};

/** Desktop: "Your week", seven columns; a day opens as the chosen day (the strip's own link). The week's changes sit in the
 * card's footer beside its summary. */
function WeekCard({days, summary, leadNote, lang = 'en'}: {days: WeekCardDay[]; summary: ReactNode; leadNote?: string | null; lang?: FormatLang}) {
  const t = workCopy(lang);
  return <section className="b-card eb-desk eb-wkc" aria-labelledby="b-week-card-h">
    <div className="b-card__h"><h2 id="b-week-card-h">{t.yourWeek}</h2>{leadNote ? <span className="b-card__meta">{leadNote}</span> : null}</div>
    <ol className="eb-wk">{days.map(day => <li key={day.date} className={['eb-wd', day.today ? 'is-today' : '', day.selected ? 'is-on' : '', day.wide ? 'is-wide' : ''].filter(Boolean).join(' ')}>
      <span className="eb-wd__h" aria-hidden="true"><span>{day.short}</span><b>{day.day}</b></span>
      {/* One stop per shift (a day off is one stop too), each opening that day. */}
      {day.shifts.length ? day.shifts.map(shift => <Link key={shift.key} className={`eb-wsh eb-wsh--${shift.kind}`} href={day.href} scroll={false}>
        {/* Phase 4 (EM-014): each half of the range stays whole; if the block is too narrow the line breaks before the dash.
          * Phase 8 (review C, row 24): the Employee screens' one range helper, and the place line wraps between whole
          * segments, never leaving a "·" at a line's end. */}
        <b><Range text={shift.time}/></b>{shift.position ? <span className="eb-wsh__l">{shift.position}</span> : null}<span className="eb-wsh__l"><Dotted text={shift.place} lang={lang}/></span>
        {/* Review B6 (NV-146): the status chip and a Lead's marker share one row at the block's foot ("Lead" where a
          * tablet's day is narrow). */}
        {shift.chip || shift.lead ? <span className={shift.tomorrow ? 'eb-wsh__chips eb-wsh__chips--tomorrow' : 'eb-wsh__chips'}>{shift.chip}
          {shift.lead ? <span className="b-chip b-chip--grey eb-wsh__lead"><span className="eb-wsh__lead-l">{t.shiftLead}</span><span className="eb-wsh__lead-s">{t.leadShort}</span></span> : null}</span> : null}
        <span className="b-sr">{`, ${shift.rest}`}</span>
      </Link>) : <Link className="eb-wsh eb-wsh--off" href={day.href} scroll={false} aria-label={day.label}/>}
    </li>)}</ol>
    {/* Phase 4 (EM-018): what isn't published yet qualifies this card, so it is the card's footer note. What changed
      * moved to the "This week" card (EM-013). */}
    {summary ? <p className="eb-cardnote eb-wkc__note">{summary}</p> : null}
  </section>;
}

function Week({range, confirmed, todayHref, prevHref, nextHref, days, lang}: Pick<ScheduleBProps, 'range' | 'confirmed' | 'todayHref' | 'prevHref' | 'nextHref' | 'days' | 'lang'>) {
  const t = workCopy(lang);
  return <div className="b-week b-glass">
    <div className="b-week__h">
      <span>{range}{confirmed ? <span className="b-chip b-chip--ok">{t.confirmed}</span> : null}</span>
      <span>
        {todayHref ? <Link className="es-today" href={todayHref}>{t.today}</Link> : null}
        <Link className="b-week__arrow" href={prevHref} aria-label={t.previousWeek}><CaretLeftIcon size={18} weight="bold" aria-hidden="true"/></Link>
        <Link className="b-week__arrow" href={nextHref} aria-label={t.nextWeek}><CaretRightIcon size={18} weight="bold" aria-hidden="true"/></Link>
      </span>
    </div>
    <nav className="b-week__days" aria-label={t.daysInWeek}>
      {/* Gaps G12 (Nov 23, 2026), as on the Managers' strip: the name starts with what the day shows ("Tue 17") and the
        * rest of its label ("today, assigned shift") is hidden text, so the spoken name never differs from the visible one. */}
      {days.map(day => { const rest = day.label.split(', ').slice(2).join(', ');
        return <Link key={day.date} href={day.href} scroll={false} aria-current={day.today ? 'date' : undefined}
          className={['b-week__d', day.selected ? 'is-on' : '', day.past ? 'is-past' : ''].filter(Boolean).join(' ')}>
          <span>{day.short}</span><span className="b-sr"> </span><b>{day.day}</b>{rest ? <span className="b-sr">{`, ${rest}`}</span> : null}<i className={day.assigned ? 'has' : undefined} aria-hidden="true"/>
        </Link>; })}
    </nav>
  </div>;
}

export function ScheduleB(props: ScheduleBProps) {
  const {sub, confirm, celebration, changes, swap, error, receipt, open, unavailable, list, unpublished, weekCard, leadNote, done, lang} = props;
  const t = workCopy(lang);
  return <BScreen>
    <BHero title={t.scheduleTitle} titleId="b-schedule-title" sub={sub}
      // Final review C (row 4): one glyph per concept. Availability is UserCheck, the navigation's (it pairs with Can't
      // work's UserMinus); CalendarBlank stays the Schedule's own glyph.
      right={<BButtonLink href="/app/availability" kind="glass" label={t.availability}><UserCheckIcon size={16} weight="bold" aria-hidden="true"/>{t.availability}</BButtonLink>}>
      <Week {...props}/>
    </BHero>
    <BStack>
      {weekCard ? <WeekCard days={weekCard.days} summary={weekCard.summary} leadNote={leadNote} lang={lang}/> : null}
      {/* Phase 7 (moments): the confirmed week is the shared done mark in the row where Confirm was. The mark settles only
        * when the confirmation arrived on this visit (BDoneArrival); the celebration is that mark's one ring. */}
      {done && !confirm ? <BCard id="b-my-review" label={done.title}>
        <BList><BRow lead={<BDoneArrival occurrence={done.occurrence} focusId="week-done">{celebration}</BDoneArrival>} title={<span role="status" tabIndex={-1} data-b-arrival="week-done" className="b-done__t">{done.title}</span>}
          sub={done.detailShort ? <><span className="eb-phone">{done.detailShort}</span><span className="eb-desk">{done.detail}</span></> : done.detail}/></BList>
      </BCard> : null}
      {confirm ? <BCard id="b-my-review" label={confirm.title}>
        <div className="b-row es-confirm" role="group" aria-labelledby="b-my-review-title">
          {/* Final review C (rows 4, 5): the manager asked for this, so it waits on you: the amber circle, as Home's and
            * Notifications' same task, with the glyph for confirming a schedule (CalendarCheck) on every screen. */}
          <BIcon tone="amber"><CalendarCheckIcon weight="bold"/></BIcon>
          <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt" id="b-my-review-title">{confirm.title}</span>{confirm.needed ? <BChip tone="amber">{t.actionNeeded}</BChip> : null}</span>
            {confirm.detailShort ? <><span className="b-row__s eb-phone">{confirm.detailShort}</span><span className="b-row__s eb-desk">{confirm.detail}</span></> : <span className="b-row__s">{confirm.detail}</span>}</span>
          <span className="es-confirm__act">{confirm.control}</span>
        </div>
      </BCard> : null}
      {/* Phase 4 (EM-022, EM-013): one "This week" card: open shifts, then what changed, as rows that share the 36px icon
        * column. On a phone it joins the Confirm row above it as one card of 64px rows; from tablets up it has its own
        * heading and, on desktop, sits beside the day card. Confirm stays the screen's one filled pill (EM-004). */}
      {open || changes ? <section className="b-card es-tw" aria-labelledby="b-this-week-h">
        {/* Phase 8 (review C, row 9): the card says what it holds; its open shifts can be next week's. */}
        <div className="b-card__h es-tw__h"><h2 id="b-this-week-h">{open && changes ? t.openAndChanges : open ? t.openShifts : t.scheduleChanges}</h2></div>
        <ul className="b-list">
          {open ? open.count ? <BRow href={open.href} lead={<BIcon tone="teal"><PlusIcon weight="bold"/></BIcon>} title={t.openToPickUp(open.count)} sub={open.detail}/>
            // Review B2 (NV-275): none to pick up is a fact, not a row to open (grey: it doesn't open, EM-017).
            : open.count === 0 ? <BRow lead={<BIcon tone="grey"><PlusIcon weight="bold"/></BIcon>} title={t.noOpenShifts}/>
            : <BRow href={open.href} lead={<BIcon tone="teal"><PlusIcon weight="bold"/></BIcon>} title={t.openShifts} sub={open.detail}/> : null}
          {/* Round 2 (S4): under 360px the row's title reads "What changed" (the long one left a word alone on a second
            * line). The disclosure's own title stays in the page for screen readers; this short one is drawn in its place. */}
          {changes ? <li className="b-li"><div className="es-chg"><BIcon tone="teal"><ClockCounterClockwiseIcon weight="bold"/></BIcon>{changes}<span className="es-chg__short" aria-hidden="true">{t.whatChanged}</span></div></li> : null}
        </ul>
      </section> : null}
      {swap ? <BCard title={<span role="status">{swap.title}</span>} link={{href: swap.doneHref, label: t.done}}><BCardNote>{swap.detail}</BCardNote></BCard> : null}
      {error ? <div className="b-card es-error" role="alert">{error}</div> : null}
      {receipt}
      {unavailable ? <BCard title={t.scheduleUnavailable}>
        <div className="es-state"><p className="b-state" role="status"><span className="b-sr">{t.scheduleUnavailableSr}</span>{t.couldntLoadSchedule}</p>
          <BButtonLink href={unavailable.retryHref} kind="quiet" full>{t.tryAgain}<span className="b-sr">{t.toLoadSchedule}</span></BButtonLink></div>
      </BCard> : <section className="b-card" id="b-my-agenda" aria-labelledby="b-my-agenda-h" data-wide={list.wide ? 'day' : undefined}>
        <div className="b-card__h"><h2 id="b-my-agenda-h">{list.wide ? <><span className="es-narrow">{list.label}</span><span className="es-wide">{list.wide.title}</span></> : list.label}</h2>
          {list.wholeWeekHref ? <Link className="b-card__a" href={list.wholeWeekHref}>{t.wholeWeek}</Link>
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
export function OpenShiftsB({backHref, rows, empty, blocked, unavailableHref, note, lang}: {backHref: string; rows: OpenB[] | null; empty: boolean; blocked: ReactNode; unavailableHref: string; note: string; lang?: FormatLang}) {
  const t = workCopy(lang);
  return <BScreen back>
    {/* The same place as /app/exchange's Open shifts: the same hero and tabs. */}
    <ExchangeHeroB tab="open" back={backHref}/>
    <BStack>
      {rows === null ? <BCard title={t.openShifts}><div className="es-state"><p className="b-state">{t.couldntCheckOpen}</p>
        <BButtonLink href={unavailableHref} kind="quiet" full>{t.openShiftRequests}</BButtonLink></div></BCard>
        : empty ? <BCard label={t.openShifts}><OpenShiftsEmptyB/></BCard>
        : <BCard title={t.youCanPickUp} count={rows.filter(row => !row.requested).length || undefined}>
          <BList>{rows.map(row => <BRow key={row.id} lead={<BDay date={row.date} spoken lang={lang}/>} title={row.hours}
            chip={row.requested ? <BChip tone="amber">{t.waiting}</BChip> : undefined}
            sub={<><span className="eb-line"><Dotted text={row.facts} lang={lang}/></span><span className="eb-line"><Dotted lang={lang} text={row.nextWeek ? `${row.place} · ${t.nextWeekTag}` : row.place}/></span></>}
            trail={<BButtonLink href={row.href} kind="ghost" label={row.label} prefetch={false}>{row.requested ? t.view : t.pickUp}</BButtonLink>}/>)}</BList>
          <BCardNote>{note}</BCardNote>
        </BCard>}
      {blocked ? <BCard label={t.whyNotAvailable}><div className="es-blocked"><span className="b-sr">{t.whyNotAvailable}</span><BIcon tone="grey"><InfoIcon weight="bold"/></BIcon>{blocked}</div></BCard> : null}
    </BStack>
  </BScreen>;
}
