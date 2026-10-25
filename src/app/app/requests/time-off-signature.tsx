"use client";

import Link from "next/link";
import { unstable_rethrow, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EmployeeSubmitButton } from "@/components/employee-submit-button";
import { QuietSheet, SheetCancel } from "@/components/quiet/quiet-sheet";
import { requestTimeOffAction } from "@/app/app/requests/actions";
import { formatTime } from "@/lib/date-utils";
import { revealFeedback } from "@/lib/reveal-feedback";

/* New time-off request in the v5 "One look" (Jose approved round 2 "exactly like this" on Oct 24, 2026; mockup E08):
 * a sheet over Time off. Full days or part of a day, From and Until rows (native date pickers), an optional note, Send
 * in the bar. Same fields, names, draft memory, failure handling and submit as before (form.nto-form, "Start date"/
 * "End date", "Start time"/"End time"). */

type Draft = { owner: string; partialDay: boolean; startDate: string; endDate: string; startTime: string; endTime: string; reason: string };
let unsent: Draft | null = null;

const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const fmt = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(utc(date));
const minutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };

/** A row whose value opens the native picker: the label and value people see, with the real field over it. */
function PickerRow({ id, name, type, label, value, min, required = true, onChange, invalid, describedBy }: { id: string; name: string; type: "date" | "time"; label: string; value: string; min?: string; required?: boolean; onChange: (value: string) => void; invalid?: boolean; describedBy?: string }) {
  const shown = !value ? "Choose" : type === "date" ? fmt(value, { weekday: "short", month: "short", day: "numeric" }) : formatTime(value);
  return <li><label htmlFor={id} className="q-row q-row--one q-row--picker">
    <span className="q-rt"><b>{label}</b></span>
    <span className={`q-rv ${value ? "q-rv--go" : "q-rv--ph"}`} aria-hidden="true">{shown}</span>
    <input id={id} className="q-picker" type={type} name={name} required={required} min={min} value={value} aria-invalid={invalid || undefined} aria-describedby={describedBy}
      onClick={event => { try { event.currentTarget.showPicker(); } catch { /* Older browsers open their own picker. */ } }}
      onChange={event => onChange(event.target.value)} />
  </label></li>;
}

function TimeOffForm({ requestId, draftOwner = "", notice }: { requestId: string; draftOwner?: string; notice?: ReactNode }) {
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
  const [failed, setFailed] = useState(0);
  const failures = useRef(0);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (failed && feedback.current) revealFeedback(feedback.current); }, [failed]);
  async function send(data: FormData) {
    setFailed(0);
    try { await requestTimeOffAction(data); }
    catch (error) { unstable_rethrow(error); setFailed(++failures.current); }
  }
  const days = datesValid ? Math.round((Date.parse(effectiveEnd) - Date.parse(startDate)) / 86400000) + 1 : 0;
  const span = partialDay && startTime && endTime && !timesInvalid ? minutes(endTime) - minutes(startTime) : 0;
  const length = partialDay
    ? span ? `${Math.floor(span / 60) ? `${Math.floor(span / 60)} h` : ""}${span % 60 ? ` ${span % 60} min` : ""} away`.trim() : "One date and the hours you need away"
    : datesValid ? `${days} full ${days === 1 ? "day" : "days"}` : "Choose the first and last day you need away";

  return <form action={send} className="nto-form q-toform" onSubmit={() => { unsent = null; }}>
    <input type="hidden" name="requestId" value={requestId} />
    <input type="hidden" name="partialDay" value={partialDay ? "on" : ""} />
    <div className="q-nav"><SheetCancel href="/app/requests" /><h1 className="q-nav__t">Time off</h1><EmployeeSubmitButton className="q-nav__r q-nav__r--b" pendingText="Sending…" disabled={partialDay && timesInvalid}>Send</EmployeeSubmitButton></div>
    {notice}
    <div className="q-seg q-seg--sheet" role="group" aria-label="Request type">
      <button type="button" aria-pressed={!partialDay} onClick={() => setPartialDay(false)}>Full days</button>
      <button type="button" aria-pressed={partialDay} onClick={() => setPartialDay(true)}>Part of a day</button>
    </div>
    <fieldset className="q-fieldset">
      <legend className="nv-sr">{partialDay ? "Date and time" : "Choose your dates"}</legend>
      <ul className="q-list" style={{ marginTop: 16 }}>
        {partialDay ? <>
          <PickerRow id="timeoff-start-date" name="startDate" type="date" label="Date" value={startDate} onChange={setStartDate} />
          <PickerRow id="timeoff-start-time" name="startTime" type="time" label="Start time" value={startTime} onChange={setStartTime} />
          <PickerRow id="timeoff-end-time" name="endTime" type="time" label="End time" value={endTime} min={startTime || undefined} onChange={setEndTime} invalid={timesInvalid} describedBy={timesInvalid ? "timeoff-time-error" : undefined} />
        </> : <>
          <PickerRow id="timeoff-start-date" name="startDate" type="date" label="From" value={startDate} onChange={setStartDate} />
          <PickerRow id="timeoff-end-date" name="endDate" type="date" label="Until" value={endDate} min={startDate || undefined} onChange={setEndDate} />
        </>}
      </ul>
      {partialDay ? <input type="hidden" name="endDate" value={startDate} /> : null}
    </fieldset>
    {partialDay && timesInvalid ? <p className="q-help q-help--alert" id="timeoff-time-error" role="alert">End time must be after start time.</p> : <p className="q-help" aria-live="polite">{length}</p>}
    <div className="q-fl">
      <div className="q-fl__row"><label className="q-fl__label" htmlFor="timeoff-note">Note <span className="q-fl__opt">· optional</span></label><span className="q-fl__opt" aria-label={`${reason.length} of 250 characters`}>{reason.length}/250</span></div>
      <textarea id="timeoff-note" className="q-in" name="reason" maxLength={250} rows={3} placeholder="Only include details you want to share." value={reason} onChange={event => setReason(event.target.value)} />
    </div>
    {failed ? <p ref={feedback} tabIndex={-1} className="q-help q-help--alert" role="alert">Your request wasn’t sent. Check your connection and send it again. If this keeps happening, <Link href="/login">sign in again</Link>.</p> : null}
    <p className="q-help">Your manager reviews it. The time is yours once it’s approved.</p>
  </form>;
}

/** The request form as a sheet over Time off; open while the URL says ?tab=new (Plus on Requests, Request time off). */
export function TimeOffSheet({ open, closeHref, requestId, draftOwner, notice }: { open: boolean; closeHref: string; requestId: string; draftOwner?: string; notice?: ReactNode }) {
  const router = useRouter();
  return <QuietSheet open={open} label="Request time off" onClose={() => router.replace(closeHref, { scroll: false })}>
    <TimeOffForm key={requestId} requestId={requestId} draftOwner={draftOwner} notice={notice} />
  </QuietSheet>;
}
