import Link from "next/link";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import type { ReactNode } from "react";
import type { OperationalAuthorityView, OperationalScheduleData } from "@/lib/company-access/model";
import { addDays, formatDayLabel, formatTime, formatWeekRange, weekDates } from "@/lib/date-utils";
import { durationText } from "@/lib/duration-text";
import { CorpButtonLink, CorpCard, CorpEmptyRow, CorpPage, CorpPill, CorpRow, CorpRows, CorpTime, CorpTitle } from "@/components/corp/corp";
import { ManagerClockMonitor } from "@/components/manager-clock-monitor";
import { SelectField } from "@/components/select-field";
import { ScopedReadFrame, type ScopedObservation } from "./scoped-read-frame";
import "./scoped-b.css";

/** An open shift this week, as readScopedCoverageGaps returns it; null when that read failed. */
export type ScopedOpenShift = { id: string; title: string; detail: string; href: string };

const placeName = (locations: { name: string; shortName?: string }[]) => locations.length === 1 ? (locations[0].shortName || locations[0].name) : null;

/** Open shifts with their Find cover links; the one card both screens share (each fact once per screen). */
function OpenShiftsCard({ openShifts, limit, moreHref }: { openShifts: ScopedOpenShift[] | null | undefined; limit?: number; moreHref?: string }) {
  if (openShifts === undefined) return null;
  if (openShifts === null) return <CorpCard label="Open shifts"><CorpEmptyRow>Couldn’t check open shifts. Reload to try again.</CorpEmptyRow></CorpCard>;
  const shown = limit ? openShifts.slice(0, limit) : openShifts;
  return <CorpCard label="Open shifts" count={openShifts.length || undefined} id="open-shifts">
    {openShifts.length ? <CorpRows label="Open shifts">
      {shown.map(shift => <li key={shift.id}><CorpRow title={shift.title} detail={shift.detail} href={shift.href}
        trail={<span className="c-scoped__cta">Find cover</span>} label={`Find cover: ${shift.title}, ${shift.detail}`} /></li>)}
      {moreHref && openShifts.length > shown.length ? <li><CorpRow title={`See all ${openShifts.length}`} href={moreHref} one /></li> : null}
    </CorpRows> : <CorpEmptyRow>Every shift this week is covered.</CorpEmptyRow>}
  </CorpCard>;
}

/** Home for a Manager limited to some locations (Phase 2 direction A, Nov 22, 2026): the same Direction B page as the
 * other Managers', limited to their place. The band names the place, open shifts this week come first with Find cover,
 * then shortcuts and who's clocked in. Same reads as before plus this week's open shifts (readScopedCoverageGaps, the
 * read the Schedule already uses). No explanation of what company-wide access adds: the closed pages say it where it applies. */
export function ScopedHomeB({ view, openShifts, scheduleHref }: {
  view: Extract<OperationalAuthorityView, { state: "ready" }>; openShifts?: ScopedOpenShift[] | null; scheduleHref: string;
}) {
  const place = placeName(view.locations);
  return <CorpPage className="c-scoped c-scoped-home" labelledBy="scoped-home-title">
    <ScopedReadFrame observation={view}>
      <CorpTitle id="scoped-home-title" title={place ?? "Home"} sub={place ? undefined : view.locations.map(l => l.shortName || l.name).join(" · ")} />
      <OpenShiftsCard openShifts={openShifts} limit={3} moreHref={scheduleHref + "#open-shifts"} />
      <CorpCard label="Shortcuts">
        <CorpRows label="Shortcuts">
          <li><CorpRow title="Schedule" icon={<CalendarDotsIcon weight="bold" />} href={scheduleHref} /></li>
          <li><CorpRow title="Add shift" icon={<PlusIcon weight="bold" />} href="/app/schedule/new" /></li>
          <li><CorpRow title="Team" icon={<UsersThreeIcon weight="bold" />} href="/app/employees" /></li>
        </CorpRows>
      </CorpCard>
      <ManagerClockMonitor />
    </ScopedReadFrame>
  </CorpPage>;
}

/** Schedule for a Manager limited to some locations (Phase 2 direction A): the week, open shifts with Find cover, then
 * each day's shifts as rows (name; time and position), drafts marked, and each person's hours at these locations.
 * One place: its name sits under the title and the location filter is gone. Several: the filter stays. */
