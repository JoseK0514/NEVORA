'use client';

import './employee-home-corp.css';
import type {ReactNode} from 'react';
import {CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpLink, CorpNote, CorpPage, CorpPill, CorpRow, CorpRows, CorpTitle} from './corp/corp';
import {HOME_SOURCES} from '../lib/employee-home/project';
import type {HomeSnapshot, PublishedAssignment} from '../lib/employee-home/types';
import {homePublishedNames, unpublishedNote} from '../lib/publication-note';
import {keepWhole} from '../lib/keep-whole';
import {formatTime} from '../lib/date-utils';
import Link from 'next/link';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {useAccessJourney} from './mobile-access/journey';
import {useEmployeeBScreen} from './employee-mobile/use-mobile';
import type {AttentionItem} from '../lib/employee-home/types';
import {EmployeeHomeB, type HomeBExtras} from './employee-b/home-b';
import {reviewCopy} from './review-details/copy';
import {homeTaskTotal} from '../lib/action-center/review-routing';
import {AssignmentAddress} from "./employee-b/assignment-address";
import {businessDate, clock, confirmsWeek, dayWord, fmt, isComplete, sourceDestinations, todoTitle, weekRange, type EmployeeHomeQuietViewProps, type HomeWeek} from './employee-home-quiet';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {employeeHomeCopy, type HomeLang} from './employee-home-copy';
import {esTime} from './employee-b/es-format';

/* Employee Home on the corporate kit (Release 1, board C-Employee; Nov 1 upscale S3, S4, M7). Look only: the Home read, its states, links, authority
 * checks and private-data clearing are the original controller's, exactly as in the v5 view. Clock-in happens on the
 * location's tablet (phone clock-in is off), so the shift card points there instead of offering a phone button. The
 * first-week Quick guide (`intro`) shows only while Employee Access is on (off in Release 1 production), and then only
 * right after activation. */

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
/** "08:00" → "8:00 AM" (the one time format, date-utils formatTime). */
function wall(time: string, lang: HomeLang = 'en') {
  return esTime(formatTime(time), lang);
}

