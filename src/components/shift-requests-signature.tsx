import type { ReactNode } from "react";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { keepWhole } from "@/lib/keep-whole";
import { formatDayLabel, formatTime } from "@/lib/date-utils";
import { timeZoneLabel } from "@/lib/time-zone-label";
import type { ExchangeShift } from "@/lib/data/exchanges";
import { SigDay } from "./signature/signature";

/* Shift requests in the Signature style (phase 3, approved Oct 20, 2026; target:
 * docs/product/specs/employee-style/signature/phase-3/p3c-board-b.png). Compact pieces the page composes: a shift row's
 * copy (time, place, role, Lead), and the "You give / You get" ticket. Every fact ExchangeAssignment shows stays. */

const weekday = (date: string) => formatDayLabel(date).weekday;
const longWeekday = (date: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
/** "8:00 AM – 4:00 PM": each time stays whole; very large text may wrap between them. */
const range = (shift: ExchangeShift) => `${keepWhole(formatTime(shift.startTime))} – ${keepWhole(formatTime(shift.endTime))}`;

/** "Customer Support · Main Office", with Lead and a time zone note when the shift's zone isn't the workspace's. */
export function shiftPlace(shift: ExchangeShift, zone?: string) {
  const position = shift.positionName ?? (shift.positionId ? `Position ${shift.positionId}` : null);
  return [position, shift.locationName, shift.isDesignatedLead ? "Designated lead" : null, shift.timeZone && zone && shift.timeZone !== zone ? `Times in ${timeZoneLabel(shift.timeZone)}` : null].filter(Boolean).join(" · ");
}

export function ShiftDay({ shift }: { shift: ExchangeShift }) {
  return <SigDay top={weekday(shift.date)} day={Number(shift.date.slice(8))} />;
}

/** Row copy: the time in light figures, then where and as what; the date is read out for screen readers. */
export function ShiftCopy({ shift, zone, label, children }: { shift: ExchangeShift; zone?: string; label?: string; children?: ReactNode }) {
  const day = formatDayLabel(shift.date);
  return <span className="sg-copy">
    <span className="sg-time"><span className="nv-sr">{label ? `${label}: ` : ""}{day.weekday}, {day.day}, </span>{range(shift)}</span>
    <span>{shiftPlace(shift, zone)}</span>
    {children}
  </span>;
}

/** Two shifts side by side, set like a ticket: what you give and what you get. */
export function ShiftTicket({ give, get, giveLabel = "You give", getLabel = "You get", zone }: { give: ExchangeShift; get: ExchangeShift; giveLabel?: string; getLabel?: string; zone?: string }) {
  const half = (shift: ExchangeShift, label: string) => {
    const day = formatDayLabel(shift.date);
    return <div><small>{label}</small><b aria-hidden="true">{Number(shift.date.slice(8))}</b><span>{longWeekday(shift.date)}</span><span>{range(shift)}</span>
      <span className="nv-sr">{day.weekday}, {day.day}. </span><em>{shiftPlace(shift, zone)}</em></div>;
  };
  return <div className="sg-ticket">{half(give, giveLabel)}<i aria-hidden="true"><ArrowsLeftRightIcon size={18} /></i>{half(get, getLabel)}</div>;
}
