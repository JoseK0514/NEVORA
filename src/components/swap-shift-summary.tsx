import { timeZoneLabel } from '@/lib/time-zone-label';
import type { ExchangeShift } from '@/lib/data/exchanges';
import type { PortalLang } from '@/lib/i18n/portal-lang';
import { swapCopy } from './swap-copy';
import { keepWhole } from '@/lib/keep-whole';
import { MetaParts } from '@/components/kit/kit';

/** `lang` (Signed-in Spanish): the person's language; English when left out. */
export function swapDateLabel(date: string, lang: PortalLang = 'en') {
  return swapCopy(lang).dateLabel(date);
}

export function swapTimeLabel(shift: Pick<ExchangeShift,'date'|'startTime'|'endTime'>, lang: PortalLang = 'en') {
  const overnight = shift.endTime.slice(0, 5) < shift.startTime.slice(0, 5) || shift.endTime.slice(0, 5) === '24:00';
  return swapCopy(lang).timeLabel(shift.date, shift.startTime, shift.endTime, overnight);
}

export function swapPositionLabel(shift: Pick<ExchangeShift,'positionName'|'positionId'>, lang: PortalLang = 'en') {
  const t = swapCopy(lang);
  return shift.positionName ?? (shift.positionId ? t.position(shift.positionId) : t.noPosition);
}

/** One side of a swap: the label ("You give"), the day, the time, then who, where and what. Times never split. */
export function SwapShiftSummary({ shift, label, employee = false }: { shift: ExchangeShift; label: string; employee?: boolean }) {
  const details = [employee ? shift.employeeName : null, shift.locationName, swapPositionLabel(shift), shift.isDesignatedLead ? 'Shift lead' : null].filter(Boolean) as string[];
  return <section className="wa-shift" aria-label={label}>
    <p className="wa-shift__label">{label}</p>
    <p className="wa-shift__when"><time dateTime={shift.date}>{keepWhole(swapDateLabel(shift.date))}</time></p>
    <p className="wa-shift__when wa-shift__time">{keepWhole(swapTimeLabel(shift)).replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun), /g, '$1,\u00a0')}</p>
    <p className="wa-shift__where"><MetaParts text={details.join(' · ')} /></p>
    {shift.timeZone ? <p className="wa-shift__where">Times in {timeZoneLabel(shift.timeZone)}</p> : null}
  </section>;
}

/** Signature (phase 3): "Thu, Oct 22" for the band's figure. */
export function swapBandDay(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

/** Signature (phase 3): the band's line under the date: time, place, position, Lead and any other time zone. */
export function swapBandLine(shift: ExchangeShift) {
  return [keepWhole(swapTimeLabel(shift)), shift.locationName, swapPositionLabel(shift), shift.isDesignatedLead ? 'Shift lead' : null, shift.timeZone ? `Times in ${timeZoneLabel(shift.timeZone)}` : null].filter(Boolean).join(' · ');
}

/** Signature (phase 3): one half of the give/receive ticket. Every fact SwapShiftSummary shows stays. */
export function SwapHalf({ shift, label, employee = false }: { shift: ExchangeShift; label: string; employee?: boolean }) {
  const details = [employee ? shift.employeeName : null, shift.locationName, swapPositionLabel(shift), shift.isDesignatedLead ? 'Shift lead' : null].filter(Boolean) as string[];
  return <section aria-label={label}>
    <small>{label}</small>
    <b aria-hidden="true">{Number(shift.date.slice(8))}</b>
    <span><time dateTime={shift.date}>{new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${shift.date}T12:00:00Z`))}<span className="nv-sr">, {swapDateLabel(shift.date)}</span></time></span>
    <span>{keepWhole(swapTimeLabel(shift))}</span>
    <em>{details.join(' · ')}{shift.timeZone ? ` · ${timeZoneLabel(shift.timeZone)}` : ''}</em>
  </section>;
}
