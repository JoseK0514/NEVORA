"use client";

import { useMemo, useState } from "react";
import { NavIcon } from "@/components/nav-icon";
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

function minutesBetween(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return Math.max(0, endHour * 60 + endMinute - (startHour * 60 + startMinute));
}

function durationLabel(startTime: string, endTime: string) {
  const minutes = minutesBetween(startTime, endTime);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

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
  const availableDays = Object.values(availability).filter((day) => day.available);
  const totalAvailableMinutes = availableDays.reduce(
    (sum, day) => sum + minutesBetween(day.startTime, day.endTime),
    0,
  );
  const totalAvailableHours = Math.floor(totalAvailableMinutes / 60);
  const totalAvailableRemainder = totalAvailableMinutes % 60;

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
              <span className="availability-time-input-wrap">
                <span className="availability-time-icon" aria-hidden="true">
                  <NavIcon name="clock" size={16} />
                </span>
                <input
                  type="time"
                  name={`start-${day.dayOfWeek}`}
                  value={value.startTime}
                  disabled={locked}
                  onChange={(event) =>
                    updateDay(day.dayOfWeek, { startTime: event.target.value })
                  }
                />
              </span>
            </label>

            <span className="availability-time-separator">–</span>

            <label>
              <span>Until</span>
              <span className="availability-time-input-wrap">
                <span className="availability-time-icon" aria-hidden="true">
                  <NavIcon name="clock" size={16} />
                </span>
                <input
                  type="time"
                  name={`end-${day.dayOfWeek}`}
                  value={value.endTime}
                  disabled={locked}
                  onChange={(event) =>
                    updateDay(day.dayOfWeek, { endTime: event.target.value })
                  }
                />
              </span>
            </label>

            <span className="availability-duration">
              {durationLabel(value.startTime, value.endTime)}
            </span>
          </div>
        ) : null}
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
        <div className="availability-quick-intro">
          <span className="availability-quick-icon" aria-hidden="true">
            <NavIcon name="calendar" size={20} />
          </span>
          <span className="availability-quick-copy">
            <strong>Quick setup</strong>
            <small>Use Monday&apos;s hours as the starting point.</small>
          </span>
        </div>

        <div className="availability-summary">
          <strong>{availableDays.length} of 7 days available</strong>
          <small>
            {availableDays.length
              ? `${totalAvailableHours}h ${totalAvailableRemainder}m total weekly availability`
              : "No availability set yet."}
          </small>
        </div>

        <div className="availability-quick-actions">
          <button
            type="button"
            className="button primary compact-button availability-apply-weekdays"
            disabled={locked}
            onClick={() => setAvailability((current) => applyWeekdays(current))}
          >
            <NavIcon name="templates" size={15} />
            Apply Mon–Fri
          </button>
          <button
            type="button"
            className="button secondary compact-button"
            disabled={locked}
            onClick={() => setAvailability((current) => applyAllDays(current))}
          >
            <NavIcon name="calendar" size={15} />
            Apply Every Day
          </button>
          <button
            type="button"
            className="button ghost compact-button availability-clear"
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

      <div className={dirty ? "availability-savebar is-dirty" : "availability-savebar"}>
        <div className="availability-save-status">
          <span className="availability-save-icon" aria-hidden="true">
            <NavIcon name={locked || dirty ? "alert" : "coverage"} size={20} />
          </span>
          <span className="availability-save-copy">
            <strong>
              {locked
                ? "Availability locked"
                : dirty
                  ? "Unsaved changes"
                  : "Availability up to date"}
            </strong>
            <small>
              {locked
                ? "The deadline for this schedule week has passed."
                : dirty
                  ? "Save when your availability looks right."
                  : weekStart
                    ? "This weekly submission is used for the selected schedule."
                    : "Changes will be used as your normal scheduling baseline."}
            </small>
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
