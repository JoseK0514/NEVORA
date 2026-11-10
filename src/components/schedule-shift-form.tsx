"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ConfigurationForm, type ConfigurationResult } from "./configuration-form";
import { designatedLeadAfterEmployeeChange, positionAfterEmployeeChange } from "./shift-assignment-fields";
import { addDays, formatTime, isValidIsoDate } from "../lib/date-utils";
import type { Employee, Position } from "../lib/domain";
import { CorpFormFooter } from "./corp/corp";
import "./schedule-shift-form.css";
import { UserIcon } from "@phosphor-icons/react/dist/ssr/User";

/* Add shift and Edit shift (Release 1, boards O-AddShift and O-EditShift): one sheet. Cancel · title · Save over a
 * hairline, then Person, Location and Position side by side, Date, Start and End, the Shift lead switch, Note, and the
 * save. Same form fields and actions as before; the date and times are chosen from lists (the week's seven days and quarter
 * hours), so no browser date or time glyphs show. Nov 1 upscale: every select carries the kit's caret (the date's calendar
 * glyph is gone); the Lead role is on hold, so the lead line names Owners and Managers only.
 * Owner premium (A7, P9/P10): one Save. Phones keep the header's Cancel · title · Save; tablets and desktop have the card's
 * footer (Cancel and Save on the right) instead. Missing fields are all flagged at once by the shell's form validation
 * (form-validation.tsx), drawn in the kit's one red style. */



