"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { EmployeeSubmitButton } from "@/components/employee-submit-button";
import { requestTimeOffAction } from "@/app/app/requests/actions";
import { formatTime } from "@/lib/date-utils";

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

/** An unsent request survives switching to My requests and Back (Codex W2). It is kept in memory only
 *  (never browser storage), for the same person, and cleared on Cancel, on submit and on reload. */
type Draft = { owner: string; partialDay: boolean; startDate: string; endDate: string; startTime: string; endTime: string; reason: string };
let unsent: Draft | null = null;

export function TimeOffForm({ requestId, draftOwner = "" }: { requestId: string; employeeView?: boolean; draftOwner?: string }) {
  const kept = draftOwner && unsent?.owner === draftOwner ? unsent : null;
  const [partialDay, setPartialDay] = useState(kept?.partialDay ?? false);
  const [startDate, setStartDate] = useState(kept?.startDate ?? "");
  const [endDate, setEndDate] = useState(kept?.endDate ?? "");
  const [startTime, setStartTime] = useState(kept?.startTime ?? "");
  const [endTime, setEndTime] = useState(kept?.endTime ?? "");
  const [reason, setReason] = useState(kept?.reason ?? "");
  useEffect(() => {
    if (!draftOwner) return;
    const empty = !startDate && !endDate && !startTime && !endTime && !reason.trim();
    unsent = empty ? null : { owner: draftOwner, partialDay, startDate, endDate, startTime, endTime, reason };
  }, [draftOwner, partialDay, startDate, endDate, startTime, endTime, reason]);
  const effectiveEnd = partialDay ? startDate : endDate;
  const datesValid = !!startDate && !!effectiveEnd && effectiveEnd >= startDate;
  const timesInvalid = !!startTime && !!endTime && startTime >= endTime;
  // TC-P3-31 / IS (round 3): a failed send (network, 401, 403) keeps the page and every entered field, and says the
  // request wasn't sent. Redirects and other Next signals still pass through.
  const [failed, setFailed] = useState(false);
  async function send(data: FormData) {
    setFailed(false);
    try { await requestTimeOffAction(data); }
    catch (error) { unstable_rethrow(error); setFailed(true); }
  }
  const days = datesValid ? Math.round((Date.parse(effectiveEnd) - Date.parse(startDate)) / 86400000) + 1 : 0;

  return (
    <form action={send} className="nto-form" onSubmit={() => { unsent = null; }}>
      <input type="hidden" name="requestId" value={requestId} />
      <div className="nto-compose">
        <div className="nto-form-fields">
          <fieldset className="nto-fieldset">
            <legend>How much time do you need?</legend>
            <div className="nto-type-picker" role="group" aria-label="Request type">
              <button type="button" aria-pressed={!partialDay} onClick={() => setPartialDay(false)}><CalendarBlankIcon size={20} aria-hidden="true" /> Full day</button>
              <button type="button" aria-pressed={partialDay} onClick={() => setPartialDay(true)}><ClockIcon size={20} aria-hidden="true" /> Partial day</button>
            </div>
            <input type="hidden" name="partialDay" value={partialDay ? "on" : ""} />
            <p className="nto-hint">{partialDay ? "Choose one date and the hours you need away." : "Request one day or a range of days."}</p>
          </fieldset>
          <fieldset className="nto-fieldset">
            <legend>{partialDay ? "Date and time" : "Choose your dates"}</legend>
            <div className={`nto-date-fields${partialDay ? " nto-single-date" : ""}`}>
              <label htmlFor="timeoff-start-date"><span>{partialDay ? "Date" : "Start date"}</span><input id="timeoff-start-date" type="date" name="startDate" required value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
              {partialDay ? <input type="hidden" name="endDate" value={startDate} /> : <label htmlFor="timeoff-end-date"><span>End date</span><input id="timeoff-end-date" type="date" name="endDate" required min={startDate || undefined} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>}
            </div>
            {partialDay ? <div className="nto-date-fields nto-time-fields">
              <label htmlFor="timeoff-start-time"><span>Start time</span><input id="timeoff-start-time" type="time" name="startTime" required value={startTime} onChange={event => setStartTime(event.target.value)} /></label>
              <label htmlFor="timeoff-end-time"><span>End time</span><input id="timeoff-end-time" type="time" name="endTime" required min={startTime || undefined} aria-invalid={timesInvalid || undefined} aria-describedby={timesInvalid ? "timeoff-time-error" : undefined} value={endTime} onChange={event => setEndTime(event.target.value)} /></label>
            </div> : null}
            {partialDay && timesInvalid ? <p className="nto-field-error" id="timeoff-time-error" role="alert">End time must be after start time.</p> : null}
          </fieldset>
          <div className="nto-note-field">
            <label htmlFor="timeoff-note">Note <span className="nto-optional">Optional</span></label>
            <textarea id="timeoff-note" name="reason" maxLength={250} rows={3} placeholder="Anything your manager should know?" value={reason} onChange={event => setReason(event.target.value)} aria-describedby="timeoff-note-hint" />
            <div className="nto-note-hint"><p id="timeoff-note-hint">Only include details you want to share.</p><span>{`${reason.length}/250`}</span></div>
          </div>
        </div>
        <aside className="nto-summary" aria-label="Request summary">
          <span className="nto-summary-icon"><CalendarBlankIcon size={26} weight="duotone" aria-hidden="true" /></span>
          <h3>Your request at a glance</h3>
          <div className="nto-summary-facts" aria-live="polite" aria-atomic="true">
            <strong>{datesValid ? `${days} ${days === 1 ? "day" : "days"}${partialDay ? " · partial day" : " away"}` : "Choose your time away"}</strong>
            <p>{datesValid ? `${dateLabel(startDate)}${effectiveEnd !== startDate ? ` – ${dateLabel(effectiveEnd)}` : ""}` : "Your dates will appear here."}</p>
            {partialDay && startTime && endTime && !timesInvalid ? <p>{formatTime(startTime)} – {formatTime(endTime)}</p> : null}
          </div>
          <div className="nto-next-step"><ClockIcon size={18} aria-hidden="true" /><p><strong>Manager review comes next</strong><span>Track the decision in My requests. Time away is confirmed when your request is approved.</span></p></div>
        </aside>
      </div>
      {failed ? <p className="form-error" role="alert">Your request wasn’t sent. Check your connection and send it again. If this keeps happening, <Link href="/login">sign in again</Link>.</p> : null}
      <footer className="nto-form-footer">
        <Link className="nto-button nto-secondary" href="/app/requests?tab=my" onClick={() => { unsent = null; }}>Cancel</Link>
        <EmployeeSubmitButton className="nto-button nto-primary" pendingText="Submitting request…" disabled={partialDay && timesInvalid}>Submit request <ArrowRightIcon size={18} aria-hidden="true" /></EmployeeSubmitButton>
      </footer>
    </form>
  );
}
