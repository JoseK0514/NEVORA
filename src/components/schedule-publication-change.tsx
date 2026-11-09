import type { PublicationChange, PublishedShiftSnapshot } from '../lib/assistance/publication-diff';
import { keepWhole } from '@/lib/keep-whole';
import { formatDayLabel, formatTime } from '../lib/date-utils';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';

/* Upscale S6 (Nov 1): one row per change, said plainly. "Added · Mon, Nov 2" with the shift under it
 * ("8:00 AM – 4:00 PM · Barista · Condado"); an edit adds what it was ("Was 9:00 AM – 5:00 PM"). Display only: the
 * changes are the server's publication diff, unchanged. */
const verbs: Record<PublicationChange['type'], string> = { ADDED: 'Added', REMOVED: 'Removed', TIME_CHANGED: 'New time', EMPLOYEE_REASSIGNED: 'Reassigned', LOCATION_CHANGED: 'New location', POSITION_CHANGED: 'New position', LEAD_CHANGED: 'Lead changed', CALLOUT_CHANGED: 'Can’t work updated' };

/** "Mon, Nov 2". */
const day = (date: string) => { const label = formatDayLabel(date); return `${label.weekday}, ${label.day}`; };
const range = (shift: PublishedShiftSnapshot) => `${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`;

/** "8:00 AM – 4:00 PM · Barista · Condado", plus lead and can't-work facts. */
function shiftLine(shift: PublishedShiftSnapshot, locationNames: Readonly<Record<string, string>>) {
  return keepWhole([range(shift), shift.positionName, locationNames[shift.locationId]?.trim() || 'Location unavailable', shift.isDesignatedLead ? 'Shift lead' : null, shift.isCalloutApproved ? 'Can’t work approved' : null].filter(Boolean).join(' · '));
}

/** What an edited shift was, naming only what changed when that is one thing. */
function was(change: PublicationChange, locationNames: Readonly<Record<string, string>>) {
  const { before, after } = change;
  if (!before || !after) return null;
  if (change.type === 'TIME_CHANGED') return keepWhole(`Was ${before.date !== after.date ? `${day(before.date)} · ` : ''}${range(before)}`);
  if (change.type === 'LOCATION_CHANGED') return keepWhole(`Was ${locationNames[before.locationId]?.trim() || 'Location unavailable'}`);
  if (change.type === 'POSITION_CHANGED') return before.positionName ? keepWhole(`Was ${before.positionName}`) : 'Had no position';
  return keepWhole(`Was ${day(before.date)} · ${shiftLine(before, locationNames)}`);
}

export function SchedulePublicationChange({ changes, locationNames = {} }: { changes: readonly PublicationChange[]; locationNames?: Readonly<Record<string, string>> }) {
  if (!changes.length) return null;
  return <details className="schedule-publication-change"><summary><span>What changed in your schedule</span><CaretDownIcon className="em-publication-caret" size={20} aria-hidden="true"/></summary><ul>{changes.map((change, index) => {
    const shift = change.after ?? change.before;
    const moved = change.type === 'TIME_CHANGED' && change.before && change.after && change.before.date !== change.after.date;
    const prior = change.type === 'ADDED' || change.type === 'REMOVED' ? null : was(change, locationNames);
    return <li key={index}>
      <strong>{keepWhole(`${moved ? 'Moved' : verbs[change.type]}${shift ? ` · ${day(shift.date)}` : ''}`)}</strong>
      {shift ? <span>{shiftLine(shift, locationNames)}</span> : null}
      {prior ? <span>{prior}</span> : null}
    </li>;
  })}</ul></details>;
}
