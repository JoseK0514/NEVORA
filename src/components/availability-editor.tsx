"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr/LockSimple";
import type { AvailabilityState } from "@/lib/availability-presets";
import { addDays, formatDayLabel } from "@/lib/date-utils";
import { saveAvailabilityAction, saveWeeklyAvailabilityAction } from "@/app/app/availability/actions";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

const DAYS = [
  { dayOfWeek: 1, label: "Monday" },
  { dayOfWeek: 2, label: "Tuesday" },
  { dayOfWeek: 3, label: "Wednesday" },
  { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" },
  { dayOfWeek: 6, label: "Saturday" },
  { dayOfWeek: 0, label: "Sunday" },
];

function AvailabilityFields({ initialAvailability, weekStart, locked }: {
  initialAvailability: AvailabilityState;
  weekStart?: string;
  locked: boolean;
}) {
  const { pending } = useFormStatus();
  const [availability, setAvailability] = useState(initialAvailability);
  const initialSignature = useMemo(() => JSON.stringify(initialAvailability), [initialAvailability]);
  const dirty = JSON.stringify(availability) !== initialSignature;
  const availableDays = DAYS.filter(day => availability[day.dayOfWeek].available).length;
  const disabled = locked || pending;
  const changedDays = DAYS.filter(day => JSON.stringify(availability[day.dayOfWeek]) !== JSON.stringify(initialAvailability[day.dayOfWeek])).map(day => day.dayOfWeek);

  function updateDay(dayOfWeek: number, patch: Partial<AvailabilityState[number]>) {
    setAvailability(current => ({ ...current, [dayOfWeek]: { ...current[dayOfWeek], ...patch } }));
  }

  return <>
    {weekStart ? <>
      <input type="hidden" name="weekStart" value={weekStart} />
      <input type="hidden" name="changedDays" value={changedDays.join(",")} />
    </> : null}
    <header className="av-editor-heading">
      <div><h2>Your weekly hours</h2><p>Choose the days and times you can work.</p></div>
      <span className="av-day-count">{availableDays} of 7 days available</span>
    </header>
    <fieldset className="av-day-list" disabled={disabled}>
      <legend className="sr-only">Availability by day</legend>
      {DAYS.map((day, index) => {
        const value = availability[day.dayOfWeek];
        return <div className={`av-day-row${value.available ? " is-available" : ""}`} key={day.dayOfWeek}>
          <div className="av-day-name"><strong>{day.label}</strong>{weekStart ? <span>{formatDayLabel(addDays(weekStart, index)).day}</span> : null}</div>
          <label className="av-availability-toggle">
            <span className="av-switch"><input type="checkbox" role="switch" name={`available-${day.dayOfWeek}`} aria-label={`${day.label} availability`} checked={value.available} onChange={event => updateDay(day.dayOfWeek, { available: event.target.checked })} /><span className="av-switch-track" aria-hidden="true" /></span>
            <span>{value.available ? "Available" : "Unavailable"}</span>
          </label>
          {value.available ? <div className="av-time-range">
            <label><span>From</span><input type="time" required name={`start-${day.dayOfWeek}`} aria-label={`${day.label} start time`} value={value.startTime} onChange={event => updateDay(day.dayOfWeek, { startTime: event.target.value })} /></label>
            <span className="av-time-separator" aria-hidden="true">–</span>
            <label><span>Until</span><input type="time" required name={`end-${day.dayOfWeek}`} aria-label={`${day.label} end time`} value={value.endTime} onChange={event => updateDay(day.dayOfWeek, { endTime: event.target.value })} /></label>
          </div> : <p className="av-no-hours">No available hours</p>}
        </div>;
      })}
    </fieldset>
    <p className="av-input-hint">An end time of midnight includes the rest of that day.</p>
    {weekStart && availableDays === 0 ? <p className="av-zero-note">Submitting with every day unavailable tells your manager you cannot work this week.</p> : null}
    <footer className="av-editor-footer">
      <p role="status" aria-live="polite">{pending ? "Saving your availability…" : locked ? "This week is closed for changes." : dirty ? "You have unsaved changes." : weekStart ? "Submit these hours for this week." : "Your saved usual week."}</p>
      <div className="av-form-actions">
        <button className="av-button secondary" type="button" disabled={disabled || !dirty} onClick={() => setAvailability(initialAvailability)}><ArrowCounterClockwiseIcon size={18} aria-hidden="true" />Reset changes</button>
        <button className="av-button primary" type="submit" disabled={disabled || (!weekStart && !dirty)}>{locked ? <LockSimpleIcon size={18} aria-hidden="true" /> : null}{pending ? "Saving…" : weekStart ? "Submit weekly availability" : "Save usual week"}{!locked && !pending ? <ArrowRightIcon size={18} aria-hidden="true" /> : null}</button>
      </div>
    </footer>
  </>;
}

export function AvailabilityEditor({ initialAvailability, weekStart, locked = false, employeeView = false }: {
  initialAvailability: AvailabilityState;
  weekStart?: string;
  locked?: boolean;
  employeeView?: boolean;
}) {
  // IS (round 3): a failed save (network, 401, 403) keeps the page and the hours entered, and says nothing was saved.
  const [failed, setFailed] = useState(false);
  async function save(data: FormData) {
    setFailed(false);
    try { await (weekStart ? saveWeeklyAvailabilityAction : saveAvailabilityAction)(data); }
    catch (error) { unstable_rethrow(error); setFailed(true); }
  }
  return <form action={save} onReset={event => event.preventDefault()} className={`av-editor${employeeView ? " av-employee-editor" : ""}`} aria-label={weekStart ? "Weekly availability submission" : "Normal availability preferences"}>
    <AvailabilityFields initialAvailability={initialAvailability} weekStart={weekStart} locked={locked} />
    {/* IS-75: the alert sits next to Save, where the person is looking. */}
    {failed ? <p className="form-error" role="alert">Your availability wasn’t saved. Check your connection and save again. If this keeps happening, <Link href="/login">sign in again</Link>.</p> : null}
  </form>;
}
