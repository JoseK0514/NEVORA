import {listPositions} from "@/lib/data/positions";
import { CreateShiftForm } from "@/components/create-shift-form";
import { ShiftWorkspace } from "@/components/shift-workspace";
import { ConfigurationForm } from "@/components/configuration-form";
import { UserCircleIcon } from "@phosphor-icons/react/dist/ssr/UserCircle";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { BriefcaseIcon } from "@phosphor-icons/react/dist/ssr/Briefcase";
import { MedalIcon } from "@phosphor-icons/react/dist/ssr/Medal";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import Link from "next/link";
import { createShiftAction } from "@/app/app/schedule/actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { decodeCoverageRepairReview, readCoverageRepairSelection } from "@/lib/data/coverage-repair.server";
import { coverageRepairUrl, CoverageRepairConflictError } from "@/lib/scheduling/coverage-repair";
import { listEmployees, listLocations } from "@/lib/data/employees";
import {
  addDays,
  formatDayLabel, formatTime, formatWeekRange,
  isDateInWeek,
  isValidWeekStart, weekStartFor,
} from "@/lib/date-utils";
import "./shift-workspace.css";

export default async function NewShiftPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    date?: string;
    employeeId?: string;
    locationId?: string;
    start?: string;
    end?: string;
    lead?: string;
    positionId?: string;
    review?: string;
  }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const params = await searchParams;
  if (params.review !== undefined) {
    const proof = await requireSessionMutationProof();
    let selected;
    try { selected = await readCoverageRepairSelection(params.review, proof); }
    catch (error) {
      if (!(error instanceof CoverageRepairConflictError)) throw error;
      let href = '/app/schedule';
      try { href = coverageRepairUrl(decodeCoverageRepairReview(params.review, proof).locator, true); } catch { /* No trusted locator. */ }
      return <ShiftWorkspace compact title="Coverage changed" description="Review the current gap before choosing a replacement." backHref="/app/schedule" backLabel="Back to schedule">
        <section className="shift-conflict-panel"><WarningCircleIcon size={36} aria-hidden="true" /><h2>This review is no longer current</h2><p>Refresh the review and select a current eligible replacement before saving.</p><Link className="shift-action primary" href={href}>Refresh coverage review</Link></section>
      </ShiftWorkspace>;
    }
    const { locator } = selected;
    const day = formatDayLabel(locator.date);
    const overnight = locator.endTime === "24:00" || locator.endTime < locator.startTime;
    const nextDay = overnight ? formatDayLabel(addDays(locator.date, 1)) : null;
    const refreshHref = coverageRepairUrl(locator, true);
    return <ShiftWorkspace compact title="Review replacement" description="Check the assignment details before saving." backHref={refreshHref} backLabel="Back to coverage review" context={formatWeekRange(locator.weekStart)}>
      <ConfigurationForm action={createShiftAction} className="shift-editor-form shift-replacement-form">
      <input type="hidden" name="coverageRepairReview" value={params.review} />
      {Object.entries({ weekStart: locator.weekStart, employeeId: selected.employeeId, locationId: locator.locationId,
        date: locator.date, startTime: locator.startTime, endTime: locator.endTime, positionId: locator.positionId ?? '',
        ...(selected.isDesignatedLead ? { isDesignatedLead: 'on' } : {}) }).map(([name, value]) => <input type="hidden" name={name} value={value} key={name} />)}
      <div className="shift-review-summary">
        <div className="shift-selected-person"><span className="shift-person-icon"><UserCircleIcon size={32} weight="duotone" aria-hidden="true" /></span><div><span className="shift-preview-label">Selected replacement</span><h2>{selected.employeeName}</h2><span className="shift-employee-id">{selected.employeeId}</span></div></div>
        <dl className="shift-review-terms">
          <div><dt><CalendarBlankIcon size={20} aria-hidden="true" />Date</dt><dd>{day.weekday}, {day.day}<small>{locator.date.slice(0, 4)}</small></dd></div>
          <div><dt><ClockIcon size={20} aria-hidden="true" />Time</dt><dd>{formatTime(locator.startTime)} – {formatTime(locator.endTime)}{nextDay ? <small>Ends {nextDay.weekday}, {nextDay.day}</small> : null}</dd></div>
          <div><dt><MapPinIcon size={20} aria-hidden="true" />Location</dt><dd>{selected.locationName}</dd></div>
          <div><dt><BriefcaseIcon size={20} aria-hidden="true" />Position</dt><dd>{selected.positionName ?? "No position required"}</dd></div>
          <div className="shift-review-lead"><dt><MedalIcon size={20} aria-hidden="true" />Shift Lead</dt><dd>{selected.isDesignatedLead ? "Designated Shift Lead required" : "Not required for this repair"}</dd></div>
        </dl>
        <div className="shift-review-notice"><InfoIcon size={22} aria-hidden="true" /><div><strong>{locator.target === "POSITION" ? "Fill this position requirement" : locator.target === "LEAD" ? "Fill the Lead requirement" : "Fill this staffing requirement"}</strong><p>This saves one replacement for the selected requirement. Remaining requirements stay visible in the gap.</p></div></div>
      </div>
      <footer className="shift-editor-footer"><p>The current coverage is checked again when you save.</p><div className="shift-editor-actions"><Link className="shift-action secondary" href={refreshHref}>Refresh coverage review</Link><button className="shift-action primary" type="submit"><CheckIcon size={18} aria-hidden="true" />Save replacement</button></div></footer>
    </ConfigurationForm></ShiftWorkspace>;
  }
  const workspace = await getWorkspace();
  const currentWeek = weekStartFor(businessDate(new Date(), workspace.timeZone));
  const weekStart = params.week && isValidWeekStart(params.week) ? params.week : currentWeek;
  const date =
    params.date && isDateInWeek(params.date, weekStart)
      ? params.date
      : weekStart;
  const weekEnd = addDays(weekStart, 6);

  const [employees, locations, positions] = await Promise.all([
    listEmployees(),
    listLocations(),
    listPositions(),
  ]);
  const locationId = locations.some(location => location.id === params.locationId) ? params.locationId! : "";
  const cancelHref = `/app/schedule?week=${weekStart}${locationId ? `&location=${encodeURIComponent(locationId)}` : ""}`;
  return (
    <ShiftWorkspace title="Create shift" description="Choose who’s working, where, and when." backHref={cancelHref} backLabel="Back to schedule" context={formatWeekRange(weekStart)}>
      <CreateShiftForm action={createShiftAction} employees={employees} locations={locations} positions={positions} weekStart={weekStart} weekEnd={weekEnd} date={date} employeeId={params.employeeId} positionId={params.positionId} locationId={locationId} startTime={params.start} endTime={params.end} isDesignatedLead={params.lead === "1"} cancelHref={cancelHref} />
    </ShiftWorkspace>
  );
}
