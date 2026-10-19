"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfigurationForm, type ConfigurationResult } from "./configuration-form";
import { SelectField } from "./select-field";
import { ShiftAssignmentFields, designatedLeadAfterEmployeeChange } from "./shift-assignment-fields";
import { Card } from "./kit/kit";
import { Fact, Facts, Field, FieldPair, FormActions, Notice } from "./wave-a/parts";
import { PendingButton } from "./wave-a/pending-button";
import { addDays, durationMinutes, formatDayLabel, formatTime, isValidIsoDate } from "../lib/date-utils";
import { durationText } from "../lib/duration-text";
import { keepWhole } from "../lib/keep-whole";
import type { Employee, Location, Position } from "../lib/domain";

/** Phase 3.5 Wave A: Add shift on the kit. Who and where, then when, then a summary of what will be saved. */
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
  const nextDay = overnight && selectedDay ? formatDayLabel(addDays(day, 1)) : null;

  return <ConfigurationForm action={action} className="wa-form">
    <input type="hidden" name="weekStart" value={weekStart} />
    <div className="wa-split">
      <div className="wa-split__main">
        {missingCatalog ? <Notice tone="review" title={!locations.length ? "Add a location first" : "Add an employee first"}>
          {!locations.length ? "A shift needs an active location." : "A shift needs an active employee."}
        </Notice> : null}
        <Card title="Who and where" id="shift-who">
          <div className="wa-fields">
            <SelectField className="wa-select" name="locationId" label="Location" value={location} required onChange={event => setLocation(event.target.value)}
              options={[{ value: "", label: "Choose a location", disabled: true }, ...locations.map(item => ({ value: item.id, label: item.shortName }))]} />
            <ShiftAssignmentFields employees={employees} positions={positions} employeeId={employeeId} positionId={positionId}
              onSelectionChange={next => { setAssignment(next); setLead(current => designatedLeadAfterEmployeeChange({ checked: current, nextEmployeeId: next.employeeId, employees })); }} />
            <label className="wa-check">
              <input type="checkbox" name="isDesignatedLead" checked={lead} onChange={event => setLead(event.target.checked)} />
              <span className="wa-check__text"><span className="wa-check__title">Shift lead</span><span className="wa-check__help">Only an Owner, Manager or Lead can lead a shift.</span></span>
            </label>
          </div>
        </Card>
        <Card title="When" id="shift-when">
          <div className="wa-fields">
            <Field label="Date" help={`Days in this schedule week: ${keepWhole(formatDayLabel(weekStart).day)} – ${keepWhole(formatDayLabel(weekEnd).day)}.`} helpId="shift-date-help">
              <input type="date" name="date" value={day} onChange={event => setDay(event.target.value)} min={weekStart} max={weekEnd} required aria-describedby="shift-date-help" />
            </Field>
            <FieldPair>
              <Field label="Starts"><input type="time" name="startTime" value={start} onChange={event => setStart(event.target.value)} required /></Field>
              <Field label="Ends"><input type="time" name="endTime" value={end} onChange={event => setEnd(event.target.value)} required /></Field>
            </FieldPair>
            <p className="wa-hint" aria-live="polite">{overnight && nextDay ? keepWhole(`Ends the next day, ${nextDay.weekday}, ${nextDay.day}.`) : "Times are in the workspace’s time zone."}</p>
          </div>
        </Card>
      </div>
      <aside className="wa-split__side" aria-label="Shift summary">
        <Card title="Summary" id="shift-summary">
          <Facts label="Shift summary">
            <Fact label="Day">{selectedDay ? keepWhole(`${selectedDay.weekday}, ${selectedDay.day}`) : <span className="wa-muted">Choose a date</span>}</Fact>
            <Fact label="Time">{start && end ? <>{keepWhole(`${formatTime(start)} – ${formatTime(end)}`)} <span className="wa-muted">· {durationText(durationMinutes(start, end))}</span></> : <span className="wa-muted">Choose times</span>}</Fact>
            <Fact label="Person">{employee ? `${employee.firstName} ${employee.lastName}` : <span className="wa-muted">Choose someone</span>}</Fact>
            <Fact label="Location">{selectedLocation?.shortName ?? <span className="wa-muted">Choose a location</span>}</Fact>
            <Fact label="Position">{position?.name ?? <span className="wa-muted">None</span>}</Fact>
            <Fact label="Shift lead">{lead ? "Yes" : "No"}</Fact>
          </Facts>
          <p className="wa-card-note">Availability, time off, other shifts and weekly hours are checked when you save.</p>
        </Card>
      </aside>
      <div className="wa-split__actions">
        <FormActions>
          <PendingButton pending="Saving…" disabled={missingCatalog} block>Save shift</PendingButton>
          <Link className="nv-btn" data-kind="secondary" data-block="true" href={cancelHref}>Cancel</Link>
        </FormActions>
      </div>
    </div>
  </ConfigurationForm>;
}
