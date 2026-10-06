"use client";

import Link from "next/link";
import { useState } from "react";
import { EmployeeSubmitButton } from "@/components/employee-submit-button";
import { requestTimeOffAction } from "@/app/app/requests/actions";

export function TimeOffForm({ requestId, employeeView = false }: { requestId: string; employeeView?: boolean }) {
  const [partialDay, setPartialDay] = useState(false);

  return (
    <form action={requestTimeOffAction} className={employeeView ? "timeoff-settings-form employee-timeoff-form" : "timeoff-settings-form"}>
      <input type="hidden" name="requestId" value={requestId} />
      <section className="timeoff-setting-row">
        <div className="timeoff-setting-copy">
          <strong>Dates</strong>
          {!employeeView ? <span>Select the days you need away.</span> : null}
        </div>

        <div className="timeoff-setting-control">
          <div className="timeoff-compact-date-row">
            <label>
              <span>Start</span>
              <input type="date" name="startDate" required />
            </label>
            <label>
              <span>End</span>
              <input type="date" name="endDate" required />
            </label>
          </div>
        </div>
      </section>

      <section className="timeoff-setting-row">
        <div className="timeoff-setting-copy">
          <strong>Request Type</strong>
          {!employeeView ? <span>Choose a full or partial day.</span> : null}
        </div>

        <div className="timeoff-setting-control">
          <fieldset className="timeoff-setting-fieldset">
            <legend className="sr-only">Request type</legend>
            <div className="timeoff-setting-segmented" role="group" aria-label="Request type">
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
            <div className="timeoff-compact-date-row timeoff-partial-time-row">
              <label>
                <span>Start Time</span>
                <input type="time" name="startTime" required />
              </label>
              <label>
                <span>End Time</span>
                <input type="time" name="endTime" required />
              </label>
            </div>
          ) : null}
        </div>
      </section>

      <section className="timeoff-setting-row timeoff-note-row">
        <div className="timeoff-setting-copy">
          <strong>Optional Note</strong>
          {!employeeView ? <span>Add context only if management needs it.</span> : null}
        </div>

        <div className="timeoff-setting-control">
          <label className="timeoff-note-field">
            <span className="sr-only">Optional note</span>
            <textarea
              name="reason"
              maxLength={250}
              rows={3}
              placeholder="Anything management should know?"
            />
          </label>
        </div>
      </section>

      <footer className="timeoff-settings-footer">
        <Link className="timeoff-settings-cancel" href="/app/requests?tab=my">
          Cancel
        </Link>
        {employeeView ? <EmployeeSubmitButton className="timeoff-settings-submit" pendingText="Submitting…">Submit Request</EmployeeSubmitButton> : (
        <button className="timeoff-settings-submit" type="submit">
          Submit Request
        </button>
        )}
      </footer>
    </form>
  );
}
