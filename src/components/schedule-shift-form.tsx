"use client";

import { FormDiscardGuard } from "./kit/discard-dialog";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ConfigurationForm, type ConfigurationResult } from "./configuration-form";
import { designatedLeadAfterEmployeeChange, positionAfterEmployeeChange } from "./shift-assignment-fields";
import { shiftFieldName, shiftFormEntry } from "../lib/scheduling/shift-form-entry";
import { addDays, isValidIsoDate } from "../lib/date-utils";
import { timeChoices } from "../lib/scheduling/shift-time-choices";
import type { Position } from "../lib/domain";
import type {ShiftFormEmployee} from '../lib/scheduling/shift-form-employee';
import { CorpFormFooter } from "./corp/corp";
import { BBusyLabel, BCallout } from "./owner-b/b-kit";
import "./schedule-shift-form.css";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { scheduleCopy } from "./schedule-copy";
import { UserIcon } from "@phosphor-icons/react/dist/ssr/User";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr/LockSimple";

/* Add shift and Edit shift (Release 1, boards O-AddShift and O-EditShift): one sheet. Cancel · title · Save over a
 * hairline, then Person, Location and Position side by side, Date, Start and End, the Shift lead switch, Note, and the
 * save. Same form fields and actions as before; the date and times are chosen from lists (the week's seven days and quarter
 * hours), so no browser date or time glyphs show. Nov 1 upscale: every select carries the kit's caret (the date's calendar
 * glyph is gone); the Lead role is on hold, so the lead line names Owners and Managers only.
 * Owner premium (A7, P9/P10): one Save. Phones keep the header's Cancel · title · Save; tablets and desktop have the card's
 * footer (Cancel and Save on the right) instead. Missing fields are all flagged at once by the shell's form validation
 * (form-validation.tsx), drawn in the kit's one red style.
 * Each word once, for every role (Jose, Nov 23, 2026; gaps G28): an empty Location, Start or End shows no text (its label
 * says it), the position list's empty choice is "None", and the Note says only "Optional" (Person names who it is for). */