/** "2026-10-30 19:45": the read's moment as wall time in the workspace zone, comparable with "<date> <HH:mm>". */
function wallNow(at: string, zone: string) {
  const parts = fmt(zone, {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date(at));
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '00';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}
const nextDay = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
/** Whether a week shift (wall times in the workspace zone) is still ahead or under way at `at`; overnight shifts end the next day. */
export function weekShiftAhead(shift: {date: string; startTime: string; endTime: string}, at: string, zone: string) {
  const end = `${shift.endTime <= shift.startTime && shift.endTime !== '24:00' ? nextDay(shift.date) : shift.date} ${shift.endTime === '24:00' ? '24:00' : shift.endTime}`;
  return end > wallNow(at, zone);
}

/** "Starts in 2 h" or "Starts in 45 min" for today's next shift; otherwise "Tomorrow" or the weekday. */
function startsIn(shift: PublishedAssignment, snapshot: HomeSnapshot, lang: HomeLang = 'en') {
  const c = employeeHomeCopy(lang);
  const minutes = Math.round((Date.parse(shift.startAt) - Date.parse(snapshot.observedAt)) / 60_000);
  if (dayWord(shift, snapshot) !== 'Today' || minutes <= 0) return dayWord(shift, snapshot, lang);
  return minutes < 60 ? c.startsInMin(minutes) : c.startsInHours(Math.round(minutes / 60));
}

function ShiftCard({snapshot, lang}: {snapshot: HomeSnapshot; lang: HomeLang}) {
  const zone = snapshot.timeZone;
  const c = employeeHomeCopy(lang);
  if (snapshot.publicationState === 'unavailable') return <CorpCard id="home-shift" label={c.nextShift}>
    <CorpBody><p className="c-ehome__state" role="status">{c.scheduleNotChecked}</p></CorpBody>
  </CorpCard>;
  const now = snapshot.currentShift, shift = now ?? snapshot.nextShift;
  if (!shift) return <CorpCard id="home-shift" label={c.nextShift}>
    <CorpBody><p className="c-ehome__state">{c.noUpcomingShiftLong}</p></CorpBody>
  </CorpCard>;
  const today = dayWord(shift, snapshot) === 'Today';
  const where = [shift.positionLabel, shift.locationLabel, shift.designatedLead ? c.shiftLead : null].filter(Boolean).join(' · ');
  const href = `/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}&shift=${encodeURIComponent(shift.shiftId)}`;
  // Upscale S4: one left edge. The body is the link to the shift (its text is the link's name); the footer says where to
  // clock in (tablet only) and repeats the way in as "Shift details ›". The body link leaves the tab order so the keyboard
  // meets the shift once, on the footer link.
  return <CorpCard id="home-shift" label={now ? c.onShiftNow : today ? c.todaysShift : c.nextShift}
    aside={now ? <CorpPill tone="teal">{c.until(clock(now.endAt, zone, lang))}</CorpPill> : <CorpPill tone="teal">{startsIn(shift, snapshot, lang)}</CorpPill>}
    footer={<>
      <span className="c-ehome__clockin">{c.clockInOn(shift.locationLabel)}</span>
      <Link className="c-link" href={href}>{c.shiftDetails}<CaretRightIcon className="c-ehome__caret" weight="bold" aria-hidden="true"/></Link>
    </>}>
    <Link className="c-card__body c-ehome__shift" href={href} tabIndex={-1}>
      <b className="c-big"><time dateTime={shift.startAt}>{clock(shift.startAt, zone, lang)}</time><span aria-hidden="true"> – </span><span className="nv-sr">{c.to}</span><time dateTime={shift.endAt}>{clock(shift.endAt, zone, lang)}</time></b>
      <span className="c-ehome__where">{today ? where : keepWhole(`${shortDay(shift.date, lang)} · ${where}`)}{!today && businessDate(shift.endAt, zone) !== shift.date ? keepWhole(` · ${c.ends(shortDay(businessDate(shift.endAt, zone), lang))}`) : null}</span>
      <AssignmentAddress address={shift.locationAddress}/>
    </Link>
  </CorpCard>;
}

/** "Mon, Nov 2". */
const shortDay = (date: string, lang: HomeLang = 'en') => fmt('UTC', {weekday: 'short', month: 'short', day: 'numeric'}, lang).format(utcDay(date));

type WeekShift = HomeWeek['shifts'][number] & {weekStart: string};

/** Upscale M7: "Coming up", the next three own shifts after the one on the card, across this week and next. */
function ComingUp({week, snapshot, lang}: {week: HomeWeek; snapshot: HomeSnapshot; lang: HomeLang}) {
  const c = employeeHomeCopy(lang);
  const shown = snapshot.currentShift ?? snapshot.nextShift;
  const shownDay = shown?.date, shownStart = shown ? fmt(snapshot.timeZone, {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(shown.startAt)) : null;
  const all: WeekShift[] = [...week.shifts.map(shift => ({...shift, weekStart: week.weekStart})), ...(week.next?.shifts ?? []).map(shift => ({...shift, weekStart: week.next!.weekStart}))];
  // A shift that has already ended is not upcoming: compare its end (wall time in the workspace zone, next day when it
  // runs past midnight) with the moment Home was read, not just its date.
  const rows = all.filter(shift => shift.date >= week.today && weekShiftAhead(shift, snapshot.observedAt, snapshot.timeZone) && !(shift.date === shownDay && shift.startTime === shownStart))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  if (!rows.length) return null;
  return <CorpCard id="home-upcoming" label={c.comingUp} aside={<CorpLink href="/app/schedule" label={c.seeAllShifts}>{c.seeAll}</CorpLink>}>
    <CorpRows>
      {rows.slice(0, 3).map(shift => {
        const at = utcDay(shift.date);
        const href = `/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}${shift.id ? `&shift=${encodeURIComponent(shift.id)}` : ''}`;
        return <li key={`${shift.date}-${shift.startTime}`}><CorpRow href={href}
          lead={`${fmt('UTC', {weekday: 'short'}, lang).format(at)} ${at.getUTCDate()}`} title={keepWhole(`${wall(shift.startTime, lang)} – ${wall(shift.endTime, lang)}`)} detail={shift.locationAddress ? <>{shift.where}<AssignmentAddress address={shift.locationAddress}/></> : shift.where || undefined}
          label={keepWhole(c.rowLabel(fmt('UTC', {weekday: 'long', month: 'long', day: 'numeric'}, lang).format(at), wall(shift.startTime, lang), wall(shift.endTime, lang), [shift.where, shift.locationAddress].filter(Boolean).join(", ")))}/></li>;
      })}
    </CorpRows>
  </CorpCard>;
}

const addDay = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Upscale S3: one confirm row per week, nearest week first. A week that is over (its last day has passed, or it is the
 * last day and none of its shifts is still ahead) drops off Home; it stays confirmable on Schedule. Display only: each
 * row keeps the server's link and required flag. */
export function homeTodoRows(items: readonly AttentionItem[], snapshot: Pick<HomeSnapshot, 'observedAt' | 'timeZone'>, week?: HomeWeek | null) {
  const today = businessDate(snapshot.observedAt, snapshot.timeZone);
  const over = (weekStart: string) => {
    const last = addDay(weekStart, 6);
    if (last < today) return true;
    if (last > today) return false;
    const shifts = week?.weekStart === weekStart ? week.shifts : week?.next?.weekStart === weekStart ? week.next.shifts : null;
    return shifts ? !shifts.some(shift => weekShiftAhead(shift, snapshot.observedAt, snapshot.timeZone)) : false;
  };
  const kept = items.filter(item => !(confirmsWeek(item) && over(item.ref.id)));
  const weeks = kept.filter(confirmsWeek).sort((a, b) => a.ref.id.localeCompare(b.ref.id));
  let next = 0;
  return kept.map(item => {
    const shown = confirmsWeek(item) ? weeks[next++] : item;
    return {key: `${shown.ref.kind}:${shown.ref.id}`, item: shown, week: confirmsWeek(shown)};
  });
}

/** "Confirm next week’s schedule" and "Nov 2–8 · 4 shifts" (the count when Home read that week). */
function weekTodo(item: AttentionItem, week?: HomeWeek | null, lang: HomeLang = 'en') {
  const c = employeeHomeCopy(lang);
  const own = week?.weekStart === item.ref.id ? {title: c.confirmThisWeek, shifts: week.shifts} : week?.next?.weekStart === item.ref.id ? {title: c.confirmNextWeek, shifts: week.next.shifts} : null;
  const count = own ? ` · ${c.shifts(own.shifts.length)}` : '';
  return {title: own ? own.title : c.confirmSchedule, detail: <><time dateTime={item.ref.id}>{weekRange(item.ref.id, lang)}</time>{count}</>};
}

export function EmployeeHomeCorpView({home, status, refreshing, onRetry, intro, displayName, timeZone, workspaceName, week, b, teamMessage = false}: EmployeeHomeQuietViewProps & {b?: HomeBExtras}) {
  const lang = usePortalLang(), c = employeeHomeCopy(lang);
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const paused = status === 'paused';
  const denied = !paused && (status === 'unauthorized' || home?.state === 'unauthorized');
  const released = !paused && !denied && (status === 'ready' || status === 'partial') && home && 'snapshot' in home ? home : null;
  const snapshot = released?.snapshot;
  const knownOnly = !!snapshot && HOME_SOURCES.every(key => isComplete(snapshot.sources[key]));
  const partial = !!snapshot && (status === 'partial' || released!.state === 'partial') && !knownOnly;
  const loading = !paused && !denied && !snapshot && status === 'loading';
  const viewState = paused ? 'paused' : denied ? 'unauthorized' : snapshot ? (partial ? 'partial' : 'ready') : loading ? 'loading' : 'unavailable';
  // The name is private like the rest of Home: it shows only with released data and clears when Home pauses.
  const name = snapshot ? displayName?.trim() : undefined;
  const todos = snapshot ? homeTodoRows(snapshot.attention.filter(item => item.actionable || item.required), snapshot, week) : [];
  // Phase 4 (U03): the count and the "nothing to do" state come from the read's task facts. A partial read, or an older
  // payload without them, makes the count a lower bound ("At least 2"); "You’re all set" is only the server's all-clear.
  const tasks = homeTaskTotal(released && 'tasks' in released ? released.tasks : undefined, todos.length, {partial, allSet: !!released && released.allSet === true});
  // Upscale M7: the Quick guide repeats the tabs, so a returning employee's Home shows "Coming up" instead. The guide shows
  // only for the session in which the person has just activated their account (Employee Access on).
  const firstVisit = useAccessJourney().confirmedId !== null;
  const bScreen = useEmployeeBScreen();
  const date = snapshot
    ? <time dateTime={snapshot.observedAt}>{keepWhole(fmt(snapshot.timeZone, {weekday: 'long', month: 'long', day: 'numeric'}, lang).format(new Date(snapshot.observedAt)))}</time>
    // Before Home is read, the workspace's public date, so the line is there from the first frame.
    : <time suppressHydrationWarning>{keepWhole(fmt(timeZone ?? 'UTC', {weekday: 'long', month: 'long', day: 'numeric'}, lang).format(new Date()))}</time>;
  // Direction B writes the month short ("Saturday, Nov 7"), read or not.
  const dateB = <time suppressHydrationWarning>{keepWhole(fmt(timeZone ?? 'UTC', {weekday: 'long', month: 'short', day: 'numeric'}, lang).format(new Date()))}</time>;
  const weekShown = snapshot && week && week.dates.length === 7 ? week : null;
  const waiting: ReactNode = paused ? (online ? c.waitingPausedAway : c.waitingOffline)
    : denied ? c.waitingEnded : loading ? c.loadingShift : c.couldntLoadHome;

  return <CorpPage className="c-ehome c-page--narrow">
    {/* Direction B: the phone screen (phones only; tablets and desktop keep the cards below). */}
    <EmployeeHomeB snapshot={snapshot ?? null} partial={partial} todos={todos} tasks={tasks} week={week} name={name} date={dateB} place={(snapshot?.currentShift ?? snapshot?.nextShift)?.locationLabel || workspaceName}
      intro={bScreen && firstVisit ? intro : undefined} waiting={waiting} loading={loading} paused={paused} denied={denied} refreshing={refreshing} onRetry={onRetry} weekTodo={item => weekTodo(item, week, lang)} team={teamMessage} {...b}/>
    <div data-home-state={viewState} aria-busy={refreshing || loading} className="c-ehome__body">
      <CorpTitle title={name ? c.welcomeBack(name) : c.home} sub={<>{date}{workspaceName ? <> · {workspaceName}</> : null}</>}/>
      {snapshot ? <>
        <ShiftCard snapshot={snapshot} lang={lang}/>
        {snapshot.publicationState === 'partial' ? <CorpNote>{(lang === 'en' ? unpublishedNote : c.unpublishedNote)(snapshot.unpublishedLocations ?? [], homePublishedNames([snapshot.currentShift, snapshot.nextShift], snapshot.unpublishedLocations))}</CorpNote> : null}
      </> : <CorpCard id="home-shift" label={c.todaysShift}>
        <CorpBody>
          <p className="c-ehome__state" role="status">{waiting}</p>
          {!loading && !paused ? denied ? <CorpButtonLink href="/login" full>{c.signIn}</CorpButtonLink>
            : <CorpButton kind="secondary" full data-home-refresh onClick={onRetry} disabled={refreshing} aria-busy={refreshing || undefined}>{refreshing ? c.checking : c.tryAgain}<span className="nv-sr">{c.toLoadHome}</span></CorpButton> : null}
        </CorpBody>
      </CorpCard>}
      {/* The first-week Quick guide sits below the shift card, as anchored on the v5 Home (a048a86b). It keeps one place in
        * the tree whether or not Home is read, so a refresh never remounts it (or closes it). */}
      {!bScreen && firstVisit ? intro : null}
      {snapshot ? <>
        {weekShown ? <ComingUp week={weekShown} snapshot={snapshot} lang={lang}/> : null}
        {/* Board C-Employee: one thing to do is its own card ("Confirm next week's schedule … Review"); several share a
          * "Things to do" header. The action reads as a teal text link, not a pill. */}
        {todos.length || partial ? <CorpCard id="employee-home-todo" label={todos.length === 1 && !partial ? undefined : c.thingsToDo} ariaLabel={todos.length === 1 && !partial ? c.thingsToDo : undefined}>
          <CorpRows>
            {todos.slice(0, 3).map(({key, item, week: confirm}) => <li key={key}><CorpRow href={item.href} title={keepWhole(confirm ? weekTodo(item, week, lang).title : todoTitle(item, lang))} bold={todos.length === 1 && !partial}
              detail={confirm ? weekTodo(item, week, lang).detail : item.deadlineAt ? c.respondBy(keepWhole(fmt(snapshot.timeZone, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}, lang).format(new Date(item.deadlineAt)))) : undefined}
              trail={item.required ? <span className="c-ehome__act">{c.review}</span> : undefined}/></li>)}
            {todos.length > 3 ? <li><CorpRow href="/app/notifications" title={c.seeAllCount(todos.length)} one/></li> : null}
            {partial ? HOME_SOURCES.filter(key => !isComplete(snapshot.sources[key])).map(key => {
              const source = snapshot.sources[key];
              const state = source.state === 'unavailable' ? (source.reason === 'review_unavailable' ? c.needsReview : c.couldntCheck)
                : source.reason === 'source_cap' ? c.partlyShown : c.partlyChecked;
              return <li key={key}><CorpRow href={sourceDestinations[key]} title={c.sources[key]} detail={state} label={c.openWithState(c.sources[key], state)}/></li>;
            }) : null}
          </CorpRows>
        </CorpCard> : <CorpNote center>{tasks.allSet ? c.allSetNothing : reviewCopy(lang).nothingToDo}</CorpNote>}
        <p className="nv-sr" data-home-updated="true">{c.updated} <time dateTime={snapshot.observedAt}>{clock(snapshot.observedAt, snapshot.timeZone, lang)}</time>{c.updatedIn(snapshot.timeZone.split('/').pop()!.replace(/_/g, ' '))}</p>
      </> : null}
    </div>
  </CorpPage>;
}
