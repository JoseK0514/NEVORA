import { CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { timeZoneLabel } from '@/lib/time-zone-label';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { MedalIcon } from '@phosphor-icons/react/dist/ssr/Medal';
import { UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import type { ExchangeShift } from '@/lib/data/exchanges';
import { addDays, formatDayLabel, formatTime } from '@/lib/date-utils';

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

export function SwapShiftSummary({ shift, label, employee = false }: { shift: ExchangeShift; label: string; employee?: boolean }) {
  return <section className="swap-assignment" aria-label={label}>
    <p className="swap-assignment-label">{label}</p>
    <p className="swap-assignment-date"><CalendarBlankIcon size={18} aria-hidden="true" /><time dateTime={shift.date}>{swapDateLabel(shift.date)}</time></p>
    <strong className="swap-assignment-time">{swapTimeLabel(shift)}</strong>
    <ul className="swap-assignment-details">
      {employee ? <li><UserCircleIcon size={18} aria-hidden="true" /><span>{shift.employeeName}</span></li> : null}
      <li><MapPinIcon size={18} aria-hidden="true" /><span>{shift.locationName}</span></li>
      <li><BriefcaseIcon size={18} aria-hidden="true" /><span>{swapPositionLabel(shift)}</span></li>
      <li><MedalIcon size={18} aria-hidden="true" /><span>{shift.isDesignatedLead ? 'Designated lead' : 'No designated Lead'}</span></li>
    </ul>
    {shift.timeZone ? <p className="swap-timezone">Times in {timeZoneLabel(shift.timeZone)}</p> : null}
  </section>;
}
