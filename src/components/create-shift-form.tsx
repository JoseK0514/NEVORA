"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CalendarPlusIcon } from "@phosphor-icons/react/dist/ssr/CalendarPlus";
import { UserCircleIcon } from "@phosphor-icons/react/dist/ssr/UserCircle";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { BriefcaseIcon } from "@phosphor-icons/react/dist/ssr/Briefcase";
import { MedalIcon } from "@phosphor-icons/react/dist/ssr/Medal";
import { ConfigurationForm, type ConfigurationResult } from "./configuration-form";
import { SelectField } from "./select-field";
import { ShiftAssignmentFields, designatedLeadAfterEmployeeChange } from "./shift-assignment-fields";
import { formatDayLabel, formatTime, isValidIsoDate } from "../lib/date-utils";
import type { Employee, Location, Position } from "../lib/domain";

export function CreateShiftForm({ action, employees, locations, positions, weekStart, weekEnd, date, employeeId = "", positionId = "", locationId = "", startTime = "", endTime = "", isDesignatedLead = false, cancelHref }: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  employees: Employee[]; locations: Location[]; positions: Position[];
  weekStart: string; weekEnd: string; date: string;
  employeeId?: string; positionId?: string; locationId?: string;
  startTime?: string; endTime?: string; isDesignatedLead?: boolean; cancelHref: string;
}) {
  const [assignment, setAssignment] = useState({ employeeId, positionId });
  const [location, setLocation] = useState(locationId);
  const [day, setDay] = useState(date);
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime === "24:00" ? "00:00" : endTime);
  const [lead, setLead] = useState(isDesignatedLead);
  const employee = employees.find(item => item.id === assignment.employeeId);
  const position = positions.find(item => item.id === assignment.positionId);
  const selectedLocation = locations.find(item => item.id === location);
  const selectedDay = isValidIsoDate(day) ? formatDayLabel(day) : null;
  const overnight = !!start && !!end && end < start;
  const missingCatalog = !employees.some(item => item.active) || !locations.length;

  return <ConfigurationForm action={action} className="shift-editor-form">
    <input type="hidden" name="weekStart" value={weekStart} />
    <div className="shift-editor-layout">
      <div className="shift-editor-fields">
        {missingCatalog ? <p className="shift-catalog-notice" role="status">{!locations.length ? "Add an active location before creating a shift." : "Add an active employee before creating a shift."}</p> : null}
        <section className="shift-field-group" aria-labelledby="shift-assignment-heading">
          <div className="shift-group-heading"><UserCircleIcon size={22} aria-hidden="true" /><div><h2 id="shift-assignment-heading">Assignment</h2><p>Choose where and who.</p></div></div>
          <SelectField className="new-shift-field" name="locationId" label="Location" value={location} required onChange={event => setLocation(event.target.value)}
            options={[{ value: "", label: "Select location", disabled: true }, ...locations.map(item => ({ value: item.id, label: item.shortName }))]} />
          <div className="shift-assignment-grid">
            <ShiftAssignmentFields employees={employees} positions={positions} employeeId={employeeId} positionId={positionId} newShift
              onSelectionChange={next => { setAssignment(next); setLead(current => designatedLeadAfterEmployeeChange({ checked: current, nextEmployeeId: next.employeeId, employees })); }} />
          </div>
        </section>
        <section className="shift-field-group" aria-labelledby="shift-timing-heading">
          <div className="shift-group-heading"><CalendarBlankIcon size={22} aria-hidden="true" /><div><h2 id="shift-timing-heading">Date &amp; time</h2><p>Times use the workspace’s time zone.</p></div></div>
          <label className="new-shift-field"><span>Date</span><input type="date" name="date" value={day} onChange={event => setDay(event.target.value)} min={weekStart} max={weekEnd} required /></label>
          <div className="shift-time-grid">
            <label className="new-shift-field"><span>Start Time</span><input type="time" name="startTime" value={start} onChange={event => setStart(event.target.value)} required /></label>
            <label className="new-shift-field"><span>End Time</span><input type="time" name="endTime" value={end} onChange={event => setEnd(event.target.value)} required /></label>
          </div>
          {overnight ? <p className="shift-field-hint">This shift ends the following day.</p> : null}
        </section>
        <label className="shift-lead-control"><input type="checkbox" name="isDesignatedLead" checked={lead} onChange={event => setLead(event.target.checked)} /><span><strong>Designated Shift Lead</strong><small>For an Owner, Manager, or Lead.</small></span><MedalIcon size={22} aria-hidden="true" /></label>
      </div>
      <aside className="shift-preview" aria-label="Shift preview">
        <span className="shift-preview-label">Draft preview</span><h2>Shift at a glance</h2>
        <div className="shift-preview-date"><span className="shift-date-tile" aria-hidden="true"><span>{selectedDay?.weekday ?? "Day"}</span><strong>{selectedDay ? day.slice(8) : "—"}</strong></span><div><strong>{selectedDay ? selectedDay.day : "Choose a date"}</strong><span>{start && end ? `${formatTime(start)} – ${formatTime(end)}` : "Set start and end times"}</span>{overnight ? <small>Ends the following day</small> : null}</div></div>
        <div className="shift-preview-person"><UserCircleIcon size={28} aria-hidden="true" /><div><strong>{employee ? `${employee.firstName} ${employee.lastName}` : "Choose an employee"}</strong><span>{employee ? employee.id : "Your selection will appear here"}</span></div></div>
        <dl className="shift-preview-terms"><div><dt><MapPinIcon size={18} aria-hidden="true" />Location</dt><dd>{selectedLocation?.shortName ?? "Choose a location"}</dd></div><div><dt><BriefcaseIcon size={18} aria-hidden="true" />Position</dt><dd>{position?.name ?? "No position"}</dd></div><div><dt><MedalIcon size={18} aria-hidden="true" />Shift Lead</dt><dd>{lead ? "Designated Lead" : "Not designated"}</dd></div></dl>
        <p className="shift-preview-note">Availability, qualifications, and schedule conflicts are checked when you save.</p>
      </aside>
    </div>
    <footer className="shift-editor-footer"><p>Review the details, then save your shift.</p><div className="shift-editor-actions"><Link className="shift-action secondary" href={cancelHref}>Cancel</Link><button className="shift-action primary" type="submit" disabled={missingCatalog}><CalendarPlusIcon size={18} aria-hidden="true" />Save Shift</button></div></footer>
  </ConfigurationForm>;
}
