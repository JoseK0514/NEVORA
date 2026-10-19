import { addDays, formatDayLabel, formatTime } from "@/lib/date-utils";
import { durationText } from "@/lib/duration-text";
import { keepWhole } from "@/lib/keep-whole";
import { timeZoneLabel } from "@/lib/time-zone-label";
import { durationMinutes } from "@/lib/date-utils";

export type ShiftBlockShift = {
  date: string;
  startTime: string;
  endTime: string;
  locationName: string;
  positionName?: string;
  positionId?: string;
  isDesignatedLead?: boolean;
  timeZone?: string;
  employeeName?: string;
};

/** One shift as two lines: when, then where and what. Times never split (keepWhole); overnight shifts name the end day. */
export function ShiftBlock({ shift, label, showPerson = false }: { shift: ShiftBlockShift; label?: string; showPerson?: boolean }) {
  const day = formatDayLabel(shift.date);
  const overnight = shift.endTime.slice(0, 5) < shift.startTime.slice(0, 5) || shift.endTime.slice(0, 5) === "24:00";
  const ends = overnight ? formatDayLabel(addDays(shift.date, 1)) : null;
  const position = shift.positionName ?? (shift.positionId ? `Position ${shift.positionId}` : null);
  const where = [showPerson ? shift.employeeName : null, shift.locationName, position, shift.isDesignatedLead ? "Shift lead" : null].filter(Boolean) as string[];
  return <div className="wa-shift">
    {label ? <p className="wa-shift__label">{label}</p> : null}
    <p className="wa-shift__when">
      <span className="nv-keep">{keepWhole(`${day.weekday}, ${day.day}`)}</span>{" "}
      <span className="nv-keep">{keepWhole(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`)}</span>{" "}
      <span className="wa-shift__length">· {durationText(durationMinutes(shift.startTime, shift.endTime))}</span>
    </p>
    <p className="wa-shift__where">{where.map((part, index) => <span className="nv-keep" key={index}>{part}{index < where.length - 1 ? " ·" : ""} </span>)}</p>
    {ends ? <p className="wa-shift__where">{keepWhole(`Ends ${ends.weekday}, ${ends.day}`)}</p> : null}
    {shift.timeZone ? <p className="wa-shift__where">Times in {timeZoneLabel(shift.timeZone)}</p> : null}
  </div>;
}
