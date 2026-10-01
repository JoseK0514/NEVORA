"use client";

import { useMemo, useState } from "react";
import type { AvailabilityState } from "@/lib/availability-presets";
import {
  saveAvailabilityAction,
  saveWeeklyAvailabilityAction,
} from "@/app/app/availability/actions";

const DAYS = [
  { dayOfWeek: 1, label: "Monday" },
  { dayOfWeek: 2, label: "Tuesday" },
  { dayOfWeek: 3, label: "Wednesday" },
  { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" },
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
  const dirty = JSON.stringify(availability) !== initialSignature;

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

  const formAction = weekStart
    ? saveWeeklyAvailabilityAction
    : saveAvailabilityAction;

  return (
    <form action={formAction} className="availability-preferences-card">
      {weekStart ? (
        <input type="hidden" name="weekStart" value={weekStart} />
      ) : null}

      <header className="availability-preferences-header">
        <div>
          <span>Schedule Preferences</span>
          <h2>Weekly Availability</h2>
        </div>
        {locked ? (
          <span className="availability-locked-chip">Locked</span>
        ) : null}
      </header>

      <div className="availability-preferences-list">
        {DAYS.map((day) => {
          const value = availability[day.dayOfWeek];

          return (
            <div className="availability-preference-row" key={day.dayOfWeek}>
              <div className="availability-preference-day">
                <strong>{day.label}</strong>
                <span>Preferred shift window</span>
              </div>

              <div className="availability-preference-controls">
                <label className="availability-state-pill">
                  <input
                    type="checkbox"
                    name={`available-${day.dayOfWeek}`}
                    checked={value.available}
                    disabled={locked}
                    onChange={(event) =>
                      updateDay(day.dayOfWeek, {
                        available: event.target.checked,
                      })
                    }
                  />
                  <span>
                    {value.available ? "Available" : "Unavailable"}
                  </span>
                </label>

                {value.available ? (
                  <div className="availability-inline-times">
                    <label>
                      <span>Start</span>
                      <input
                        type="time"
                        name={`start-${day.dayOfWeek}`}
                        value={value.startTime}
                        disabled={locked}
                        onChange={(event) =>
                          updateDay(day.dayOfWeek, {
                            startTime: event.target.value,
                          })
                        }
                      />
                    </label>

                    <span className="availability-time-arrow" aria-hidden="true">
                      –
                    </span>

                    <label>
                      <span>End</span>
                      <input
                        type="time"
                        name={`end-${day.dayOfWeek}`}
                        value={value.endTime}
                        disabled={locked}
                        onChange={(event) =>
                          updateDay(day.dayOfWeek, {
                            endTime: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="availability-preferences-actions">
        <button
          className="availability-preferences-button secondary"
          type="button"
          disabled={locked || !dirty}
          onClick={() => setAvailability(initialAvailability)}
        >
          Reset Changes
        </button>

        <button
          className="availability-preferences-button primary"
          type="submit"
          disabled={locked || !dirty}
        >
          Save Preferences
        </button>
      </footer>
    </form>
  );
}