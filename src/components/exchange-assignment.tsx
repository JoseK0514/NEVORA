import type { ExchangeShift } from "@/lib/data/exchanges";
import { timeZoneLabel } from '@/lib/time-zone-label';
import { formatDayLabel, formatTime } from "@/lib/date-utils";
import { NavIcon } from "./nav-icon";

export function ExchangeAssignment({ shift, label }: { shift: ExchangeShift; label?: string }) {
  const day = formatDayLabel(shift.date);
  return <div className="exchange-assignment">
    {label ? <p className="exchange-assignment-label">{label}</p> : null}
    <div className="exchange-assignment-date"><NavIcon name="schedule" size={18} /><span>{day.weekday}, {day.day}</span></div>
    <strong className="exchange-assignment-time">{formatTime(shift.startTime)} <span>–</span> {formatTime(shift.endTime)}</strong>
    <span className="exchange-assignment-detail"><NavIcon name="location" size={16} />{shift.locationName}</span>
    <span className="exchange-assignment-detail"><NavIcon name="shift" size={16} />{shift.positionName ?? (shift.positionId ? `Position ${shift.positionId}` : "No assigned position")}</span>
    <span className="exchange-assignment-lead">{shift.isDesignatedLead ? "Designated lead" : "No designated Lead"}</span>
    {shift.timeZone ? <span className="exchange-assignment-zone">Times in {timeZoneLabel(shift.timeZone)}</span> : null}
  </div>;
}