const dayText = (date: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const QUARTERS = Array.from({ length: 96 }, (_, index) => `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`);

/** Quarter hours, plus a saved time that isn't on a quarter so it stays as it was. */
function timeChoices(current: string) {
  const list = current && !QUARTERS.includes(current) ? [...QUARTERS, current].sort() : QUARTERS;
  // Review B2 (NV-227): the list starts at 6:00 AM (the working day), so 9:00 AM is 12 steps away, not 36; it wraps to the
  // night hours at the end. Typeahead still works.
  const first = list.findIndex(value => value >= "06:00");
  return [...list.slice(first), ...list.slice(0, first)].map(value => ({ value, label: formatTime(value) }));
}
/** Start plus eight hours, on the 24-hour clock ("09:00" → "17:00", "20:00" → "04:00"). */
function eightHoursAfter(start: string) {
  const [hours, minutes] = start.split(":").map(Number);
  return `${String((hours + 8) % 24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export type ScheduleShiftFormProps = {
  mode: "add" | "edit";
  formId: string;
  action: (data: FormData) => Promise<ConfigurationResult>;
  employees: Employee[];
  positions: Position[];
  /** Add: the locations to choose from. */
  locations?: { id: string; shortName: string }[];
  /** Edit: the shift's location, shown as it is (a shift keeps its location). */
  fixedLocation?: string;
  weekStart: string;
  date: string;
  employeeId?: string;
  positionId?: string;
  locationId?: string;
  startTime?: string;
  endTime?: string;
  isDesignatedLead?: boolean;
  notes?: string;
  /** Hidden fields the action reads (shiftId, weekStart). */
  hidden: Record<string, string>;
  cancelHref: string;
  /** Edit: a line above the fields (the held edit's "Was 12:00 PM – 8:00 PM"). */
  status?: ReactNode;
  /** Edit: the header's 13px line under the title, the shift's state and day ("Published · Sun, Nov 1"). */
  subtitle?: ReactNode;
  /** A save that came back with an error (from the page's ?error=). */
  error?: { title: string; body: string };
  /** Why nothing can be added yet (no people or no locations). */
  blocked?: string;
  /** Edit: Delete shift, its own form after this one. */
  footer?: ReactNode;
};

export function ScheduleShiftForm(props: ScheduleShiftFormProps) {
  const { mode, formId, employees, positions, weekStart } = props;
  const active = employees.filter(item => item.active);
  const [person, setPerson] = useState(props.employeeId ?? "");
  const [position, setPosition] = useState(props.positionId ?? "");
  const [location, setLocation] = useState(props.locationId ?? "");
  const [day, setDay] = useState(props.date);
  const [start, setStart] = useState(props.startTime ?? "");
  const [end, setEnd] = useState(props.endTime === "24:00" ? "00:00" : props.endTime ?? "");
  const [lead, setLead] = useState(!!props.isDesignatedLead);
  const employee = employees.find(item => item.id === person);
  const name = employee ? `${employee.firstName} ${employee.lastName}` : "";
  const choices = positions.filter(item => item.active && employee?.positionIds?.includes(item.id));
  const retained = !!position && !choices.some(item => item.id === position);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const overnight = !!start && !!end && end < start;
  const nextDay = overnight && isValidIsoDate(day) ? dayText(addDays(day, 1)) : null;
  const title = mode === "edit" ? "Edit shift" : "Add shift";
  const id = (field: string) => `${formId}-${field}`;

  const changePerson = (next: string) => {
    setPerson(next);
    setPosition(current => positionAfterEmployeeChange({ positionId: current, nextEmployeeId: next, employees, positions }));
    setLead(current => designatedLeadAfterEmployeeChange({ checked: current, nextEmployeeId: next, employees }));
  };

  return <div className="c-shift">
    {/* A sheet covers the tab bar (the shell hides it while a sheet page is open). */}
    <span className="q-page" data-q-sheet="" hidden />
    <header className="c-shift__head">
      <Link className="c-shift__cancel c-only-phone" href={props.cancelHref}>Cancel</Link>
      {/* Nov 1 upscale: the shift's state is the title's subtitle (no pill alone above the form). */}
      {props.subtitle ? <span className="c-shift__titles"><h1 className="c-shift__title">{title}</h1><span className="c-shift__sub">{props.subtitle}</span></span>
        : <h1 className="c-shift__title">{title}</h1>}
      <button type="submit" form={formId} className="c-shift__save c-only-phone" disabled={!!props.blocked}>Save</button>
    </header>
    <ConfigurationForm action={props.action} id={formId} className="c-shift__form">
      {Object.entries(props.hidden).map(([field, value]) => <input key={field} type="hidden" name={field} value={value} />)}
      {props.blocked ? <p className="c-shift__alert" role="alert">{props.blocked}</p> : null}
      {props.error ? <div className="c-shift__alert" role="alert"><b>{props.error.title}</b><span>{props.error.body}</span></div> : null}
      {props.status ?? null}

      <div className="c-field">
        <label className="c-field__label" htmlFor={id("person")}>Person</label>
        <span className="c-shift__control c-shift__person">
          {/* Review B2 (NV-325): before a person is chosen, a person glyph (an empty grey disc read as a broken image). */}
          <span className={name ? "c-av" : "c-av c-av--grey"} aria-hidden="true">{name ? initialsOf(name) : <UserIcon size={16} weight="bold" />}</span>
          <select id={id("person")} className="c-in" name="employeeId" value={person} required autoComplete="off" onChange={event => { changePerson(event.target.value); }}>
            <option value="" disabled>Choose someone</option>
            {active.map(item => <option key={item.id} value={item.id}>{`${item.firstName} ${item.lastName}`}</option>)}
          </select>
        </span>
        {/* A native select can cut a long name; the full name is read and shown here. */}
        {name.length > 24 ? <span className="c-field__help" aria-live="polite">{`Selected employee: ${name}`}</span> : null}
      </div>

      <div className="c-shift__pair">
        <div className="c-field">
          <label className="c-field__label" htmlFor={id("location")}>Location</label>
          {props.fixedLocation !== undefined
            ? <>
              <input id={id("location")} className="c-in c-shift__fixed" value={props.fixedLocation} readOnly tabIndex={-1} aria-describedby={id("location-help")} />
              <span className="c-sr" id={id("location-help")}>A shift keeps its location. To move it, delete it and add a new one.</span>
            </>
            : <><select id={id("location")} className={location ? "c-in" : "c-in c-shift__empty"} name="locationId" value={location} required onChange={event => { setLocation(event.target.value); }}>
              <option value="" disabled>Choose</option>
              {(props.locations ?? []).map(item => <option key={item.id} value={item.id}>{item.shortName}</option>)}
            </select></>}
        </div>
        <div className="c-field">
          <label className="c-field__label" htmlFor={id("position")}>Position</label>
          <select id={id("position")} className="c-in" name="positionId" value={position} onChange={event => setPosition(event.target.value)}>
            <option value="">No position</option>
            {choices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            {retained ? <option value={position} disabled>{`${positions.find(item => item.id === position)?.name ?? "Existing position"} (unavailable)`}</option> : null}
          </select>
          {retained ? <input type="hidden" name="positionId" value={position} /> : null}
        </div>
      </div>

      <div className="c-field">
        <label className="c-field__label" htmlFor={id("date")}>Date</label>
        <span className="c-shift__control c-shift__date">
          <select id={id("date")} className="c-in" name="date" value={day} required onChange={event => { setDay(event.target.value); }}>
            {!days.includes(day) ? <option value={day} disabled>{isValidIsoDate(day) ? dayText(day) : "Choose"}</option> : null}
            {days.map(value => <option key={value} value={value}>{dayText(value)}</option>)}
          </select>
        </span>
      </div>

      <div className="c-shift__pair">
        <div className="c-field">
          <label className="c-field__label" htmlFor={id("start")}>Start</label>
          <select id={id("start")} className={start ? "c-in c-shift__time" : "c-in c-shift__time c-shift__empty"} name="startTime" value={start} required onChange={event => { const next = event.target.value; setStart(next); if (!end && next) setEnd(eightHoursAfter(next)); }}>
            <option value="" disabled>Choose</option>
            {timeChoices(start).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="c-field">
          <label className="c-field__label" htmlFor={id("end")}>End</label>
          <select id={id("end")} className={end ? "c-in c-shift__time" : "c-in c-shift__time c-shift__empty"} name="endTime" value={end} required aria-describedby={nextDay ? id("next-day") : undefined} onChange={event => { setEnd(event.target.value); }}>
            <option value="" disabled>Choose</option>
            {timeChoices(end).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
      </div>
      {nextDay ? <p className="c-field__help c-shift__next" id={id("next-day")} aria-live="polite">{`Ends ${nextDay}`}</p> : null}

      <label className="c-shift__lead">
        <span className="c-shift__lead-text"><b>Shift lead</b><span>Owners and Managers can lead a shift</span></span>
        <input type="checkbox" role="switch" className="c-switch" name="isDesignatedLead" checked={lead} onChange={event => setLead(event.target.checked)} />
      </label>

      <div className="c-field">
        <label className="c-field__label" htmlFor={id("note")}>Note</label>
        <textarea id={id("note")} className="c-in c-shift__note" name="notes" rows={1} defaultValue={props.notes ?? ""} enterKeyHint="done" autoComplete="off"
          placeholder={employee ? `Add a note for ${employee.firstName} (optional)` : "Add a note (optional)"} />
      </div>

      {/* Tablets and desktop: the one Save, with Cancel, in the card's footer (phones use the header's). */}
      <CorpFormFooter>
        <Link className="c-btn c-btn--secondary" href={props.cancelHref}>Cancel</Link>
        <button type="submit" className="c-btn c-shift__submit" disabled={!!props.blocked}>{mode === "edit" ? "Save changes" : "Save shift"}</button>
      </CorpFormFooter>
    </ConfigurationForm>
    {props.footer ?? null}
  </div>;
}
