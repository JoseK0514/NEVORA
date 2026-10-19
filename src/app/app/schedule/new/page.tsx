import {listPositions} from "@/lib/data/positions";
import { keepDuration } from "@/components/wave-a/keep-duration";
import { CreateShiftForm } from "@/components/create-shift-form";
import { ConfigurationForm } from "@/components/configuration-form";
import { Card, PageBand } from "@/components/kit/kit";
import { Fact, Facts, FormActions, Notice } from "@/components/wave-a/parts";
import { PendingButton } from "@/components/wave-a/pending-button";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { keepWhole } from "@/lib/keep-whole";
import { durationText } from "@/lib/duration-text";
import Link from "next/link";
import { createShiftAction } from "@/app/app/schedule/actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { decodeCoverageRepairReview, readCoverageRepairSelection } from "@/lib/data/coverage-repair.server";
import { coverageRepairUrl, CoverageRepairConflictError } from "@/lib/scheduling/coverage-repair";
import { listEmployees, listLocations } from "@/lib/data/employees";
import {
  addDays, durationMinutes,
  formatDayLabel, formatTime, formatWeekRange,
  isDateInWeek,
  isValidWeekStart, weekStartFor,
} from "@/lib/date-utils";


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
      return <div className="nv-page wa-page wa-shift" data-nv-page="">
        <PageBand back={{ href, label: "Coverage" }} eyebrow="Replacement" title="Coverage changed" summary="Someone changed this shift since you opened the review." />
        <div className="nv-content wa-narrow">
          <Card title="This review is out of date">
            <div className="wa-card-body">
              <p className="wa-text">Open the review again to see who can cover it now. Nothing was saved.</p>
              <Link className="nv-btn" data-kind="primary" data-block="true" href={href}>Open current review</Link>
            </div>
          </Card>
        </div>
      </div>;
    }
    const { locator } = selected;
    const day = formatDayLabel(locator.date);
    const overnight = locator.endTime === "24:00" || locator.endTime < locator.startTime;
    const nextDay = overnight ? formatDayLabel(addDays(locator.date, 1)) : null;
    const refreshHref = coverageRepairUrl(locator, true);
    const need = locator.target === "POSITION" ? "the position requirement" : locator.target === "LEAD" ? "the lead requirement" : "the staffing requirement";
    return <div className="nv-page wa-page wa-shift" data-nv-page="">
      <PageBand back={{ href: refreshHref, label: "Coverage" }} eyebrow={keepWhole(formatWeekRange(locator.weekStart))} title="Review replacement"
        summary={`${selected.employeeName} for ${keepWhole(`${day.weekday},\u00a0${day.day}`)}.`} />
      <div className="nv-content wa-narrow">
      <ConfigurationForm action={createShiftAction} className="wa-form">
      <input type="hidden" name="coverageRepairReview" value={params.review} />
      {Object.entries({ weekStart: locator.weekStart, employeeId: selected.employeeId, locationId: locator.locationId,
        date: locator.date, startTime: locator.startTime, endTime: locator.endTime, positionId: locator.positionId ?? '',
        ...(selected.isDesignatedLead ? { isDesignatedLead: 'on' } : {}) }).map(([name, value]) => <input type="hidden" name={name} value={value} key={name} />)}
      <Card title="Replacement" id="replacement-shift">
        <Facts label="Replacement shift">
          <Fact label="Person">{selected.employeeName}</Fact>
          <Fact label="Day">{keepWhole(`${day.weekday},\u00a0${day.day}, ${locator.date.slice(0, 4)}`)}</Fact>
          <Fact label="Time">{keepWhole(`${formatTime(locator.startTime)} – ${formatTime(locator.endTime)}`)} <span className="wa-muted nv-keep">{"·\u00a0"}{keepDuration(durationMinutes(locator.startTime, locator.endTime))}</span>{nextDay ? <span className="wa-fact__more">{keepWhole(`Ends ${nextDay.weekday},\u00a0${nextDay.day}`)}</span> : null}</Fact>
          <Fact label="Location">{selected.locationName}</Fact>
          <Fact label="Position">{selected.positionName ?? "None needed"}</Fact>
          <Fact label="Shift lead">{selected.isDesignatedLead ? "Yes, needed" : "Not needed"}</Fact>
        </Facts>
      </Card>
      <Notice tone="info" quiet title={`This fills ${need}.`}>Anything else this shift still needs stays open on the schedule. Coverage is checked again when you save.</Notice>
      <FormActions>
        <PendingButton pending="Saving…" block>Save replacement</PendingButton>
        <Link className="nv-btn" data-kind="secondary" data-block="true" href={refreshHref}>Back to coverage</Link>
      </FormActions>
    </ConfigurationForm>
      </div>
    </div>;
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
  // W2: Back returns to the day and person the form was opened for, when it was opened for one.
  const cancelHref = `/app/schedule?week=${weekStart}${locationId ? `&location=${encodeURIComponent(locationId)}` : ""}${params.date === date ? `&day=${date}` : ""}${params.employeeId ? `#schedule-employee-${encodeURIComponent(params.employeeId)}` : ""}`;
  // Phase 3.5 Wave A: Add shift on the kit. The band names the week; the form is two cards and a summary.
  return (
    <div className="nv-page wa-page wa-shift" data-nv-page="">
      <PageBand back={{ href: cancelHref, label: "Schedule" }} eyebrow={keepWhole(formatWeekRange(weekStart))} title="Add shift" summary="Choose who’s working, where and when." />
      <div className="nv-content wa-wide">
        <CreateShiftForm action={createShiftAction} employees={employees} locations={locations} positions={positions} weekStart={weekStart} weekEnd={weekEnd} date={date} employeeId={params.employeeId} positionId={params.positionId} locationId={locationId} startTime={params.start} endTime={params.end} isDesignatedLead={params.lead === "1"} cancelHref={cancelHref} />
      </div>
    </div>
  );
}
