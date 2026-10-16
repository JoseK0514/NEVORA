import type { PublicationChange, PublishedShiftSnapshot } from '../lib/assistance/publication-diff';
import { formatDayLabel, formatTime } from '../lib/date-utils';
const labels: Record<PublicationChange['type'], string> = { ADDED: 'Shift added', REMOVED: 'Shift removed', TIME_CHANGED: 'Time changed', EMPLOYEE_REASSIGNED: 'Assignment changed', LOCATION_CHANGED: 'Location changed', POSITION_CHANGED: 'Position changed', LEAD_CHANGED: 'Lead assignment changed', CALLOUT_CHANGED: 'Call-out changed' };
function shiftDescription(shift: PublishedShiftSnapshot | undefined, locationNames: Readonly<Record<string, string>>) {
  if (!shift) return 'No shift';
  return `${formatDayLabel(shift.date).day} · ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)} · ${locationNames[shift.locationId]?.trim() || 'Location unavailable'}${shift.positionName ? ` · ${shift.positionName}` : ''}${shift.isDesignatedLead ? ' · Designated lead' : ''}${shift.isCalloutApproved ? ' · Call-out approved' : ''}`;
}
export function SchedulePublicationChange({ changes, locationNames = {} }: { changes: readonly PublicationChange[]; locationNames?: Readonly<Record<string, string>> }) {
  if (!changes.length) return null;
  return <details className="schedule-publication-change"><summary>What changed in your schedule</summary><ul>{changes.map((change, index) => <li key={index}><strong>{labels[change.type]}</strong><span>Before: {shiftDescription(change.before, locationNames)}</span><span>After: {shiftDescription(change.after, locationNames)}</span></li>)}</ul></details>;
}
