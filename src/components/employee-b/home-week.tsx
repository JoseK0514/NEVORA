import type {CSSProperties} from 'react';
import {BCard} from '../owner-b/b-kit';
import {addDays, weekStartFor} from '../../lib/date-utils';
import type {EmployeeTime} from '../../lib/employee-time';
import {weekRange, type HomeWeek} from '../employee-home-quiet';
import {workCopy} from './work-copy';
import {esDate, LOCALE, type FormatLang} from './es-format';

/* Home's "Your week" (Nov 21, 2026): the week's hours day by day, one bar per day. A day's bar is as tall as its hours;
 * the solid part is time worked (the Time tab's own records read), the tint is what the published schedule still holds.
 * Presentation only: both reads are Home's own, nothing is fetched here, and without the hours read the card shows the
 * schedule alone. The bars are a picture of numbers that are also written out (each value over its bar, and one sentence
 * per day for screen readers). */

type Ready = Extract<EmployeeTime, {state: 'ready'}>;
const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
const dateKey = (at: string, zone: string) => new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(at));
const minutesOf = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
/** "8" or "8.5": hours with at most one decimal, as Home's figures write them. */
const hoursNumber = (minutes: number) => { const h = Math.round(minutes / 6) / 10; return Number.isInteger(h) ? String(h) : h.toFixed(1); };
const hoursWords = (minutes: number, lang: FormatLang) => workCopy(lang).hoursWords(hoursNumber(minutes));

/** Minutes worked on each day of this week (breaks included, as on Time), keyed by date; null while the read can't say
 * (not loaded, or cut inside this week, the same guard as Home's weekly total). */
export function workedByDay(data: Ready | null | undefined): Map<string, number> | null {
  // A read that carries only the clock state (no records yet) says nothing about the week.
  if (!data?.date || !data.today?.entries || !data.recent?.entries) return null;
  const zone = data.timeZone, start = weekStartFor(data.date), end = addDays(start, 6);
  const byId = new Map([...data.today.entries, ...data.recent.entries].map(entry => [entry.id, entry]));
  const oldest = data.recent.entries.reduce<string | null>((min, entry) => !min || entry.clockInAt < min ? entry.clockInAt : min, null);
  if (data.recent.entries.length < data.recent.total && !!oldest && dateKey(oldest, zone) >= start) return null;
  const days = new Map<string, number>();
  for (const entry of byId.values()) {
    const date = dateKey(entry.clockInAt, zone);
    if (date >= start && date <= end) days.set(date, (days.get(date) ?? 0) + Math.floor(entry.elapsedSeconds / 60));
  }
  return days;
}

export type WeekDay = {date: string; scheduled: number; worked: number | null; when: 'past' | 'today' | 'ahead'};
/** One entry per day of the week Home shows: scheduled minutes from the published shifts, worked minutes when known. */
export function weekDays(week: HomeWeek, worked: Map<string, number> | null): WeekDay[] {
  return week.dates.map(date => {
    const scheduled = week.shifts.filter(shift => shift.date === date).reduce((sum, shift) => { const a = minutesOf(shift.startTime), b = minutesOf(shift.endTime); return sum + (b > a ? b - a : b + 1440 - a); }, 0);
    const when = date < week.today ? 'past' : date === week.today ? 'today' : 'ahead';
    return {date, scheduled, worked: worked && when !== 'ahead' ? worked.get(date) ?? 0 : null, when};
  });
}

function sentence(day: WeekDay, lang: FormatLang) {
  const t = workCopy(lang);
  const name = new Intl.DateTimeFormat(LOCALE[lang], {timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric'}).format(utcDay(day.date));
  const lead = day.when === 'today' ? t.todayDay(name) : name;
  if (day.worked) return t.dayWorked(lead, hoursWords(day.worked, lang), day.scheduled ? hoursNumber(day.scheduled) : null);
  if (day.scheduled) return t.dayScheduled(lead, hoursWords(day.scheduled, lang));
  return t.dayOff(lead);
}

export function HomeWeekCard({week, hours, time, lang = 'en'}: {week: HomeWeek; lang?: FormatLang;
  /** The Time tab's records read; undefined: Home has no live hours here; null: not read yet or unavailable. */
  hours: Ready | null | undefined;
  /** Whether the person has the Time tab, for the card's link. */
  time: boolean}) {
  const worked = workedByDay(hours);
  const days = weekDays(week, worked);
  if (!days.some(day => day.scheduled || day.worked)) return null;
  const t = workCopy(lang), range = esDate(weekRange(week.weekStart), lang);
  const top = Math.max(...days.map(day => Math.max(day.scheduled, day.worked ?? 0)), 60);
  return <BCard title={t.yourWeek} id="b-home-week" link={time ? {href: '/app/my-time', label: t.timecard, aria: t.openTimecard} : undefined} meta={range}>
    <div className="eb-hw">
      <ul className="eb-hw__days" aria-label={t.hoursByDay}>{days.map(day => {
        const total = Math.max(day.scheduled, day.worked ?? 0), done = day.worked ?? 0;
        const shown = day.worked ? day.worked : day.scheduled;
        const label = new Intl.DateTimeFormat(LOCALE[lang], {timeZone: 'UTC', weekday: 'short'}).format(utcDay(day.date));
        return <li key={day.date} className={`eb-hw__d eb-hw__d--${day.when}${total ? '' : ' eb-hw__d--off'}`}>
          <span className="b-sr">{sentence(day, lang)}</span>
          <span className={`eb-hw__v${day.worked ? ' eb-hw__v--done' : ''}`} aria-hidden="true">{total ? hoursNumber(shown) : ''}</span>
          <span className="eb-hw__track" aria-hidden="true" style={{'--h': total ? Math.max(total / top, 0.08) : 0, '--f': total ? done / total : 0} as CSSProperties}>
            <span className="eb-hw__bar"><span className="eb-hw__fill" /></span>
          </span>
          <span className="eb-hw__l" aria-hidden="true">{label}</span>
        </li>;
      })}</ul>
      {/* The key names the two fills; the week's dates sit at its end when the header holds the Timecard link. */}
      <p className="eb-hw__key">
        <span className="eb-hw__keys" aria-hidden="true">{worked ? <span className="eb-hw__k eb-hw__k--done">{t.hoursWorked}</span> : null}<span className="eb-hw__k">{t.scheduledKey}</span></span>
        {time ? <span className="eb-hw__range">{range}</span> : null}
      </p>
    </div>
  </BCard>;
}
