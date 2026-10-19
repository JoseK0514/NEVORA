import { timeZoneLabel } from '@/lib/time-zone-label';
import type { ExchangeShift } from '@/lib/data/exchanges';
import { addDays, formatDayLabel, formatTime } from '@/lib/date-utils';
import { keepWhole } from '@/lib/keep-whole';
import { MetaParts } from '@/components/kit/kit';

export function swapDateLabel(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

export function swapTimeLabel(shift: ExchangeShift) {
  const overnight = shift.endTime.slice(0, 5) < shift.startTime.slice(0, 5) || shift.endTime.slice(0, 5) === '24:00';
  const endDate = formatDayLabel(addDays(shift.date, 1));
  return `${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}${overnight ? ` (${endDate.weekday}, ${endDate.day})` : ''}`;
}

export function swapPositionLabel(shift: ExchangeShift) {
  return shift.positionName ?? (shift.positionId ? `Position ${shift.positionId}` : 'No assigned position');
}

/** One side of a swap: the label ("You give"), the day, the time, then who, where and what. Times never split. */
export function SwapShiftSummary({ shift, label, employee = false }: { shift: ExchangeShift; label: string; employee?: boolean }) {
  const details = [employee ? shift.employeeName : null, shift.locationName, swapPositionLabel(shift), shift.isDesignatedLead ? 'Designated lead' : 'No designated Lead'].filter(Boolean) as string[];
  return <section className="wa-shift" aria-label={label}>
    <p className="wa-shift__label">{label}</p>
    <p className="wa-shift__when"><time dateTime={shift.date}>{keepWhole(swapDateLabel(shift.date))}</time></p>
    <p className="wa-shift__when wa-shift__time">{keepWhole(swapTimeLabel(shift))}</p>
    <p className="wa-shift__where"><MetaParts text={details.join(' · ')} /></p>
    {shift.timeZone ? <p className="wa-shift__where">Times in {timeZoneLabel(shift.timeZone)}</p> : null}
  </section>;
}
