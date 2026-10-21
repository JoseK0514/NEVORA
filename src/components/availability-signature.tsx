"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import type { AvailabilityState } from "@/lib/availability-presets";
import { saveAvailabilityAction, saveWeeklyAvailabilityAction } from "@/app/app/availability/actions";
import { formatTime } from "@/lib/date-utils";
import { revealFeedback } from "@/lib/reveal-feedback";
import { EmployeeSubmitButton } from "./employee-submit-button";
import { SigHead } from "./signature/signature";
import styles from "./availability-signature.module.css";

/* Availability in the Signature style (phase 3, approved Oct 20, 2026; target:
 * docs/product/specs/employee-style/signature/phase-3/p3c-board-a.png). A week chart that follows your edits, then each
 * day with its switch and hours. Same form, names, labels ("Monday availability", "Monday start time"), hidden week
 * fields, Reset, Save/Submit and failure handling as AvailabilityEditor. */

const DAYS = [
  { dayOfWeek: 1, label: "Monday" }, { dayOfWeek: 2, label: "Tuesday" }, { dayOfWeek: 3, label: "Wednesday" }, { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" }, { dayOfWeek: 6, label: "Saturday" }, { dayOfWeek: 0, label: "Sunday" },
];
export type AvailabilityStatus = { label: string; tone: "amber" | "teal" | "gray" } | null;

const toMinutes = (time: string) => { const [h, m] = time.split(":").map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : NaN; };
/** Start and end in minutes; an end of midnight runs to the end of the day. */
function spanOf(value: AvailabilityState[number]) {
  const start = toMinutes(value.startTime), raw = toMinutes(value.endTime), end = raw === 0 ? 1440 : raw;
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : null;
}
/** "8 hours", "4 hours 30 min". */
function length(span: { start: number; end: number }) { const total = span.end - span.start, h = Math.floor(total / 60), m = total % 60; return `${h ? `${h} ${h === 1 ? "hour" : "hours"}` : ""}${h && m ? " " : ""}${m ? `${m} min` : ""}`; }
const hourLabel = (minutes: number) => formatTime(`${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:00`).replace(":00", "");

function WeekChart({ availability }: { availability: AvailabilityState }) {
  const spans = DAYS.map(day => availability[day.dayOfWeek].available ? spanOf(availability[day.dayOfWeek]) : null);
  const set = spans.filter((span): span is { start: number; end: number } => !!span);
  const total = set.reduce((sum, span) => sum + span.end - span.start, 0);
  // The chart's range follows the hours people chose: whole hours around them, at least twelve hours tall.
  let from = set.length ? Math.floor(Math.min(...set.map(span => span.start)) / 60) * 60 : 360;
  let to = set.length ? Math.ceil(Math.max(...set.map(span => span.end)) / 60) * 60 : 1080;
  if (to - from < 720) { const pad = (720 - (to - from)) / 2; from = Math.max(0, from - pad); to = Math.min(1440, from + 720); from = Math.max(0, to - 720); }
  const hours = Math.floor(total / 60), minutes = total % 60;
  return <div className={styles.avChart} role="img" aria-label={`${hours} hours${minutes ? ` ${minutes} minutes` : ""} across ${set.length} ${set.length === 1 ? "day" : "days"}`}>
    <div className={styles.avAxis} aria-hidden="true"><span>{hourLabel(from)}</span><span>{hourLabel((from + to) / 2)}</span><span>{hourLabel(to)}</span></div>
    {DAYS.map((day, index) => {
      const span = spans[index];
      return <div className={styles.avCol} data-off={span ? undefined : ""} key={day.dayOfWeek} aria-hidden="true">
        <div className={styles.avTrack}>{span ? <span style={{ top: `${((span.start - from) / (to - from)) * 100}%`, height: `${((span.end - span.start) / (to - from)) * 100}%` }} /> : null}</div>
        <small>{day.label[0]}</small>
      </div>;
    })}
  </div>;
}

function Fields({ initialAvailability, weekStart, locked, status, after }: { initialAvailability: AvailabilityState; weekStart?: string; locked: boolean; status: AvailabilityStatus; after: string }) {
  const { pending } = useFormStatus();
  const [availability, setAvailability] = useState(initialAvailability);
  const initialSignature = useMemo(() => JSON.stringify(initialAvailability), [initialAvailability]);
  const dirty = JSON.stringify(availability) !== initialSignature;
  const disabled = locked || pending;
  const changedDays = DAYS.filter(day => JSON.stringify(availability[day.dayOfWeek]) !== JSON.stringify(initialAvailability[day.dayOfWeek])).map(day => day.dayOfWeek);
  const availableDays = DAYS.filter(day => availability[day.dayOfWeek].available).length;
  const total = DAYS.reduce((sum, day) => { const span = availability[day.dayOfWeek].available ? spanOf(availability[day.dayOfWeek]) : null; return sum + (span ? span.end - span.start : 0); }, 0);
  const pill = dirty ? { label: "Unsaved changes", tone: "amber" } : status ?? { label: weekStart ? "Not submitted" : "Saved", tone: weekStart ? "amber" : "gray" };
  function updateDay(dayOfWeek: number, patch: Partial<AvailabilityState[number]>) {
    setAvailability(current => ({ ...current, [dayOfWeek]: { ...current[dayOfWeek], ...patch } }));
  }

  return <>
    {weekStart ? <><input type="hidden" name="weekStart" value={weekStart} /><input type="hidden" name="changedDays" value={changedDays.join(",")} /></> : null}
    <SigHead title="Your week" />
    <div className="sg-card">
      <div className="sg-card-head"><span className="sg-tile" aria-hidden="true"><ClockIcon size={22} /></span>
        <span className={styles.avHeadCopy}><b>{Math.floor(total / 60)} {Math.floor(total / 60) === 1 ? "hour" : "hours"}{total % 60 ? ` ${total % 60} min` : ""}</b><small>{availableDays ? `Across ${availableDays} ${availableDays === 1 ? "day" : "days"}` : "No available days yet"}</small></span>
        <span className="sg-pill" data-tone={pill.tone}>{pill.label}</span></div>
      <WeekChart availability={availability} />
    </div>
    <SigHead title="Day by day" />
    <fieldset className={`sg-card ${styles.avDays}`} disabled={disabled}>
      <legend className="nv-sr">Availability by day</legend>
      {DAYS.map(day => {
        const value = availability[day.dayOfWeek];
        return <div className={styles.avDay} data-on={value.available || undefined} key={day.dayOfWeek}>
          <div className={styles.avDayTop}>
            <span className={styles.avDayName} aria-hidden="true">{day.label.slice(0, 3)}</span>
            <span className={styles.avDaySum}>{value.available ? (spanOf(value) ? length(spanOf(value)!) : "Check the hours") : "Unavailable"}</span>
            <label className={styles.avSwitch}><input type="checkbox" role="switch" name={`available-${day.dayOfWeek}`} aria-label={`${day.label} availability`} checked={value.available} onChange={event => updateDay(day.dayOfWeek, { available: event.target.checked })} /><span aria-hidden="true" /></label>
          </div>
          {value.available ? <div className={styles.avTimes}>
            <label><span>From</span><input type="time" required name={`start-${day.dayOfWeek}`} aria-label={`${day.label} start time`} value={value.startTime} onChange={event => updateDay(day.dayOfWeek, { startTime: event.target.value })} /></label>
            <i aria-hidden="true"><ArrowRightIcon size={16} /></i>
            <label><span>Until</span><input type="time" required name={`end-${day.dayOfWeek}`} aria-label={`${day.label} end time`} value={value.endTime} onChange={event => updateDay(day.dayOfWeek, { endTime: event.target.value })} /></label>
          </div> : null}
        </div>;
      })}
    </fieldset>
    <p className={styles.avHint}>An end time of midnight includes the rest of that day.</p>
    {weekStart && availableDays === 0 ? <p className={`sg-alert ${styles.avZero}`}>Submitting with every day unavailable tells your manager you cannot work this week.</p> : null}
    <EmployeeSubmitButton className="sg-cta" pendingText="Saving…" disabled={locked || (!weekStart && !dirty)}>{weekStart ? "Submit weekly availability" : "Save usual week"}</EmployeeSubmitButton>
    <p className="sg-after" role="status" aria-live="polite">{pending ? "Saving your availability…" : locked ? "This week is closed for changes." : dirty ? "You have unsaved changes." : after}</p>
    {dirty && !disabled ? <div className="sg-center"><button type="button" className="sg-link" onClick={() => setAvailability(initialAvailability)}>Reset changes</button></div> : null}
  </>;
}

export function AvailabilitySignatureEditor({ initialAvailability, weekStart, locked = false, status = null, after }: { initialAvailability: AvailabilityState; weekStart?: string; locked?: boolean; status?: AvailabilityStatus; after: string }) {
  const [failed, setFailed] = useState(0);
  const failures = useRef(0);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (failed && feedback.current) revealFeedback(feedback.current); }, [failed]);
  const saving = useRef(false);
  async function save(data: FormData) {
    if (saving.current) return;
    saving.current = true;
    setFailed(0);
    try { await (weekStart ? saveWeeklyAvailabilityAction : saveAvailabilityAction)(data); }
    catch (error) { unstable_rethrow(error); setFailed(++failures.current); }
    finally { saving.current = false; }
  }
  return <form action={save} onReset={event => event.preventDefault()} className={styles.avForm} aria-label={weekStart ? "Weekly availability submission" : "Normal availability preferences"}>
    <Fields initialAvailability={initialAvailability} weekStart={weekStart} locked={locked} status={status} after={after} />
    {failed ? <p ref={feedback} tabIndex={-1} className={`sg-alert ${styles.avFailed}`} role="alert">Your availability wasn’t saved. Check your connection and save again. If this keeps happening, <Link href="/login">sign in again</Link>.</p> : null}
  </form>;
}
