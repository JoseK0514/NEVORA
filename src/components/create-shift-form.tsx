"use client";

import { useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { ConfigurationForm, type ConfigurationResult } from "./configuration-form";
import { ShiftAssignmentFields, designatedLeadAfterEmployeeChange } from "./shift-assignment-fields";
import { addDays, durationMinutes, formatTime, isValidIsoDate } from "../lib/date-utils";
import type { Employee, Location, Position } from "../lib/domain";

export const CREATE_SHIFT_FORM_ID = "create-shift-form";

const dayText = (date: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

function hoursText(minutes: number) {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  const h = hours ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "";
  const m = rest ? `${rest} min` : "";
  return [h, m].filter(Boolean).join(" ") || "0 min";
}

/** A row whose value is a native date or time picker: the value reads in teal on the right, the picker opens on tap. */
function PickerRow({ label, type, name, value, onChange, display, min, max }: {
  label: string; type: "date" | "time"; name: string; value: string; onChange: (value: string) => void; display: string; min?: string; max?: string;
}) {
  return <li><label className="q-row q-row--one q-picker-row"><span className="q-rt"><b>{label}</b></span>
    <span className={display ? "q-rv q-rv--go" : "q-rv q-rv--ph"} aria-hidden="true">{display || "Choose"}</span>
    <input className="q-picker-row__input" type={type} name={name} value={value} min={min} max={max} required aria-label={label}
      onChange={event => onChange(event.target.value)}
      onClick={event => { try { event.currentTarget.showPicker?.(); } catch { /* Focus is enough where pickers can't open. */ } }} />
  </label></li>;
}

/** Quiet (v4, approved Oct 23): Add shift is a sheet. Who and where, then when, then the shift lead switch.
 * Cancel and Add sit in the bar; Add submits this form by its id. */
export function CreateShiftForm({ action, employees, locations, positions, weekStart, weekEnd, date, employeeId = "", positionId = "", locationId = "", startTime = "", endTime = "", isDesignatedLead = false, operationId }: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  /** B19: one id per opened form, so a retried save is recognised as the same shift. */
  operationId?: string;
  employees: Employee[]; locations: Location[]; positions: Position[];
  weekStart: string; weekEnd: string; date: string;
  employeeId?: string; positionId?: string; locationId?: string;
  startTime?: string; endTime?: string; isDesignatedLead?: boolean; cancelHref?: string;
}) {
  const [location, setLocation] = useState(locationId);
  const [day, setDay] = useState(date);
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime === "24:00" ? "00:00" : endTime);
  const [lead, setLead] = useState(isDesignatedLead);
  const overnight = !!start && !!end && end < start;
  const missingCatalog = !employees.some(item => item.active) || !locations.length;
  const nextDay = overnight && isValidIsoDate(day) ? dayText(addDays(day, 1)) : null;
  const length = start && end ? hoursText(durationMinutes(start, end)) : null;

  return <ConfigurationForm action={action} className="q-shift-form" id={CREATE_SHIFT_FORM_ID}>
    <input type="hidden" name="weekStart" value={weekStart} />
    {operationId ? <input type="hidden" name="shiftOperationId" value={operationId} /> : null}
    {missingCatalog ? <p className="q-error q-first" role="alert">{!locations.length ? "Add a location first. A shift needs one." : "Add an employee first. A shift needs someone to work it."}</p> : null}
    <div className="q-grp q-grp--m"><h2>Who and where</h2></div>
    <ul className="q-list">
      <ShiftAssignmentFields quiet employees={employees} positions={positions} employeeId={employeeId} positionId={positionId}
        onSelectionChange={next => setLead(current => designatedLeadAfterEmployeeChange({ checked: current, nextEmployeeId: next.employeeId, employees }))}>
        <li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Location</b></span>
          <select className={location ? "q-select-row__control" : "q-select-row__control q-select-row__control--ph"} name="locationId" value={location} required aria-label="Location" onChange={event => setLocation(event.target.value)}>
            <option value="" disabled>Choose</option>
            {locations.map(item => <option key={item.id} value={item.id}>{item.shortName}</option>)}
          </select><CaretRightIcon className="q-chev" aria-hidden="true" /></label></li>
      </ShiftAssignmentFields>
    </ul>
    <div className="q-grp"><h2>When</h2></div>
    <ul className="q-list">
      <PickerRow label="Date" type="date" name="date" value={day} onChange={setDay} display={isValidIsoDate(day) ? dayText(day) : ""} min={weekStart} max={weekEnd} />
      <PickerRow label="Starts" type="time" name="startTime" value={start} onChange={setStart} display={start ? formatTime(start) : ""} />
      <PickerRow label="Ends" type="time" name="endTime" value={end} onChange={setEnd} display={end ? formatTime(end) : ""} />
    </ul>
    <p className="q-help" aria-live="polite">{length ? (nextDay ? `${length}, ends ${nextDay}` : length) : `Any day from ${dayText(weekStart)} to ${dayText(weekEnd)}`}</p>
    <ul className="q-list q-shift-form__more">
      <li><label className="q-row q-row--one"><span className="q-rt"><b>Shift lead</b></span>
        <input type="checkbox" role="switch" className="q-tog" name="isDesignatedLead" checked={lead} onChange={event => setLead(event.target.checked)} aria-label="Shift lead" /></label></li>
    </ul>
  </ConfigurationForm>;
}

