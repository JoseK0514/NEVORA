import Link from 'next/link';
import type {ReactNode} from 'react';
import {WORK_COPY, workCopy} from './work-copy';
import {formatTime} from '@/lib/date-utils';
import {esTime, LOCALE, type FormatLang} from './es-format';

/* Small shared pieces for the Employee Direction B phone screens. */

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);

/** "08:00" → "8:00 AM"; "24:00" → "12:00 AM" (the one time format, date-utils formatTime); "8:00 a. m." in Spanish. */
export function wallTime(time: string, lang: FormatLang = 'en') {
  return esTime(formatTime(time), lang);
}

/** A day as a row's lead: "SAT" over "7". Today's number is teal. */
export function BDay({date, today, past, pick, spoken, lang = 'en'}: {date: string; today?: boolean; past?: boolean; lang?: FormatLang;
  /** Phase 4 (EM-013): the day the desktop Schedule's day card shows (the chosen day, else today). */ pick?: boolean;
  /** Gaps G66: the day is part of its row's name ("Tue 24 9:00 AM – 5:00 PM …"), for a row named by what it shows. A row
   * with its own label keeps the day hidden. */ spoken?: boolean}) {
  const at = utcDay(date);
  return <span className={`b-day eb-day${today ? ' eb-day--today' : ''}${past ? ' eb-day--past' : ''}${pick ? ' eb-day--pick' : ''}`} aria-hidden={spoken ? undefined : 'true'}>
    <span>{new Intl.DateTimeFormat(LOCALE[lang], {timeZone: 'UTC', weekday: 'short'}).format(at)}</span>{spoken ? <span className="b-sr"> </span> : null}<b>{at.getUTCDate()}</b>
  </span>;
}

/** A value on a row's right: "8 h 02" in tabular figures. */
export function BValue({children, sub}: {children: ReactNode; sub?: ReactNode}) {
  return <><b>{children}</b>{sub ? <span>{sub}</span> : null}</>;
}

/** "Customer Support · Main Office": each segment kept whole, and a "·" only between segments on the same line. Each
 * segment carries its dot in front; the line is pulled left by one dot's width and clipped, so the dot that would start
 * a line (the first, or one after a wrap) falls outside and never shows. Screen readers hear a comma between segments.
 * Phase 4 (EM-015): a Lead's "Shift lead" marker reads "Lead" on phones, so the line stays one line. */
export function Dotted({text, lang = 'en'}: {text: string; lang?: FormatLang}) {
  // Phase 9: a line that arrives already kept whole ("Thu,\u00a0Dec\u00a03\u00a0· 9:00\u00a0AM…", keepWhole) is split at its dots
  // too, so the time is its own segment and moves to the next line whole; as one segment it broke after "·" and its
  // second line started under the clipped dot ("00 AM – 12:00 PM" on a phone's Requests rows).
  const parts = text.split(/[ \u00a0\u202f]·[ \u00a0\u202f]/);
  return <span className="eb-dots"><span className="eb-dots__in">{parts.map((part, index) =>
    <span key={index} className="eb-dots__p"><span className="eb-dots__sep" aria-hidden="true">·</span>{index ? <span className="b-sr">, </span> : null}
      {part === WORK_COPY.en.shiftLead || part === WORK_COPY.es.shiftLead ? <><span className="eb-lead-l">{part}</span><span className="eb-lead-s">{workCopy(part === WORK_COPY.es.shiftLead ? 'es' : lang).leadShort}</span></> : part}</span>)}</span></span>;
}

/** Phase 8 (review C, rows 14 and 24), Nov 23, 2026: one rule for a time range on every screen. Each half stays whole
 * and, where the line is too short for the range, it breaks after the dash ("9:02 AM –" over "now"), never before it
 * or inside a time. `text` is a range as the kit writes it ("9:00 AM – 5:00 PM", also after keepWhole or compactRange);
 * anything else is drawn as it is. Screen readers hear the dash between the halves. */
export function Range({text}: {text: string}) {
  const halves = text.split(/[\s\u00a0]+–[\s\u00a0]+/);
  if (halves.length !== 2 || !halves[0] || !halves[1]) return <>{text}</>;
  return <><span className="eb-nb">{`${halves[0]}\u00a0–`}</span> <span className="eb-nb">{halves[1]}</span></>;
}