const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
/** Start plus eight hours, on the 24-hour clock ("09:00" → "17:00", "20:00" → "04:00"). */
function eightHoursAfter(start: string) {
  const [hours, minutes] = start.split(":").map(Number);
  return `${String((hours + 8) % 24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** A person the form can choose. `locationIds` (a location Manager's scoped read) limits them to those places. */
export type ShiftFormChoice = ShiftFormEmployee & { locationIds?: string[] };

export type ScheduleShiftFormProps = {
  mode: "add" | "edit";
  formId: string;
  allowBatch?: boolean;
  action: (data: FormData) => Promise<ConfigurationResult>;
  employees: ShiftFormChoice[];
  positions: Pick<Position, "id" | "name" | "active">[];
  /** Add: the locations to choose from. */
  locations?: { id: string; shortName: string }[];
  /** Edit: the shift's location, shown as it is (a shift keeps its location). Add: a location Manager's one place. */
  fixedLocation?: string;
  /** The line under a fixed location; null for none (a location Manager's one place needs no reason). */
  fixedLocationHelp?: string | null;
  /** A stored end of 24:00 is sent back as 24:00 while End shows midnight (the scoped editor kept it this way). */
  keepMidnightEnd?: boolean;
  /** A location Manager's sheet: after an unconfirmed save the fields stay locked until the schedule is checked. */
  holdAfterUnconfirmed?: boolean;
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
  reviewedShiftVersion?: string;
  cancelHref: string;
  /** Edit: a line above the fields (the held edit's "Was 12:00 PM – 8:00 PM"). */
  status?: ReactNode;
  /** Edit: the line under the title, the shift's state only ("Draft", "Published"); the Date field holds the day. */
  subtitle?: ReactNode;
  /** A save that came back with an error (from the page's ?error=). */
  error?: { title: string; body: string };
  /** Why nothing can be added yet (no people or no locations). */
  blocked?: string;
  /** Edit: Delete shift, its own form after this one. */
  footer?: ReactNode;
};

function ShiftFields({ props, row, focusDate }: { props: ScheduleShiftFormProps; row: number; focusDate: boolean }) {
  const { formId, employees, positions, weekStart } = props;
  const words = scheduleCopy(usePortalLang()), w = words.shiftForm, dayText = words.dayText;
  const field = (name: string) => shiftFieldName(row, name);
  const everyone = employees.filter(item => item.active);
  const [person, setPerson] = useState(props.employeeId ?? "");
  const [position, setPosition] = useState(props.positionId ?? "");
  const [location, setLocation] = useState(props.locationId ?? "");
  // A location Manager's people are limited to the chosen place (each carries the places they can work).
  const worksAt = (item: ShiftFormChoice, place: string) => !place || !item.locationIds || item.locationIds.includes(place);
  const active = everyone.filter(item => worksAt(item, location));
  const [day, setDay] = useState(props.date);
  const [start, setStart] = useState(props.startTime ?? "");
  // Closing F1 (NV-227): a start passed in without an end (Schedule's "+ Add" offers the person's usual start) ends 8 h later.
  const [end, setEnd] = useState(props.endTime === "24:00" ? "00:00" : props.endTime ?? (props.mode === "add" && props.startTime && /^\d{2}:\d{2}$/.test(props.startTime) ? eightHoursAfter(props.startTime) : ""));
  const [lead, setLead] = useState(!!props.isDesignatedLead);
  const employee = employees.find(item => item.id === person);
  const name = employee ? `${employee.firstName} ${employee.lastName}` : "";
  const choices = positions.filter(item => item.active && employee?.positionIds?.includes(item.id));
  const retained = !!position && !choices.some(item => item.id === position);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const overnight = !!start && !!end && end < start;
  const nextDay = overnight && isValidIsoDate(day) ? dayText(addDays(day, 1)) : null;
  const id = (field: string) => `${formId}-${field}`;
  const midnightKept = !!props.keepMidnightEnd && props.endTime === "24:00" && end === "00:00";
  const fixedHelp = props.fixedLocationHelp === undefined ? w.fixedHelp : props.fixedLocationHelp;

  const changePerson = (next: string) => {
    setPerson(next);
    setPosition(current => positionAfterEmployeeChange({ positionId: current, nextEmployeeId: next, employees, positions }));
    setLead(current => designatedLeadAfterEmployeeChange({ checked: current, nextEmployeeId: next, employees }));
  };
  const changeLocation = (next: string) => {
    setLocation(next);
    // Someone who can't work at the newly chosen place is no longer chosen.
    if (person && !everyone.some(item => item.id === person && worksAt(item, next))) changePerson("");
  };

  return <>
      <div className="c-field">
        <label className="c-field__label" htmlFor={id("person")}>{w.person}</label>
        <span className="c-shift__control c-shift__person">
          {/* Review B2 (NV-325): before a person is chosen, a person glyph (an empty grey disc read as a broken image). */}
          <span className={name ? "c-av" : "c-av c-av--grey"} aria-hidden="true">{name ? initialsOf(name) : <UserIcon size={16} weight="bold" />}</span>
          <select id={id("person")} className="c-in" name={field("employeeId")} value={person} required autoComplete="off" onChange={event => { changePerson(event.target.value); }}>
            <option value="" disabled>{w.chooseSomeone}</option>
            {active.map(item => <option key={item.id} value={item.id}>{`${item.firstName} ${item.lastName}`}</option>)}
          </select>
          {/* Gaps G62: a native select can't wrap. Where the field is narrow for its text (a phone, 200% text) the chosen
            * name is drawn here, wrapping, over the select (schedule-shift-form.css); the select stays the control. */}
          <span className={name ? "c-shift__person-v" : "c-shift__person-v c-shift__person-v--none"} aria-hidden="true">{name || w.chooseSomeone}</span>
        </span>
        {/* A native select can cut a long name; the full name is read and shown here. */}
        {name.length > 24 ? <span className="c-field__help" aria-live="polite">{w.selected(name)}</span> : null}
      </div>

      <div className="c-shift__pair">
        <div className="c-field">
          <label className="c-field__label" htmlFor={id("location")}>{w.location}</label>
          {props.fixedLocation !== undefined
            ? <>
              {/* Review B5 (NV-085): one read-only look (the Company profile pattern): a grey value with a lock and the reason. */}
              <span className="c-readonly"><input id={id("location")} className="c-in c-shift__fixed" value={props.fixedLocation} readOnly tabIndex={-1} aria-describedby={fixedHelp ? id("location-help") : undefined} /><LockSimpleIcon className="c-readonly__lock" size={16} weight="bold" aria-hidden="true" /></span>
              {fixedHelp ? <span className="c-field__help" id={id("location-help")}>{fixedHelp}</span> : null}
            </>
            : <><select id={id("location")} className={location ? "c-in" : "c-in c-shift__empty"} name={field("locationId")} value={location} required onChange={event => { changeLocation(event.target.value); }}>
              <option value="" disabled></option>
              {(props.locations ?? []).map(item => <option key={item.id} value={item.id}>{item.shortName}</option>)}
            </select></>}
        </div>
        <div className="c-field">
          <label className="c-field__label" htmlFor={id("position")}>{w.position}</label>
          <select id={id("position")} className="c-in" name={field("positionId")} value={position} onChange={event => setPosition(event.target.value)}>
            <option value="">{w.none}</option>
            {choices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            {retained ? <option value={position} disabled>{w.unavailable(positions.find(item => item.id === position)?.name)}</option> : null}
          </select>
          {retained ? <input type="hidden" name={field("positionId")} value={position} /> : null}
        </div>
      </div>

      <div className="c-field">
        <label className="c-field__label" htmlFor={id("date")}>{w.date}</label>
        <span className="c-shift__control c-shift__date">
          <select autoFocus={focusDate} id={id("date")} className="c-in" name={field("date")} value={day} required onChange={event => { setDay(event.target.value); }}>
            {!days.includes(day) ? <option value={day} disabled>{isValidIsoDate(day) ? dayText(day) : w.choose}</option> : null}
            {days.map(value => <option key={value} value={value}>{dayText(value)}</option>)}
          </select>
        </span>
      </div>

      <div className="c-shift__pair">
        <div className="c-field">
          <label className="c-field__label" htmlFor={id("start")}>{w.start}</label>
          <select id={id("start")} className={start ? "c-in c-shift__time" : "c-in c-shift__time c-shift__empty"} name={field("startTime")} value={start} required onChange={event => { const next = event.target.value; setStart(next); if (!end && next) setEnd(eightHoursAfter(next)); }}>
            <option value="" disabled></option>
            {timeChoices(start, words.time).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="c-field">
          <label className="c-field__label" htmlFor={id("end")}>{w.end}</label>
          <select id={id("end")} className={end ? "c-in c-shift__time" : "c-in c-shift__time c-shift__empty"} name={midnightKept ? undefined : field("endTime")} value={end} required aria-describedby={nextDay ? id("next-day") : undefined} onChange={event => { setEnd(event.target.value); }}>
            <option value="" disabled></option>
            {timeChoices(end, words.time).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          {midnightKept ? <input type="hidden" name={field("endTime")} value="24:00" /> : null}
        </div>
      </div>
      {nextDay ? <p className="c-field__help c-shift__next" id={id("next-day")} aria-live="polite">{w.ends(nextDay)}</p> : null}

      <label className="c-shift__lead">
        <span className="c-shift__lead-text"><b>{w.shiftLead}</b><span>{w.leadHelp}</span></span>
        <input type="checkbox" role="switch" className="c-switch" name={field("isDesignatedLead")} checked={lead} onChange={event => setLead(event.target.checked)} />
      </label>

      <div className="c-field">
        <label className="c-field__label" htmlFor={id("note")}>{w.note}</label>
        <textarea id={id("note")} className="c-in c-shift__note" name={field("notes")} rows={1} defaultValue={props.notes ?? ""} enterKeyHint="done" autoComplete="off"
          placeholder={w.optional} />
      </div>

  </>;
}

type RowDefaults = Pick<ScheduleShiftFormProps, "date" | "employeeId" | "locationId" | "startTime" | "endTime" | "positionId" | "isDesignatedLead" | "notes">;

export function ScheduleShiftForm(props: ScheduleShiftFormProps) {
  const { mode, formId } = props;
  const lang = usePortalLang();
  const w = scheduleCopy(lang).shiftForm;
  const [saving, setSaving] = useState(false);
  const nextKey = useRef(1);
  const [rows, setRows] = useState<{ key: number; defaults?: RowDefaults }[]>([{ key: 0 }]);
  const batch = rows.length > 1;
  const title = mode === "edit" ? w.editShift : w.addShift;
  function addRow(form: HTMLFormElement | null) {
    if (!form?.reportValidity()) return;
    const last = shiftFormEntry(new FormData(form), rows.length - 1);
    const tomorrow = addDays(last.date, 1);
    const hasNextDay = tomorrow <= addDays(props.weekStart, 6);
    const defaults = { ...last, notes: "", date: hasNextDay ? tomorrow : last.date,
      startTime: hasNextDay ? last.startTime : "", endTime: hasNextDay ? last.endTime : "" };
    setRows([...rows, { key: nextKey.current++, defaults }]);
  }

  return <div className="c-shift">
    {/* A sheet covers the tab bar (the shell hides it while a sheet page is open). */}
    <span className="q-page" data-q-sheet="" hidden />
    <header className="c-shift__head">
      <Link className="c-shift__cancel c-only-phone" href={props.cancelHref}>{w.cancel}</Link>
      {/* Nov 1 upscale: the shift's state is the title's subtitle (no pill alone above the form). */}
      {props.subtitle ? <span className="c-shift__titles"><h1 className="c-shift__title">{title}</h1><span className="c-shift__sub">{props.subtitle}</span></span>
        : <h1 className="c-shift__title">{title}</h1>}
      <button type="submit" form={formId} className="c-shift__save c-only-phone" disabled={!!props.blocked || saving} aria-busy={saving || undefined}>
        <BBusyLabel busy={saving} busyLabel={w.saving}>{batch ? w.saveShifts(rows.length) : w.save}</BBusyLabel>
      </button>
    </header>
    <ConfigurationForm pendingFeedback={{ label: w.saving, onChange: setSaving, lang }} action={props.action} reviewedShiftVersion={props.reviewedShiftVersion} id={formId} className="c-shift__form" holdAfterUnconfirmed={props.holdAfterUnconfirmed || batch}
      unconfirmedCheck={batch ? { title: w.checkBatch, label: w.checkWeek, href: `/app/schedule?week=${props.weekStart}` } : undefined}>
      {Object.entries(props.hidden).map(([field, value]) => <input key={field} type="hidden" name={field} value={value} />)}
      {/* Premium pass (Nov 21, 2026; Jose's board pick 3A): the kit's red note, not a pink box. Words and alert role unchanged. */}
      {props.blocked ? <BCallout tone="red" role="alert">{props.blocked}</BCallout> : null}
      {props.error ? <BCallout tone="red" role="alert" title={props.error.title}>{props.error.body}</BCallout> : null}
      {props.status ?? null}

      {batch && <><input type="hidden" name="shiftCount" value={rows.length} /><input type="hidden" name="batchLanguage" value={lang} /></>}
      {rows.map((row, index) => {
        const rowId = row.key ? `${formId}-${row.key}` : formId;
        const fields = <ShiftFields key={row.key} props={{ ...props, ...row.defaults, formId: rowId }} row={index} focusDate={row.key !== 0} />;
        if (!props.allowBatch) return fields;
        return <div key={row.key} className="c-shift__batch-row" role={batch ? "group" : undefined} aria-labelledby={batch ? `${rowId}-heading` : undefined}>
          {batch && <div className="c-shift__batch-heading">
            <h2 id={`${rowId}-heading`}>{w.shiftNumber(index + 1)}</h2>
            <button type="button" className="c-btn c-btn--secondary" aria-label={w.removeShift(index + 1)}
              onClick={() => {
                const neighbor = rows[index + 1] ?? rows[index - 1];
                setRows(rows.filter(item => item.key !== row.key));
                requestAnimationFrame(() => document.getElementById(neighbor.key ? `${formId}-${neighbor.key}-date` : `${formId}-date`)?.focus());
              }}>{w.remove}</button>
          </div>}
          {fields}
        </div>;
      })}
      {props.allowBatch && !props.blocked && <button type="button" className="c-btn c-btn--secondary c-shift__add-another"
        onClick={event => addRow(event.currentTarget.form)}>{w.addAnother}</button>}

      {/* Tablets and desktop: the one Save, with Cancel, in the card's footer (phones use the header's). */}
      <CorpFormFooter>
        <Link className="c-btn c-btn--secondary b-rowact b-rowact--quiet" href={props.cancelHref}>{w.cancel}</Link>
        <button type="submit" className="c-btn c-shift__submit" disabled={!!props.blocked || saving} aria-busy={saving || undefined}>
          <BBusyLabel busy={saving} busyLabel={w.saving}>{mode === "edit" ? w.saveChanges : batch ? w.saveShifts(rows.length) : w.saveShift}</BBusyLabel>
        </button>
      </CorpFormFooter>
    </ConfigurationForm>
    {/* Leaving with a shift that is not saved asks first (Nov 21, 2026). A save leaves through the server's redirect, which
      is never asked about. */}
    <FormDiscardGuard form={formId} />
    {props.footer ?? null}
  </div>;
}