export const EDIT_SHIFT_FORM_ID = "edit-shift-form";

/** Edit shift on the same Quiet sheet as Add shift (Oct 25, 2026): the same rows, prefilled. A shift keeps its location,
 * so Location reads as a fixed row. Notes stay editable. Same fields and action as before (shiftId, employeeId,
 * positionId, isDesignatedLead, date, startTime, endTime, notes). */
export function EditShiftForm({ action, shiftId, employees, positions, weekStart, weekEnd, date, employeeId, positionId = "", locationName, startTime, endTime, isDesignatedLead, notes = "" }: {
  action: (data: FormData) => Promise<ConfigurationResult>;
  shiftId: string; employees: Employee[]; positions: Position[];
  weekStart: string; weekEnd: string; date: string; employeeId: string; positionId?: string; locationName: string;
  startTime: string; endTime: string; isDesignatedLead: boolean; notes?: string;
}) {
  const [day, setDay] = useState(date);
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime === "24:00" ? "00:00" : endTime);
  const [lead, setLead] = useState(isDesignatedLead);
  const [person, setPerson] = useState(employeeId);
  const overnight = !!start && !!end && end < start;
  const nextDay = overnight && isValidIsoDate(day) ? dayText(addDays(day, 1)) : null;
  const length = start && end ? hoursText(durationMinutes(start, end)) : null;
  const chosen = employees.find(item => item.id === person);
  const fullName = chosen ? `${chosen.firstName} ${chosen.lastName}` : "";

  return <ConfigurationForm action={action} className="q-shift-form" id={EDIT_SHIFT_FORM_ID}>
    <input type="hidden" name="shiftId" value={shiftId} />
    <div className="q-grp q-grp--m"><h2>Who and where</h2></div>
    <ul className="q-list">
      <ShiftAssignmentFields quiet employees={employees} positions={positions} employeeId={employeeId} positionId={positionId}
        onSelectionChange={next => { setPerson(next.employeeId); setLead(current => designatedLeadAfterEmployeeChange({ checked: current, nextEmployeeId: next.employeeId, employees })); }}>
        <li><div className="q-row q-row--one"><span className="q-rt"><b>Location</b></span><span className="q-rv">{locationName}</span></div></li>
      </ShiftAssignmentFields>
    </ul>
    {/* A native select can cut a long name; the full name is read and shown here. */}
    <p className="q-help" aria-live="polite">{fullName.length > 24 ? <>Selected employee: {fullName}. </> : null}A shift keeps its location. To move it, delete it and add a new one.</p>
    <div className="q-grp"><h2>When</h2></div>
    <ul className="q-list">
      <PickerRow label="Date" type="date" name="date" value={day} onChange={setDay} display={isValidIsoDate(day) ? dayText(day) : ""} min={weekStart} max={weekEnd} />
      <PickerRow label="Starts" type="time" name="startTime" value={start} onChange={setStart} display={start ? formatTime(start) : ""} />
      <PickerRow label="Ends" type="time" name="endTime" value={end} onChange={setEnd} display={end ? formatTime(end) : ""} />
    </ul>
    <p className="q-help" aria-live="polite">{length ? (nextDay ? `${length}, ends ${nextDay}` : length) : `Any day from ${dayText(weekStart)} to ${dayText(weekEnd)}`}</p>
    <ul className="q-list q-shift-form__more">
      <li><label className="q-row q-row--one"><span className="q-rt"><b>Shift lead</b></span>
        <input type="checkbox" role="switch" className="q-tog" name="isDesignatedLead" checked={lead} onChange={event => setLead(event.target.checked)} aria-label="Shift lead" /></label></li>
    </ul>
    <div className="q-fl">
      <label className="q-fl__label" htmlFor="edit-shift-notes">Notes <span className="q-fl__opt">· optional</span></label>
      <textarea id="edit-shift-notes" className="q-in" name="notes" rows={3} defaultValue={notes} placeholder="Anything the team should know" />
    </div>
    <p className="q-help">Everyone on this shift can read the notes. Availability, time off, other shifts and weekly hours are checked when you save.</p>
  </ConfigurationForm>;
}
