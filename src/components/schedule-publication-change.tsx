import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import type { PublicationChange, PublishedShiftSnapshot } from '../lib/assistance/publication-diff';
import { keepWhole } from '@/lib/keep-whole';
import { formatDayLabel, formatTime } from '../lib/date-utils';
const labels: Record<PublicationChange['type'], string> = { ADDED: 'Shift added', REMOVED: 'Shift removed', TIME_CHANGED: 'Time changed', EMPLOYEE_REASSIGNED: 'Assignment changed', LOCATION_CHANGED: 'Location changed', POSITION_CHANGED: 'Position changed', LEAD_CHANGED: 'Lead assignment changed', CALLOUT_CHANGED: 'Call-out changed' };
/** TCD-21: a short place name ("Main Office") never breaks inside itself; a long one may. */
const placeName=(name:string)=>name.length<=24?name.replace(/ /g,'\u00a0'):name;

function shiftDescription(shift: PublishedShiftSnapshot | undefined, locationNames: Readonly<Record<string, string>>) {
  if (!shift) return 'No shift';
  return `${formatDayLabel(shift.date).day} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)} · ${placeName(locationNames[shift.locationId]?.trim() || 'Location unavailable')}${shift.positionName ? ` · ${shift.positionName}` : ''}${shift.isDesignatedLead ? ' · Designated lead' : ''}${shift.isCalloutApproved ? ' · Call-out approved' : ''}`;
}
/** "5 new shifts" when every change is an addition, else "3 changes" (UX-E-25). */
export function changeSummary(changes: readonly PublicationChange[]) {
  if (changes.every(change => change.type === 'ADDED')) return `${changes.length} new ${changes.length === 1 ? 'shift' : 'shifts'}`;
  if (changes.every(change => change.type === 'REMOVED')) return `${changes.length} ${changes.length === 1 ? 'shift' : 'shifts'} removed`;
  return `${changes.length} ${changes.length === 1 ? 'change' : 'changes'}`;
}

/** What changed since you last confirmed, as one row that opens the list (visual #41, UX-E-25). Additions read as the
 * new shift alone; every other change keeps its before and after. */
export function SchedulePublicationChange({ changes, locationNames = {} }: { changes: readonly PublicationChange[]; locationNames?: Readonly<Record<string, string>> }) {
  if (!changes.length) return null;
  return <details className="schedule-publication-change q-details"><summary className="q-row">
    <span className="q-rt"><b>What changed</b><i>{changeSummary(changes)}</i></span>
    <CaretRightIcon className="q-chev" aria-hidden="true" />
  </summary><ul>{changes.map((change, index) => <li key={index}><strong>{labels[change.type]}</strong>
    {change.type === 'ADDED' ? <span>{keepWhole(shiftDescription(change.after, locationNames))}</span> : <>
      <span>Before: {keepWhole(shiftDescription(change.before, locationNames))}</span>
      <span>After: {keepWhole(shiftDescription(change.after, locationNames))}</span>
    </>}</li>)}</ul></details>;
}
