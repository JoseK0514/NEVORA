"use client";

import { useMemo, useState } from "react";
import { EmployeeSubmitButton } from "@/components/employee-submit-button";
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
  employeeView = false,
}: {
  initialAvailability: AvailabilityState;
  weekStart?: string;
  locked?: boolean;
  employeeView?: boolean;
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
    <form action={formAction} className={employeeView ? "availability-preferences-card employee-availability-form" : "availability-preferences-card"}>
      {weekStart ? (
        <>
          <input type="hidden" name="weekStart" value={weekStart} />
          <input type="hidden" name="changedDays" value={DAYS.filter(day => JSON.stringify(availability[day.dayOfWeek]) !== JSON.stringify(initialAvailability[day.dayOfWeek])).map(day => day.dayOfWeek).join(",")} />
        </>
      ) : null}

      {!employeeView ? <header className="availability-preferences-header">
        <div>
          <span>Schedule Preferences</span>
          <h2>Weekly Availability</h2>
        </div>
        {locked ? (
          <span className="availability-locked-chip">Locked</span>
        ) : null}
      </header> : null}

      <div className="availability-preferences-list">
        {DAYS.map((day) => {
          const value = availability[day.dayOfWeek];

          return (
            <div className="availability-preference-row" key={day.dayOfWeek}>
              <div className="availability-preference-day">
                <strong>{day.label}</strong>
                {!employeeView ? <span>Preferred shift window</span> : null}
              </div>

              <div className="availability-preference-controls">
                <label className="availability-state-pill">
                  <input
                    type="checkbox"
                    name={`available-${day.dayOfWeek}`}
                    aria-label={employeeView ? `${day.label} availability` : undefined}
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
                      <span className={employeeView ? "sr-only" : undefined}>Start</span>
                      <input
                        type="time"
                        name={`start-${day.dayOfWeek}`}
                        aria-label={employeeView ? `${day.label} start time` : undefined}
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
                      <span className={employeeView ? "sr-only" : undefined}>End</span>
                      <input
                        type="time"
                        name={`end-${day.dayOfWeek}`}
                        aria-label={employeeView ? `${day.label} end time` : undefined}
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

        {employeeView ? (
          <EmployeeSubmitButton className="availability-preferences-button primary" pendingText="Saving…" disabled={locked || !weekStart && !dirty}>Save Preferences</EmployeeSubmitButton>
        ) : (
        <button
          className="availability-preferences-button primary"
          type="submit"
          disabled={locked || !weekStart && !dirty}
        >
          Save Preferences
        </button>
        )}
      </footer>
    </form>
  );
}