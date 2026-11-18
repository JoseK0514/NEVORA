import Link from 'next/link';
import type {ReactNode} from 'react';
import {workCopy} from './work-copy';

/* Small shared pieces for the Employee Direction B phone screens. */

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);

/** "08:00" → "8:00 AM"; "24:00" → "12:00 AM". */
export function wallTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 || h === 24 ? 'AM' : 'PM'}`;
}

/** A day as a row's lead: "SAT" over "7". Today's number is teal. */
export function BDay({date, today, past, pick}: {date: string; today?: boolean; past?: boolean;
  /** Phase 4 (EM-013): the day the desktop Schedule's day card shows (the chosen day, else today). */ pick?: boolean}) {
  const at = utcDay(date);
  return <span className={`b-day eb-day${today ? ' eb-day--today' : ''}${past ? ' eb-day--past' : ''}${pick ? ' eb-day--pick' : ''}`} aria-hidden="true">
    <span>{new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday: 'short'}).format(at)}</span><b>{at.getUTCDate()}</b>
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
export function Dotted({text}: {text: string}) {
  const parts = text.split(' · ');
  return <span className="eb-dots"><span className="eb-dots__in">{parts.map((part, index) =>
    <span key={index} className="eb-dots__p"><span className="eb-dots__sep" aria-hidden="true">·</span>{index ? <span className="b-sr">, </span> : null}
      {part === 'Shift lead' ? <><span className="eb-lead-l">Shift lead</span><span className="eb-lead-s">{workCopy().leadShort}</span></> : part}</span>)}</span></span>;
}

/** Phase 8 (review C, rows 14 and 24): one rule for a time range on the Employee and Lead screens. Each half stays whole
 * and, where the line is too short for the range, it breaks before the dash ("9:02 AM" over "– now"), never after it,
 * as the Schedule's day blocks already did (EM-014). `text` is a range as the kit writes it ("9:00 AM – 5:00 PM", also
 * after keepWhole or compactRange); anything else is drawn as it is. Screen readers hear the dash between the halves. */
export function Range({text}: {text: string}) {
  // A compact range written without spaces ("12–8 PM") is one token and stays whole.
  const halves = text.split(/[\s\u00a0]+–[\s\u00a0]+/);
  if (halves.length !== 2 || !halves[0] || !halves[1]) return <>{text}</>;
  return <><span className="eb-nb">{halves[0]}</span> <span className="eb-nb">{`–\u00a0${halves[1]}`}</span></>;
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
  if (inWall.slice(0, 10) !== today) return null;
  const ended = shifts.filter(shift => shift.date === today && shift.endTime > shift.startTime && `${shift.date} ${shift.endTime}` <= nowWall && inWall < `${shift.date} ${shift.endTime}`)
    .sort((a, b) => b.endTime.localeCompare(a.endTime))[0];
  const later = shifts.some(shift => shift.date === today && `${shift.date} ${shift.startTime}` > nowWall);
  return ended && !later ? {date: ended.date, startTime: ended.startTime, endTime: ended.endTime} : null;
}

/** A quiet line inside a card, under its rows (a hint, or what a list means). */
export function BCardNote({children, center}: {children: ReactNode; center?: boolean}) {
  return <p className={center ? 'eb-cardnote eb-cardnote--center' : 'eb-cardnote'}>{children}</p>;
}

/** The action row at the foot of a list: a teal plus or pencil, then its words ("Request time off"). */
export function BAddRow({href, icon, children, label, onClick}: {href?: string; icon: ReactNode; children: ReactNode; label?: string; onClick?: () => void}) {
  const body = <><span className="b-ico b-ico--teal" aria-hidden="true">{icon}</span>{children}</>;
  if (href) return <li className="b-li"><Link className="b-add" href={href} aria-label={label}>{body}</Link></li>;
  return <li className="b-li"><button type="button" className="b-add eb-add-btn" aria-label={label} onClick={onClick}>{body}</button></li>;
}
