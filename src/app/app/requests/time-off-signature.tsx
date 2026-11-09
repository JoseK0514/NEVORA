"use client";

import Link from "next/link";
import { unstable_rethrow, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EmployeeSubmitButton } from "@/components/employee-submit-button";
import { QuietSheet, SheetCancel } from "@/components/quiet/quiet-sheet";
import { requestTimeOffAction } from "@/app/app/requests/actions";
import { PickField } from "@/components/employee-mobile/timeoff";
import "@/components/employee-mobile/timeoff-corp.css";
import { revealFeedback } from "@/lib/reveal-feedback";

/* New time-off request on the corporate kit (Release 1, board E-TimeOffSheet): a sheet over Time off with Cancel and
 * the title, All day / Part of day, From and To fields (the native pickers laid over the board's field), an optional
 * reason and Send request. Same fields, names, draft memory, failure handling and submit as before (form.nto-form, "Start date"/
 * "End date", "Start time"/"End time"). */

type Draft = { owner: string; partialDay: boolean; startDate: string; endDate: string; startTime: string; endTime: string; reason: string };
let unsent: Draft | null = null;


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
  return <div className="tof-sheet">
    <div className="c-sheet-head"><SheetCancel href="/app/requests" className="c-sheet-head__l" /><h2 id="timeoff-sheet-title">Request time off</h2><span /></div>
    <form action={send} className="nto-form tof-form" onSubmit={() => { unsent = null; }}>
    <input type="hidden" name="requestId" value={requestId} />
    <input type="hidden" name="partialDay" value={partialDay ? "on" : ""} />
    {notice}
    <fieldset className="tof-fields">
      <legend className="nv-sr">{partialDay ? "Date and time" : "Choose your dates"}</legend>
      <div className="c-seg tof-seg" role="group" aria-label="How long">
        <button type="button" aria-pressed={!partialDay} onClick={() => setPartialDay(false)}>All day</button>
        <button type="button" aria-pressed={partialDay} onClick={() => setPartialDay(true)}>Part of day</button>
      </div>
      {partialDay ? <>
        <PickField id="timeoff-start-date" name="startDate" type="date" label="Date" value={startDate} onChange={setStartDate} />
        <div className="tof-row">
          <PickField id="timeoff-start-time" name="startTime" type="time" label="Start" value={startTime} onChange={setStartTime} />
          <PickField id="timeoff-end-time" name="endTime" type="time" label="End" value={endTime} min={startTime || undefined} onChange={setEndTime} invalid={timesInvalid} describedBy={timesInvalid ? "timeoff-time-error" : undefined} />
        </div>
        <input type="hidden" name="endDate" value={startDate} />
      </> : <div className="tof-row">
        <PickField id="timeoff-start-date" name="startDate" type="date" label="From" value={startDate} onChange={setStartDate} />
        <PickField id="timeoff-end-date" name="endDate" type="date" label="To" value={endDate} min={startDate || undefined} onChange={setEndDate} />
      </div>}
      <div className="c-field"><label className="c-field__label" htmlFor="timeoff-note">Reason (optional)</label>
        <input id="timeoff-note" className="c-in" type="text" name="reason" maxLength={250} autoComplete="off" value={reason} onChange={event => setReason(event.target.value)} /></div>
    </fieldset>
    {partialDay && timesInvalid ? <p className="c-error" id="timeoff-time-error" role="alert">End time must be after start time.</p> : null}
    {failed ? <p ref={feedback} tabIndex={-1} className="c-error" role="alert">Your request wasn’t sent. Check your connection and send it again. If this keeps happening, <Link href="/login">sign in again</Link>.</p> : null}
    <p className="c-note">Your manager reviews it. The time is yours once it’s approved.</p>
    <EmployeeSubmitButton className="c-btn c-btn--full" pendingText="Sending…" disabled={partialDay && timesInvalid}>Send request</EmployeeSubmitButton>
  </form></div>;
}

/** The request form as a sheet over Time off; open while the URL says ?tab=new (Plus on Requests, Request time off). */
export function TimeOffSheet({ open, closeHref, requestId, draftOwner, notice }: { open: boolean; closeHref: string; requestId: string; draftOwner?: string; notice?: ReactNode }) {
  const router = useRouter();
  return <QuietSheet open={open} label="Request time off" onClose={() => router.replace(closeHref, { scroll: false })}>
    <TimeOffForm key={requestId} requestId={requestId} draftOwner={draftOwner} notice={notice} />
  </QuietSheet>;
}

/** Older links point at a request in the list (#request-…); the request now has its own page, so open it there. */
export function TimeOffHashLink() {
  const router = useRouter();
  useEffect(() => {
    const open = () => {
      try {
        const hash = decodeURIComponent(window.location.hash.slice(1));
        const id = hash.startsWith("request-") ? hash.slice(8) : "";
        if (/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id)) router.replace(`/app/requests?requestId=${encodeURIComponent(id)}`, { scroll: false });
      } catch { /* A malformed hash stays on the list. */ }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [router]);
  return null;
}
