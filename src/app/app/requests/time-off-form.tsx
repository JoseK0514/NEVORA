"use client";

import { useState } from "react";
import { requestTimeOffAction } from "@/app/app/requests/actions";

export function TimeOffForm() {
  const [partialDay, setPartialDay] = useState(false);

  return (
    <form action={requestTimeOffAction} className="timeoff-premium-form">
      <section className="timeoff-premium-section">
        <span className="timeoff-premium-label">DATES</span>
        <div className="timeoff-premium-date-row">
          <label className="timeoff-premium-field">
            <span>Start Date</span>
            <input type="date" name="startDate" required />
          </label>

          <label className="timeoff-premium-field">
            <span>End Date</span>
            <input type="date" name="endDate" required />
          </label>
        </div>
      </section>

      <section className="timeoff-premium-section">
        <span className="timeoff-premium-label">REQUEST TYPE</span>
        <fieldset className="timeoff-premium-type">
          <legend className="sr-only">Request type</legend>
          <div className="timeoff-premium-segmented" role="group" aria-label="Request type">
            <button
              className={!partialDay ? "selected" : ""}
              type="button"
              aria-pressed={!partialDay}
              onClick={() => setPartialDay(false)}
            >
              Full Day
            </button>
            <button
              className={partialDay ? "selected" : ""}
              type="button"
              aria-pressed={partialDay}
              onClick={() => setPartialDay(true)}
            >
              Partial Day
            </button>
          </div>
          <input type="hidden" name="partialDay" value={partialDay ? "on" : ""} />
        </fieldset>

        {partialDay ? (
          <div className="timeoff-premium-date-row">
            <label className="timeoff-premium-field">
              <span>Start Time</span>
              <input type="time" name="startTime" required />
            </label>
            <label className="timeoff-premium-field">
              <span>End Time</span>
              <input type="time" name="endTime" required />
            </label>
          </div>
        ) : null}
      </section>

      <section className="timeoff-premium-section">
        <span className="timeoff-premium-label">OPTIONAL NOTE</span>
        <label className="timeoff-premium-field">
          <span className="sr-only">Note</span>
          <textarea
            name="reason"
            maxLength={250}
            rows={3}
            placeholder="Anything management should know?"
          />
        </label>
      </section>

      <footer className="timeoff-premium-actions">
        <small>Requests stay pending until they are reviewed.</small>
        <button className="timeoff-premium-submit" type="submit">
          Submit Request
        </button>
      </footer>
    </form>
  );
}