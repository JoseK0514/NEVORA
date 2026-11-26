import Link from 'next/link';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { formatDayLabel, formatTime } from '../lib/date-utils';
import { REASON_TEXT, REASON_TEXT_ES } from '../lib/shift-changes/eligibility-reasons';
import './blocked-open-shifts.css';
import type { PortalLang } from '@/lib/i18n/portal-lang';
import { SMALL_PARTS_COPY } from './small-parts-copy';

export type BlockedOpenShift = { id: string; date: string; startTime: string; endTime: string; location: string; position: string | null; reasons?: string[] };

/** Open shifts the claim rules refuse (B3), collapsed under the claimable ones.
 * Each names the rules that refused it. There is no claim action here. */
export function BlockedOpenShifts({ shifts, availabilityHref = '/app/availability', lang = 'en' }: { shifts: BlockedOpenShift[]; availabilityHref?: string | null; /** Signed-in Spanish: the person's language (English when left out). */ lang?: PortalLang }) {
  const t = SMALL_PARTS_COPY[lang].blocked;
  if (!shifts.length) return null;
  const availability = availabilityHref && shifts.some(shift => (shift.reasons?.includes(REASON_TEXT.availability) || shift.reasons?.includes(REASON_TEXT_ES.availability)));
  return <details className="blocked-open-shifts">
    <summary>
      <span>{t.whyOthers} <span className="blocked-open-count">{shifts.length}</span></span>
      <CaretDownIcon size={16} weight="bold" aria-hidden="true" />
    </summary>
    <ul className="blocked-open-list">
      {shifts.map(shift => {
        const label = formatDayLabel(shift.date);
        return <li key={shift.id} className="blocked-open-shift">
          <time className="blocked-open-date" dateTime={shift.date}><span>{label.weekday}</span><strong>{Number(shift.date.slice(8))}</strong></time>
          <div className="blocked-open-copy">
            <strong>{formatTime(shift.startTime)} <span aria-hidden="true">–</span> {formatTime(shift.endTime)}</strong>
            <span className="blocked-open-place"><MapPinIcon size={16} weight="bold" aria-hidden="true" />{shift.location}{shift.position ? ` · ${shift.position}` : ''}</span>
            <ul className="blocked-open-reasons" aria-label={t.whyThis}>{(shift.reasons ?? []).map(reason => <li key={reason}>{reason}</li>)}</ul>
          </div>
        </li>;
      })}
    </ul>
    {availability ? <p className="blocked-open-note">{t.changed} <Link href={availabilityHref!}>{t.update} <span aria-hidden="true">›</span></Link></p> : null}
  </details>;
}
