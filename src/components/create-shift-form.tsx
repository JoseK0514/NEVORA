"use client";

import "./quiet/u2.css";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { ConfigurationForm, type ConfigurationResult } from "./configuration-form";
import { designatedLeadAfterEmployeeChange, positionAfterEmployeeChange } from "./shift-assignment-fields";
import { QuietSheet, useSheetClose } from "./quiet/quiet-sheet";
import { addDays, durationMinutes, formatTime, isValidIsoDate, weekStartFor } from "../lib/date-utils";
import type { Employee, Location, Position } from "../lib/domain";

/* New shift and Edit shift (Quiet v4 AddShift.png; Team U2, Oct 25, 2026: T-4, P2-11, F16, UX-O-21). One form in two modes:
 * Cancel · title · Add/Save in the bar (Save waits for a change and spins while saving), Who and where, When, Shift lead,
 * Note. Same action fields as before: weekStart (new), shiftId (edit), employeeId, locationId (new), positionId, date,
 * startTime, endTime, isDesignatedLead, notes. Break and Repeat weekly are left out: the shift actions don't store them. */

export const CREATE_SHIFT_FORM_ID = "create-shift-form";
export const EDIT_SHIFT_FORM_ID = "edit-shift-form";

const dayText = (date: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const LEAD_ROLES = ["OWNER", "MANAGER", "LEAD"];
/** People the shift actions can find: active, with an id the action reads back unchanged (F16). */
export const schedulable = (employee: Employee) => employee.active && employee.id === employee.id.trim().toUpperCase();
const fullName = (employee: Employee) => `${employee.firstName} ${employee.lastName}`;

function hoursText(minutes: number) {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  const h = hours ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "";
  const m = rest ? `${rest} min` : "";
  return [h, m].filter(Boolean).join(" ") || "0 min";
}
/** "8:00 AM"; the end of the day reads "midnight". */
const clock = (time: string) => time === "00:00" || time === "24:00" ? "midnight" : formatTime(time);

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

function SelectRow({ label, name, value, onChange, required, placeholder, children, ink }: { label: string; name: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; ink?: boolean; children: ReactNode }) {
  return <li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>{label}</b></span>
    <select className={`q-select-row__control${!value && placeholder ? " q-select-row__control--ph" : ink ? " q-select-row__control--ink" : ""}`} name={name} value={value} required={required} aria-label={label} onChange={event => onChange(event.target.value)}>
      {placeholder ? <option value="" disabled>{placeholder}</option> : null}
      {children}
    </select><CaretRightIcon className="q-chev" aria-hidden="true" /></label></li>;
}

/** P2-11: the Note row (value "Optional" or the note's start) opens a text sheet; Cancel puts the old text back. */
function NoteRow({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const before = useRef(value);
  return <li>
    <button type="button" className="q-row q-row--one q-row--btn" aria-haspopup="dialog" onClick={() => { before.current = value; setOpen(true); }}>
      <span className="q-rt"><b>Note</b></span>
      <span className={`q-rv q-rv--l u2-note-value${value.trim() ? "" : " u2-note-value--ph"}`}>{value.trim() || "Optional"}</span>
      <CaretRightIcon className="q-chev" aria-hidden="true" />
    </button>
    {/* The text area is part of the form even while its sheet is closed. */}
    <QuietSheet open={open} label="Note" onClose={() => setOpen(false)}>
      <NoteBar onCancel={() => onChange(before.current)} />
      <div className="q-fl q-first">
        <label className="q-fl__label" htmlFor="shift-note">Everyone on this shift can read it.</label>
        <textarea id="shift-note" className="q-in" name="notes" rows={4} value={value} maxLength={1000} placeholder="Anything the team should know" onChange={event => onChange(event.target.value)} />
      </div>
    </QuietSheet>
  </li>;
}
function NoteBar({ onCancel }: { onCancel: () => void }) {
  const close = useSheetClose();
  return <div className="q-nav">
    <button type="button" className="q-nav__l q-nav__l--teal" onClick={() => { onCancel(); close?.(); }}>Cancel</button>
    <h2 className="q-nav__t u2-sheet-title">Note</h2>
    <button type="button" className="q-nav__r q-nav__r--b" onClick={() => close?.()}>Done</button>
  </div>;
}

type Common = {
  action: (data: FormData) => Promise<ConfigurationResult>;
  employees: Employee[]; positions: Position[];
  weekStart: string; weekEnd: string; date: string;
  employeeId?: string; positionId?: string; startTime?: string; endTime?: string; isDesignatedLead?: boolean; notes?: string;
  /** Where Cancel goes (the schedule's day and person). */
  cancelHref?: string;
  /** Under the bar: an error from the last save (the route's own message). */
  notice?: ReactNode;
};

function ShiftForm(props: Common & { mode: "new"; locations: Location[]; locationId?: string } | Common & { mode: "edit"; shiftId: string; locationId: string; locationName: string }) {
  const { action, employees, positions, weekStart, weekEnd, mode } = props;
  const formId = mode === "new" ? CREATE_SHIFT_FORM_ID : EDIT_SHIFT_FORM_ID;
  const [location, setLocation] = useState(props.locationId ?? "");
  const [person, setPerson] = useState(props.employeeId ?? "");
  const [position, setPosition] = useState(props.positionId ?? "");
  const [day, setDay] = useState(props.date);
  const [start, setStart] = useState(props.startTime ?? "");
  const [end, setEnd] = useState(props.endTime === "24:00" ? "00:00" : props.endTime ?? "");
  const [lead, setLead] = useState(props.isDesignatedLead ?? false);
  const [note, setNote] = useState(props.notes ?? "");

  // F16: only people the action can schedule, and (with a location) only people who can work there. Editing keeps the
  // current assignee listed so the row never reads blank.
  const people = employees.filter(employee => schedulable(employee) && (!location || !employee.eligibleLocationIds?.length || employee.eligibleLocationIds.includes(location) || employee.id === props.employeeId));
  const chosen = employees.find(employee => employee.id === person);
  const choices = positions.filter(item => item.active && chosen?.positionIds?.includes(item.id));
  const retained = !!position && !choices.some(item => item.id === position);
  const canLead = !chosen || LEAD_ROLES.includes(chosen.role);

  const changePerson = (next: string) => {
    const nextEmployee = employees.find(employee => employee.id === next);
    let nextPosition = positionAfterEmployeeChange({ positionId: position, nextEmployeeId: next, employees, positions });
    // UX-O-21: a person with one position brings it; a new shift without a location takes the person's own.
    const own = positions.filter(item => item.active && nextEmployee?.positionIds?.includes(item.id));
    if (!nextPosition && own.length === 1) nextPosition = own[0].id;
    setPerson(next);
    setPosition(nextPosition);
    setLead(current => designatedLeadAfterEmployeeChange({ checked: current, nextEmployeeId: next, employees }));
    if (mode === "new" && !location && nextEmployee && props.locations.some(item => item.id === nextEmployee.primaryLocationId)) setLocation(nextEmployee.primaryLocationId);
  };
  const changeLocation = (next: string) => {
    setLocation(next);
    const current = employees.find(employee => employee.id === person);
    if (current && current.eligibleLocationIds?.length && !current.eligibleLocationIds.includes(next)) { setPerson(""); setPosition(""); setLead(false); }
  };

  // UX-O-21: a new shift can go on any day; the week it belongs to follows the date, and the schedule opens on it after saving.
  const formWeek = mode === "new" && isValidIsoDate(day) ? weekStartFor(day) : weekStart;
  // An end before the start finishes the next day; "midnight" already says so, so only other ends name the day.
  const nextDay = !!start && !!end && end < start && end !== "00:00" && isValidIsoDate(day) ? dayText(addDays(day, 1)) : null;
  const length = start && end ? hoursText(durationMinutes(start, end)) : null;
  const range = mode === "edit" ? `Any day from ${dayText(weekStart)} to ${dayText(weekEnd)}` : null;
  const help = [length ? (nextDay ? `${length}, ends ${nextDay}` : length) : "Choose when it starts and ends", range].filter(Boolean).join(" · ");

  // Edit: Save waits for a change (T-4). The first values are the server's; any edit compares against them.
  const [initial] = useState(() => JSON.stringify([props.employeeId ?? "", props.positionId ?? "", props.date, props.startTime ?? "", props.endTime === "24:00" ? "00:00" : props.endTime ?? "", props.isDesignatedLead ?? false, props.notes ?? ""]));
  // The form needs scripts to send (it saves without a page load), so Save can start disabled.
  const dirty = JSON.stringify([person, position, day, start, end, lead, note]) !== initial;
  const missingCatalog = mode === "new" && (!employees.some(schedulable) || !props.locations.length);
  const saveDisabled = mode === "new" ? missingCatalog : !dirty;

  return <div className="u2-shift">
    <div className="q-nav">
      <Link className="q-nav__l q-nav__l--teal" href={props.cancelHref ?? `/app/schedule?week=${weekStart}`}>Cancel</Link>
      <span className="q-nav__t">{mode === "new" ? "New shift" : "Edit shift"}</span>
      <button type="submit" form={formId} className="q-nav__r q-nav__r--b u2-save" disabled={saveDisabled}><span className="u2-save__label">{mode === "new" ? "Add" : "Save"}</span><span className="u2-spin u2-save__spin" aria-hidden="true" /></button>
    </div>
    {props.notice}
    <ConfigurationForm action={action} className="q-shift-form" id={formId}>
      {mode === "new" ? <input type="hidden" name="weekStart" value={formWeek} /> : <input type="hidden" name="shiftId" value={props.shiftId} />}
      {missingCatalog ? <p className="q-error q-first" role="alert">{!props.locations.length ? "Add a location first. A shift needs one." : "Add an employee first. A shift needs someone to work it."}</p> : null}
      <div className="q-grp q-grp--m"><h2>Who and where</h2></div>
      <ul className="q-list">
        <SelectRow label="Person" name="employeeId" value={person} onChange={changePerson} required placeholder="Choose" ink>
          {people.map(item => <option key={item.id} value={item.id}>{fullName(item)}</option>)}
        </SelectRow>
        {mode === "new" ? <SelectRow label="Location" name="locationId" value={location} onChange={changeLocation} required placeholder="Choose">
          {props.locations.map(item => <option key={item.id} value={item.id}>{item.shortName}</option>)}
        </SelectRow> : <li><div className="q-row q-row--one"><span className="q-rt"><b>Location</b></span><span className="q-rv q-rv--l">{props.locationName}</span></div></li>}
        <SelectRow label="Position" name="positionId" value={position} onChange={setPosition}>
          <option value="">None</option>
          {choices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          {retained ? <option value={position} disabled>{`${positions.find(item => item.id === position)?.name ?? "Earlier position"} (unavailable)`}</option> : null}
        </SelectRow>
      </ul>
      {/* A native select can cut a long name; the full name is read and shown here. */}
      {chosen && fullName(chosen).length > 24 ? <p className="q-help" aria-live="polite">{`Selected employee: ${fullName(chosen)}`}</p> : null}
      {mode === "edit" ? <p className="q-help">To move a shift to another location, delete it and add a new one.</p> : null}
      <div className="q-grp"><h2>When</h2></div>
      <ul className="q-list">
        <PickerRow label="Date" type="date" name="date" value={day} onChange={setDay} display={isValidIsoDate(day) ? dayText(day) : ""} min={mode === "edit" ? weekStart : undefined} max={mode === "edit" ? weekEnd : undefined} />
        <PickerRow label="Starts" type="time" name="startTime" value={start} onChange={setStart} display={start ? clock(start) : ""} />
        <PickerRow label="Ends" type="time" name="endTime" value={end} onChange={setEnd} display={end ? clock(end) : ""} />
      </ul>
      <p className="q-help" aria-live="polite">{help}</p>
      <ul className="q-list q-shift-form__more">
        <li><label className="q-row q-row--one" data-disabled={!canLead || undefined}><span className="q-rt"><b>Shift lead</b></span>
          <input type="checkbox" role="switch" className="q-tog" name="isDesignatedLead" checked={lead && canLead} disabled={!canLead} onChange={event => setLead(event.target.checked)} aria-label="Shift lead" aria-describedby={canLead ? undefined : "shift-lead-help"} /></label></li>
        <NoteRow value={note} onChange={setNote} />
      </ul>
      {!canLead ? <p className="q-help" id="shift-lead-help">Only an Owner, Manager or Lead can lead a shift.</p> : null}
    </ConfigurationForm>
  </div>;
}

/** New shift (AddShift.png). */
export function CreateShiftForm({ locations, locationId = "", ...rest }: Common & { locations: Location[]; locationId?: string }) {
  return <ShiftForm mode="new" locations={locations} locationId={locationId} {...rest} />;
}

/** Edit shift on the same sheet as New shift (T-4): the same rows, prefilled; Location is fixed. */
export function EditShiftForm({ shiftId, locationId = "", locationName, employeeId, ...rest }: Common & { shiftId: string; employeeId: string; locationId?: string; locationName: string }) {
  return <ShiftForm mode="edit" shiftId={shiftId} locationId={locationId} locationName={locationName} employeeId={employeeId} {...rest} />;
}
