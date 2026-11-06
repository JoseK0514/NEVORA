import Link from 'next/link';
import type {ReactNode} from 'react';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {BButtonLink, BCard, BChip, BHero, BIcon, BList, BNote, BRow, BScreen, BStack} from '../owner-b/b-kit';
import {BCardNote, BDay} from './parts';
import {BEmpty, ExchangeHeroB} from './requests-b';
import './schedule.css';

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
  confirm: {title: string; detail: string; control: ReactNode} | null;
  celebration: ReactNode;
  changes: ReactNode;
  swap: {title: string; detail: string; doneHref: string} | null;
  error: ReactNode;
  receipt: ReactNode;
  open: {count: number | null; detail: string; label: string; href: string} | null;
  unavailable: {retryHref: string} | null;
  list: {label: string; wholeWeekHref: string | null; rows: ReactNode; empty: string | null};
  unpublished: ReactNode;
};

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
  const {sub, confirm, celebration, changes, swap, error, receipt, open, unavailable, list, unpublished} = props;
  return <BScreen>
    <BHero title="Schedule" titleId="b-schedule-title" sub={sub}
      right={<BButtonLink href="/app/availability" kind="glass" label="Availability"><CalendarBlankIcon size={16} weight="bold" aria-hidden="true"/>Availability</BButtonLink>}>
      <Week {...props}/>
    </BHero>
    <BStack>
      {celebration}
      {confirm ? <BCard id="b-my-review" label={confirm.title}>
        <div className="b-row es-confirm" role="group" aria-labelledby="b-my-review-title">
          <BIcon tone="teal"><CalendarBlankIcon weight="bold"/></BIcon>
          <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt" id="b-my-review-title">{confirm.title}</span></span><span className="b-row__s">{confirm.detail}</span></span>
          <span className="es-confirm__act">{confirm.control}</span>
        </div>
      </BCard> : null}
      {changes ? <div className="b-card es-changes">{changes}</div> : null}
      {swap ? <BCard title={<span role="status">{swap.title}</span>} link={{href: swap.doneHref, label: 'Done'}}><BCardNote>{swap.detail}</BCardNote></BCard> : null}
      {error ? <div className="b-card es-error" role="alert">{error}</div> : null}
      {receipt}
      {open ? <BCard label="Open shifts">
        <BList>{open.count ? <BRow href={open.href} label={open.label} lead={<BIcon tone="teal"><PlusIcon weight="bold"/></BIcon>} title={`${open.count} open ${open.count === 1 ? 'shift' : 'shifts'} to pick up`} sub={open.detail}
          trail={<BButtonLink href={open.href} kind="teal" label={`See ${open.count} open ${open.count === 1 ? 'shift' : 'shifts'}`} prefetch={false}>See</BButtonLink>}/>
          : <BRow href={open.href} label={open.label} lead={<BIcon tone="grey"><PlusIcon weight="bold"/></BIcon>} title="Open shifts" sub={open.detail}/>}</BList>
      </BCard> : null}
      {unavailable ? <BCard title="Schedule unavailable">
        <div className="es-state"><p className="b-state" role="status"><span className="b-sr">Schedule unavailable. </span>We couldn’t load your schedule.</p>
          <BButtonLink href={unavailable.retryHref} kind="quiet" full>Try again<span className="b-sr"> to load your schedule</span></BButtonLink></div>
      </BCard> : <BCard id="b-my-agenda" title={list.label} link={list.wholeWeekHref ? {href: list.wholeWeekHref, label: 'Whole week'} : undefined}>
        {list.empty ? <p className="b-state es-empty">{list.empty}</p> : <BList>{list.rows}</BList>}
      </BCard>}
      {unpublished ? <BNote>{unpublished}</BNote> : null}
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
        : empty ? <BCard label="Open shifts"><BEmpty icon={<CalendarBlankIcon weight="bold"/>} title="No open shifts right now" sub="When a teammate offers a shift you can work, it shows here."/>
          <Link className="es-empty-state__a" href="/app/profile/device-alerts">Get alerts on this phone<CaretRightIcon size={15} weight="bold" aria-hidden="true"/></Link>
        </BCard>
        : <BCard title="You can pick up" count={rows.filter(row => !row.requested).length || undefined}>
          <BList>{rows.map(row => <BRow key={row.id} lead={<BDay date={row.date}/>} title={row.hours} label={row.label}
            chip={row.requested ? <BChip tone="amber">Waiting</BChip> : row.nextWeek ? <BChip tone="grey">Next week</BChip> : undefined}
            sub={<>{row.facts}<br/>{row.place}</>}
            trail={<BButtonLink href={row.href} kind={row.requested ? 'ghost' : 'teal'} label={row.label} prefetch={false}>{row.requested ? 'View' : 'Pick up'}</BButtonLink>}/>)}</BList>
          <BCardNote>{note}</BCardNote>
        </BCard>}
      {blocked ? <BCard label="Why other shifts aren’t available"><div className="es-blocked"><span className="b-sr">Why other shifts aren’t available</span><BIcon tone="grey"><InfoIcon weight="bold"/></BIcon>{blocked}</div></BCard> : null}
    </BStack>
  </BScreen>;
}
