"use client";

import { useState } from "react";
import { requestTimeOffAction } from "@/app/app/requests/actions";

export function TimeOffForm() {
  const [partialDay, setPartialDay] = useState(false);

  return (
    <form action={requestTimeOffAction} className="employee-form timeoff-form">
      <div className="form-columns timeoff-date-grid">
        <label>
          Start date
          <input type="date" name="startDate" required />
        </label>
        <label>
          End date
          <input type="date" name="endDate" required />
        </label>
      </div>

      <div className="timeoff-type-row">
        <fieldset className="request-type-fieldset">
          <legend>Request type</legend>
          <div className="request-type-switch" role="group" aria-label="Request type">
            <button
              className={!partialDay ? "selected" : ""}
              type="button"
              aria-pressed={!partialDay}
              onClick={() => setPartialDay(false)}
            >
              Full day
            </button>
            <button
              className={partialDay ? "selected" : ""}
              type="button"
              aria-pressed={partialDay}
              onClick={() => setPartialDay(true)}
            >
              Partial day
            </button>
          </div>
          <input type="hidden" name="partialDay" value={partialDay ? "on" : ""} />
        </fieldset>

        {partialDay ? (
          <div className="form-columns partial-time-fields">
            <label>
              Start time
              <input type="time" name="startTime" required />
            </label>
            <label>
              End time
              <input type="time" name="endTime" required />
            </label>
          </div>
        ) : (
          <p className="timeoff-type-hint">
            Covers the full selected day or date range.
          </p>
        )}
      </div>

      <label className="timeoff-reason">
        <span className="field-label-row">
          <span>Note</span>
          <span>Optional</span>
        </span>
        <textarea
          name="reason"
          maxLength={250}
          rows={3}
          placeholder="Anything management should know?"
        />
      </label>

      <div className="timeoff-actionbar">
        <p>Requests stay pending until they are reviewed.</p>
        <button className="button primary timeoff-submit" type="submit">
          Submit request
        </button>
      </div>
    </form>
  );
}
