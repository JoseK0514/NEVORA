"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { EmployeeSubmitButton } from "@/components/employee-submit-button";
import { SigBand, SigHead, SigPage } from "@/components/signature/signature";
import { requestTimeOffAction } from "@/app/app/requests/actions";
import { formatTime } from "@/lib/date-utils";
import { revealFeedback } from "@/lib/reveal-feedback";
import styles from "./time-off-signature.module.css";

/* New time-off request in the Signature style (phase 3, approved Oct 20, 2026; target:
 * docs/product/specs/employee-style/signature/phase-3/p3c-board-a.png). The band says how long you'd be away as you
 * choose; the dates sit in a ticket whose halves are the native date fields. Same fields, names, draft memory,
 * failure handling and submit as TimeOffForm (form.nto-form, "Full day"/"Partial day", "Start date"/"End date",
 * "Start time"/"End time", "Submit request"). */

type Draft = { owner: string; partialDay: boolean; startDate: string; endDate: string; startTime: string; endTime: string; reason: string };
let unsent: Draft | null = null;

const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const fmt = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(utc(date));
const minutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };

/** One half of the ticket: the label and figure people see, with the native date field over it. */
function DateHalf({ id, name, label, eyebrow, value, min, onChange }: { id: string; name: string; label: string; eyebrow: string; value: string; min?: string; onChange: (value: string) => void }) {
  return <label htmlFor={id} className={styles.toHalf}>
    <small>{eyebrow}</small>
    <b data-empty={value ? undefined : ""} aria-hidden="true">{value ? Number(value.slice(8)) : "—"}</b>
    <span aria-hidden="true">{value ? fmt(value, { weekday: "long" }) : "Choose"}</span>
    <span aria-hidden="true">{value ? fmt(value, { month: "long" }) : "a date"}</span>
    <input id={id} type="date" name={name} required aria-label={label} min={min} value={value}
      onClick={event => { try { event.currentTarget.showPicker(); } catch { /* Older browsers open their own picker. */ } }}
      onChange={event => onChange(event.target.value)} />
  </label>;
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Wide screens (1024 and up): a month to pick the dates from. The first tap sets the start, the next the end; it fills
 * the same fields as the ticket. Hidden on phones, where the native date fields are the picker. */
function MonthPicker({ today, start, end, single, onPick }: { today: string; start: string; end: string; single: boolean; onPick: (start: string, end: string) => void }) {
  const anchor = start || today;
  const [view, setView] = useState(() => ({ y: Number(anchor.slice(0, 4)), m: Number(anchor.slice(5, 7)) - 1 }));
  const first = new Date(Date.UTC(view.y, view.m, 1)), days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const move = (step: number) => setView(current => { const d = new Date(Date.UTC(current.y, current.m + step, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  function pick(date: string) {
    if (single || !start || (start && end && end >= start) || date < start) { onPick(date, single ? date : ""); return; }
    onPick(start, date);
  }
  const label = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(first);
  return <div className={`sg-card ${styles.toMonth}`} role="group" aria-label={`Choose dates, ${label}`}>
    <div className={styles.toMonthHead}><b aria-live="polite">{label}</b><span>
      <button type="button" onClick={() => move(-1)} aria-label="Previous month"><CaretLeftIcon size={16} aria-hidden="true" /></button>
      <button type="button" onClick={() => move(1)} aria-label="Next month"><CaretRightIcon size={16} aria-hidden="true" /></button></span></div>
    <div className={styles.toMonthDays} aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <small key={index}>{day}</small>)}</div>
    <div className={styles.toMonthGrid}>
      {Array.from({ length: lead }, (_, index) => <span key={`x${index}`} />)}
      {Array.from({ length: days }, (_, index) => {
        const date = iso(view.y, view.m, index + 1), inRange = !!start && !!end && date > start && date < end;
        const edge = date === start && date === end ? "both" : date === start ? "start" : date === end ? "end" : undefined;
        return <button key={date} type="button" data-edge={edge} data-range={inRange || undefined} data-today={date === today || undefined} data-past={date < today || undefined}
          aria-pressed={!!edge || inRange} aria-label={fmt(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} onClick={() => pick(date)}>{index + 1}</button>;
      })}
    </div>
  </div>;
}

export function TimeOffSignatureForm({ requestId, draftOwner = "", notice, viewLink, today }: { requestId: string; draftOwner?: string; notice?: ReactNode; viewLink: ReactNode; /** The workspace's business date, for the month calendar on wide screens. */ today: string }) {
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
  const hero = partialDay
    ? span ? `${Math.floor(span / 60) ? `${Math.floor(span / 60)}h` : ""}${span % 60 ? ` ${span % 60}m` : ""} away`.trim() : startDate ? "Part of a day" : "Plan time away"
    : datesValid ? `${days} ${days === 1 ? "day" : "days"} away` : "Plan time away";
  const sub = partialDay
    ? startDate ? `${fmt(startDate, { weekday: "long", month: "short", day: "numeric" })}${span ? ` · ${formatTime(startTime)} – ${formatTime(endTime)}` : ""}` : "Choose the date and hours below."
    : datesValid ? `${fmt(startDate, { weekday: "short", month: "short", day: "numeric" })}${effectiveEnd !== startDate ? ` – ${fmt(effectiveEnd, { weekday: "short", month: "short", day: "numeric" })}` : ""}` : "Choose your dates below.";

  return <SigPage className={styles.toRoot} band={<SigBand eyebrow="Time off">
    <h1 className="nv-sr">Time off</h1>
    <p className={`sg-word ${styles.toHero}`} aria-live="polite">{hero}</p>
    <p className="sg-sub"><span>{sub}</span></p>
    {viewLink}
  </SigBand>}>
    {notice}
    <form action={send} className={`nto-form ${styles.toForm}`} onSubmit={() => { unsent = null; }}>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="partialDay" value={partialDay ? "on" : ""} />
      <MonthPicker today={today} start={startDate} end={partialDay ? startDate : endDate} single={partialDay} onPick={(start, end) => { setStartDate(start); if (!partialDay) setEndDate(end); }} />
      <div className={styles.toSeg} role="group" aria-label="Request type">
        <button type="button" aria-pressed={!partialDay} onClick={() => setPartialDay(false)}>Full day</button>
        <button type="button" aria-pressed={partialDay} onClick={() => setPartialDay(true)}>Partial day</button>
      </div>
      <fieldset className={`sg-card ${styles.toDates}`}>
        <legend className="nv-sr">{partialDay ? "Date and time" : "Choose your dates"}</legend>
        {partialDay ? <div className={`sg-ticket ${styles.toSingle}`}>
          <DateHalf id="timeoff-start-date" name="startDate" label="Date" eyebrow="Date" value={startDate} onChange={setStartDate} />
          <input type="hidden" name="endDate" value={startDate} />
        </div> : <div className="sg-ticket">
          <DateHalf id="timeoff-start-date" name="startDate" label="Start date" eyebrow="From" value={startDate} onChange={setStartDate} />
          <i aria-hidden="true"><ArrowRightIcon size={18} /></i>
          <DateHalf id="timeoff-end-date" name="endDate" label="End date" eyebrow="Until" value={endDate} min={startDate || undefined} onChange={setEndDate} />
        </div>}
        {partialDay ? <div className={styles.toTimes}>
          <label htmlFor="timeoff-start-time"><span>Start time</span><input id="timeoff-start-time" type="time" name="startTime" required value={startTime} onChange={event => setStartTime(event.target.value)} /></label>
          <i aria-hidden="true"><ArrowRightIcon size={16} /></i>
          <label htmlFor="timeoff-end-time"><span>End time</span><input id="timeoff-end-time" type="time" name="endTime" required min={startTime || undefined} aria-invalid={timesInvalid || undefined} aria-describedby={timesInvalid ? "timeoff-time-error" : undefined} value={endTime} onChange={event => setEndTime(event.target.value)} /></label>
        </div> : null}
        {partialDay && timesInvalid ? <p className={styles.toError} id="timeoff-time-error" role="alert">End time must be after start time.</p> : null}
        <p className="sg-card-foot"><CalendarBlankIcon size={18} aria-hidden="true" />{partialDay ? "One date and the hours you need away" : "Tap a date to change it"}</p>
      </fieldset>
      <SigHead title={<label htmlFor="timeoff-note">Note</label>} aside="Optional" />
      <div className={`sg-card ${styles.toNote}`}>
        <textarea id="timeoff-note" name="reason" maxLength={250} rows={3} placeholder="Anything your manager should know?" value={reason} onChange={event => setReason(event.target.value)} aria-describedby="timeoff-note-hint" />
        <p className="sg-card-foot"><span id="timeoff-note-hint">Only include details you want to share.</span><span className={styles.toCount}>{`${reason.length}/250`}</span></p>
      </div>
      {failed ? <p ref={feedback} tabIndex={-1} className={`sg-alert ${styles.toFailed}`} role="alert">Your request wasn’t sent. Check your connection and send it again. If this keeps happening, <Link href="/login">sign in again</Link>.</p> : null}
      <EmployeeSubmitButton className="sg-cta" pendingText="Submitting request…" disabled={partialDay && timesInvalid}>Submit request</EmployeeSubmitButton>
      <p className="sg-after">Your manager reviews it. The time is yours once it’s approved.</p>
      <div className="sg-center"><Link className="sg-link" href="/app/requests?tab=my" onClick={() => { unsent = null; }}>Cancel</Link></div>
    </form>
  </SigPage>;
}
