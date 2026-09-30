"use client";

import { useState } from "react";
import { NavIcon } from "@/components/nav-icon";
import { requestTimeOffAction } from "@/app/app/requests/actions";

export function TimeOffForm({ requestId }: { requestId: string }) {
  const [partialDay, setPartialDay] = useState(false);
  const [noteLength, setNoteLength] = useState(0);

  return (
    <form action={requestTimeOffAction} className="employee-form timeoff-form">
      <input type="hidden" name="requestId" value={requestId} />
      <div className="timeoff-date-section">
        <strong className="timeoff-section-label">Dates</strong>
        <div className="form-columns timeoff-date-grid">
          <label>
            Start date
            <span className="timeoff-input-wrap">
              <span className="timeoff-input-icon" aria-hidden="true">
                <NavIcon name="calendar" size={18} />
              </span>
              <input type="date" name="startDate" required />
            </span>
          </label>
          <label>
            End date
            <span className="timeoff-input-wrap">
              <span className="timeoff-input-icon" aria-hidden="true">
                <NavIcon name="calendar" size={18} />
              </span>
              <input type="date" name="endDate" required />
            </span>
          </label>
        </div>
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
              <NavIcon name="calendar" size={16} />
              Full Day
            </button>
            <button
              className={partialDay ? "selected" : ""}
              type="button"
              aria-pressed={partialDay}
              onClick={() => setPartialDay(true)}
            >
              <NavIcon name="clock" size={16} />
              Partial Day
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
        <span className="timeoff-textarea-wrap">
          <textarea
            name="reason"
            maxLength={250}
            rows={3}
            placeholder="Anything management should know?"
            onChange={(event) => setNoteLength(event.currentTarget.value.length)}
          />
          <small className="timeoff-char-count">{noteLength} / 250</small>
        </span>
      </label>

      <div className="timeoff-actionbar">
        <p>
          <span className="timeoff-action-info" aria-hidden="true">i</span>
          Requests remain pending until they are reviewed.
        </p>
        <button className="button primary timeoff-submit" type="submit">
          <NavIcon name="timeOff" size={16} />
          Submit Request
        </button>
      </div>
    </form>
  );
}