export function ScopedScheduleB({ data, observation, feedback, publishHref, openShifts }: {
  data: OperationalScheduleData; observation: ScopedObservation; feedback?: ReactNode; publishHref?: string; openShifts?: ScopedOpenShift[] | null;
}) {
  const query = (week: string) => "/app/schedule?" + new URLSearchParams({ week, ...(data.selectedLocationId ? { location: data.selectedLocationId } : {}) });
  const create = "/app/schedule/new?" + new URLSearchParams({ week: data.weekStart, ...(data.selectedLocationId ? { locationId: data.selectedLocationId } : {}) });
  const place = placeName(data.locations);
  const many = data.locations.length > 1;
  const locationName = (id: string) => { const l = data.locations.find(x => x.id === id); return l ? (l.shortName || l.name) : "Location unavailable"; };
  const hours = [...data.roster].sort((a, b) => b.scheduledMinutesInScope - a.scheduledMinutesInScope);
  const working = hours.filter(p => p.scheduledMinutesInScope > 0), idle = hours.length - working.length;
  return <CorpPage className="c-scoped c-scoped-schedule" labelledBy="scoped-schedule-title">
    <ScopedReadFrame observation={observation}>
      <CorpTitle id="scoped-schedule-title" title="Schedule" sub={[place, formatWeekRange(data.weekStart)].filter(Boolean).join(" · ")}
        actions={<>
          {publishHref ? <CorpButtonLink href={publishHref} kind="secondary" size="md">Publish</CorpButtonLink> : null}
          <CorpButtonLink href={create} size="md"><PlusIcon className="c-ic" weight="bold" aria-hidden="true" />Add shift</CorpButtonLink>
        </>} />
      {feedback}
      <nav className="c-scoped__week" aria-label="Schedule week">
        <Link className="c-scoped__step" href={query(addDays(data.weekStart, -7))} aria-label="Previous week"><CaretLeftIcon weight="bold" aria-hidden="true" /></Link>
        <strong>{formatWeekRange(data.weekStart)}</strong>
        <Link className="c-scoped__step" href={query(addDays(data.weekStart, 7))} aria-label="Next week"><CaretRightIcon weight="bold" aria-hidden="true" /></Link>
      </nav>
      {many ? <form method="get" action="/app/schedule" className="c-scoped__filter">
        <input type="hidden" name="week" value={data.weekStart} />
        <SelectField label="Location" name="location" defaultValue={data.selectedLocationId ?? "all"}
          options={[{ value: "all", label: "All your locations" }, ...data.locations.map(l => ({ value: l.id, label: l.shortName || l.name }))]} />
        <button className="c-btn c-btn--secondary c-btn--md" type="submit">Show</button>
      </form> : null}
      <OpenShiftsCard openShifts={openShifts} />
      {weekDates(data.weekStart).map(date => {
        const shifts = data.shifts.filter(s => s.date === date);
        const day = formatDayLabel(date);
        return <CorpCard key={date} label={`${day.weekday}, ${day.day}`} count={shifts.length || undefined}>
          {shifts.length ? <CorpRows label={`Shifts on ${day.weekday}, ${day.day}`}>
            {shifts.map(shift => <li key={shift.id}><CorpRow title={shift.employeeName}
              detail={<><CorpTime start={formatTime(shift.startTime)} end={formatTime(shift.endTime)} />{[shift.positionName, many ? locationName(shift.locationId) : null].filter(Boolean).map(t => ` · ${t}`).join("")}</>}
              trail={shift.scheduleStatus === "DRAFT" ? <CorpPill tone="amber">Draft</CorpPill> : shift.isCalloutApproved ? <CorpPill>Call-out approved</CorpPill> : undefined}
              href={"/app/schedule/edit?" + new URLSearchParams({ shiftId: shift.id })} chevron
              label={`${shift.employeeName}, ${day.weekday} ${day.day}, ${formatTime(shift.startTime)} to ${formatTime(shift.endTime)}`} /></li>)}
          </CorpRows> : <CorpEmptyRow>No shifts</CorpEmptyRow>}
        </CorpCard>;
      })}
      <CorpCard label="Hours this week" id="scoped-hours">
        {working.length ? <CorpRows label="Hours this week">
          {working.map(p => <li key={p.id}><CorpRow title={`${p.firstName} ${p.lastName}`} value={durationText(p.scheduledMinutesInScope)} valueTone="ink" one /></li>)}
          {idle ? <li><CorpEmptyRow as="div">{`${idle} ${idle === 1 ? "person has" : "people have"} no shifts`}</CorpEmptyRow></li> : null}
        </CorpRows> : <CorpEmptyRow>No one is scheduled this week.</CorpEmptyRow>}
      </CorpCard>
    </ScopedReadFrame>
  </CorpPage>;
}
