"use client";

import { useMemo, useState } from "react";
import {
  applyAllDays,
  applyWeekdays,
  clearAvailability,
  type AvailabilityState,
} from "@/lib/availability-presets";
import {
  saveAvailabilityAction,
  saveWeeklyAvailabilityAction,
} from "@/app/app/availability/actions";

const WEEKDAYS = [
  { dayOfWeek: 1, label: "Monday" },
  { dayOfWeek: 2, label: "Tuesday" },
  { dayOfWeek: 3, label: "Wednesday" },
  { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" },
];

const WEEKEND = [
  { dayOfWeek: 6, label: "Saturday" },
  { dayOfWeek: 0, label: "Sunday" },
];

export function AvailabilityEditor({
  initialAvailability,
  weekStart,
  locked = false,
}: {
  initialAvailability: AvailabilityState;
  weekStart?: string;
  locked?: boolean;
}) {
  const [availability, setAvailability] = useState(initialAvailability);

  const initialSignature = useMemo(
    () => JSON.stringify(initialAvailability),
    [initialAvailability],
  );
  const currentSignature = JSON.stringify(availability);
  const dirty = currentSignature !== initialSignature;

  function updateDay(
    dayOfWeek: number,
    patch: Partial<AvailabilityState[number]>,
  ) {
    setAvailability((current) => ({
      ...current,
      [dayOfWeek]: {
        ...current[dayOfWeek],
        ...patch,
      },
    }));
  }

  function renderDay(day: { dayOfWeek: number; label: string }) {
    const value = availability[day.dayOfWeek];

    return (
      <div
        className={
          value.available
            ? "availability-day-row is-available"
            : "availability-day-row"
        }
        key={day.dayOfWeek}
      >
        <div className="availability-day-name">
          <strong>{day.label}</strong>
          <span>{value.available ? "Available" : "Off"}</span>
        </div>

        <label className="availability-switch">
          <input
            type="checkbox"
            name={`available-${day.dayOfWeek}`}
            checked={value.available}
            disabled={locked}
            onChange={(event) =>
              updateDay(day.dayOfWeek, { available: event.target.checked })
            }
          />
          <span className="availability-switch-track" aria-hidden="true">
            <span />
          </span>
          <span className="availability-switch-label">
            {value.available ? "On" : "Off"}
          </span>
        </label>

        {value.available ? (
          <div className="availability-time-range">
            <label>
              <span>From</span>
              <input
                type="time"
                name={`start-${day.dayOfWeek}`}
                value={value.startTime}
                disabled={locked}
                onChange={(event) =>
                  updateDay(day.dayOfWeek, { startTime: event.target.value })
                }
              />
            </label>

            <span className="availability-time-separator">to</span>

            <label>
              <span>Until</span>
              <input
                type="time"
                name={`end-${day.dayOfWeek}`}
                value={value.endTime}
                disabled={locked}
                onChange={(event) =>
                  updateDay(day.dayOfWeek, { endTime: event.target.value })
                }
              />
            </label>
          </div>
        ) : (
          <div className="availability-off-copy">
            Not available for scheduling
          </div>
        )}
      </div>
    );
  }

  const formAction = weekStart
    ? saveWeeklyAvailabilityAction
    : saveAvailabilityAction;

  return (
    <form action={formAction} className="availability-workspace">
      {weekStart ? <input type="hidden" name="weekStart" value={weekStart} /> : null}
      <section className="availability-quickbar" aria-label="Quick availability setup">
        <div>
          <p className="eyebrow">Quick setup</p>
          <span>Use Monday&apos;s hours as the starting point.</span>
        </div>
        <div className="availability-quick-actions">
          <button
            type="button"
            className="button secondary compact-button"
            disabled={locked}
            onClick={() => setAvailability((current) => applyWeekdays(current))}
          >
            Apply Mon–Fri
          </button>
          <button
            type="button"
            className="button secondary compact-button"
            disabled={locked}
            onClick={() => setAvailability((current) => applyAllDays(current))}
          >
            Apply Every Day
          </button>
          <button
            type="button"
            className="text-button availability-clear"
            disabled={locked}
            onClick={() => setAvailability((current) => clearAvailability(current))}
          >
            Clear All
          </button>
        </div>
      </section>

      <section className="panel availability-schedule-card">
        <div className="availability-group">
          <div className="availability-group-heading">
            <strong>Weekdays</strong>
            <span>Monday through Friday</span>
          </div>
          {WEEKDAYS.map(renderDay)}
        </div>

        <div className="availability-group weekend-group">
          <div className="availability-group-heading">
            <strong>Weekend</strong>
            <span>Saturday and Sunday</span>
          </div>
          {WEEKEND.map(renderDay)}
        </div>
      </section>

      <div className="availability-savebar">
        <div>
          <strong>
            {locked
              ? "Availability locked"
              : dirty
                ? "Unsaved changes"
                : "Availability up to date"}
          </strong>
          <span>
            {locked
              ? "The deadline for this schedule week has passed."
              : dirty
                ? "Save when your availability looks right."
                : weekStart
                  ? "This weekly submission is used for the selected schedule."
                  : "Changes will be used as your normal scheduling baseline."}
          </span>
        </div>
        <div className="availability-save-actions">
          <button
            className="button secondary"
            type="button"
            disabled={locked || !dirty}
            onClick={() => setAvailability(initialAvailability)}
          >
            Reset
          </button>
          <button
            className="button primary"
            type="submit"
            disabled={locked || !dirty}
          >
            Save Availability
          </button>
        </div>
      </div>
    </form>
  );
}