/** "2026-11-17 22:20": an instant as the wall clock reads it in `zone`. */
function wallAt(at: string, zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date(at));
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '00';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}
export type WallShift = {date: string; startTime: string; endTime: string};
/** Today's published shift that has already ended while the person is still clocked in since before its end (the Nov 14
 * inspection's rule on Home: an open punch hours past the shift read as normal). Phase 8 (review C, row 10): shared, so
 * Time's Right now says what Home says. A later shift today that has not started is the next shift's business. No rule
 * about how long is too long. */
export function shiftEndedWhileOpen({shifts, today, zone, observedAt, clockInAt}: {shifts: readonly WallShift[]; today: string; zone: string; observedAt: string; clockInAt: string}): WallShift | null {
  const nowWall = wallAt(observedAt, zone), inWall = wallAt(clockInAt, zone);
  if (inWall.slice(0, 10) !== today || shiftUnderway({shifts,today,zone,observedAt})) return null;
  const ended = shifts.filter(shift => shift.date === today && shift.endTime > shift.startTime && `${shift.date} ${shift.endTime}` <= nowWall && inWall < `${shift.date} ${shift.endTime}`)
    .sort((a, b) => b.endTime.localeCompare(a.endTime))[0];
  const later = shifts.some(shift => shift.date === today && `${shift.date} ${shift.startTime}` > nowWall);
  return ended && !later ? {date: ended.date, startTime: ended.startTime, endTime: ended.endTime} : null;
}

/** Phase 9: minutes from a wall time today (`date` at "HH:MM" in `zone`) to `observedAt`; negative before it. */
export function wallMinutesSince({date, time, zone, observedAt}: {date: string; time: string; zone: string; observedAt: string}) {
  const now = wallAt(observedAt, zone);
  const minutes = (wall: string) => Date.UTC(Number(wall.slice(0, 4)), Number(wall.slice(5, 7)) - 1, Number(wall.slice(8, 10)), Number(wall.slice(11, 13)), Number(wall.slice(14, 16))) / 60_000;
  return Math.round(minutes(now) - minutes(`${date} ${time}`));
}
/** Phase 9 (spec 1.4): today's published shift that has started and not ended (wall times), for "Not clocked in · 12 min"
 * when there is no open punch; null when none is under way. */
export function shiftUnderway({shifts, today, zone, observedAt}: {shifts: readonly WallShift[]; today: string; zone: string; observedAt: string}): WallShift | null {
  const nowWall = wallAt(observedAt, zone);
  return shifts.filter(shift => shift.date === today && shift.endTime > shift.startTime && `${shift.date} ${shift.startTime}` <= nowWall && nowWall < `${shift.date} ${shift.endTime}`)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] ?? null;
}
/** "12 min" under an hour, then whole hours ("5 h"): how long a live state has lasted, as the chips say it. */
export function sinceSpan(minutes: number) {
  return minutes < 60 ? `${Math.max(minutes, 0)} min` : `${Math.floor(minutes / 60)} h`;
}

/** A quiet line inside a card, under its rows (a hint, or what a list means). It is drawn as the card's footer note
 * (employee-b-account.css, EM-018): the kit's footer form, on the card's text edge, 12px above and 16px below. */
export function BCardNote({children, center}: {children: ReactNode; center?: boolean}) {
  return <p className={center ? 'eb-cardnote eb-cardnote--center' : 'eb-cardnote'}>{children}</p>;
}

/** The action row at the foot of a list: a teal plus or pencil, then its words ("Request time off"). */
export function BAddRow({href, icon, children, label, onClick}: {href?: string; icon: ReactNode; children: ReactNode; label?: string; onClick?: () => void}) {
  const body = <><span className="b-ico b-ico--teal" aria-hidden="true">{icon}</span>{children}</>;
  if (href) return <li className="b-li"><Link className="b-add" href={href} aria-label={label}>{body}</Link></li>;
  return <li className="b-li"><button type="button" className="b-add eb-add-btn" aria-label={label} onClick={onClick}>{body}</button></li>;
}
