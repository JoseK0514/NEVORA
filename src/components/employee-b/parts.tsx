import Link from 'next/link';
import type {ReactNode} from 'react';

/* Small shared pieces for the Employee Direction B phone screens. */

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);

/** "08:00" → "8:00 AM"; "24:00" → "12:00 AM". */
export function wallTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 || h === 24 ? 'AM' : 'PM'}`;
}

/** A day as a row's lead: "SAT" over "7". Today's number is teal. */
export function BDay({date, today, past}: {date: string; today?: boolean; past?: boolean}) {
  const at = utcDay(date);
  return <span className={`b-day eb-day${today ? ' eb-day--today' : ''}${past ? ' eb-day--past' : ''}`} aria-hidden="true">
    <span>{new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday: 'short'}).format(at)}</span><b>{at.getUTCDate()}</b>
  </span>;
}

/** A value on a row's right: "8 h 02" in tabular figures. */
export function BValue({children, sub}: {children: ReactNode; sub?: ReactNode}) {
  return <><b>{children}</b>{sub ? <span>{sub}</span> : null}</>;
}

/** "Customer Support · Main Office" with each segment kept whole and each "·" leading the segment after it, so a line
 * never ends in a dot. */
export function Dotted({text}: {text: string}) {
  const parts = text.split(' · ');
  return <>{parts.map((part, index) => <span key={index}>{index ? ' ' : ''}<span className="eb-nowrap">{index ? '·\u00a0' : ''}{part}</span></span>)}</>;
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
