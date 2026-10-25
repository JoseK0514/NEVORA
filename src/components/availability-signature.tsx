"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { unstable_rethrow, useRouter } from "next/navigation";
import "./quiet/u3.css";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import type { AvailabilityState } from "@/lib/availability-presets";
import { saveAvailabilityAction, saveWeeklyAvailabilityAction } from "@/app/app/availability/actions";
import { formatTime } from "@/lib/date-utils";
import { revealFeedback } from "@/lib/reveal-feedback";
import { EmployeeSubmitButton } from "./employee-submit-button";
import { QuietSheet, SheetCancel } from "./quiet/quiet-sheet";

/* Availability in the v5 "One look" (Jose approved round 2 "exactly like this" on Oct 24, 2026; mockup E10). Seven rows,
 * one per day; a day opens as a sheet with its switch and hours; Save sits in the bar. Same form, field names
 * (available-N, start-N, end-N), hidden week fields, Save/Submit, Reset and failure handling as before. */

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
/** "32 h" or "31.5 h" */
const hoursLabel = (minutes: number) => { const hours = Math.round(minutes / 6) / 10; return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`; };
const hoursText = (value: AvailabilityState[number]) => `${formatTime(value.startTime)} – ${value.endTime === "00:00" ? "midnight" : formatTime(value.endTime)}`;

function DaySheet({ day, value, open, disabled, onClose, onChange }: { day: (typeof DAYS)[number]; value: AvailabilityState[number]; open: boolean; disabled: boolean; onClose: () => void; onChange: (patch: Partial<AvailabilityState[number]>) => void }) {
  const invalid = value.available && !spanOf(value);
  return <QuietSheet open={open} label={day.label} onClose={onClose}>
    <div className="q-nav"><span /><span className="q-nav__t">{day.label}</span><SheetCancel href="/app/availability" className="q-nav__r q-nav__r--b">Done</SheetCancel></div>
    <fieldset className="q-fieldset" disabled={disabled}>
      <legend className="nv-sr">{day.label} availability</legend>
      <ul className="q-list" style={{ marginTop: 16 }}>
        <li><label className="q-row q-row--one">
          <span className="q-rt"><b>Available</b></span>
          <input type="checkbox" role="switch" className="q-tog" aria-label={`${day.label} availability`} checked={value.available} onChange={event => onChange({ available: event.target.checked })} />
        </label></li>
        {value.available ? <>
          <li><label className="q-row q-row--one q-row--picker">
            <span className="q-rt"><b>From</b></span><span className="q-rv q-rv--go" aria-hidden="true">{formatTime(value.startTime)}</span>
            <input className="q-picker" type="time" required aria-label={`${day.label} start time`} value={value.startTime} onClick={event => { try { event.currentTarget.showPicker(); } catch { /* own picker */ } }} onChange={event => onChange({ startTime: event.target.value })} />
          </label></li>
          <li><label className="q-row q-row--one q-row--picker">
            <span className="q-rt"><b>Until</b></span><span className="q-rv q-rv--go" aria-hidden="true">{value.endTime === "00:00" ? "Midnight" : formatTime(value.endTime)}</span>
            <input className="q-picker" type="time" required aria-label={`${day.label} end time`} aria-invalid={invalid || undefined} value={value.endTime} onClick={event => { try { event.currentTarget.showPicker(); } catch { /* own picker */ } }} onChange={event => onChange({ endTime: event.target.value })} />
          </label></li>
        </> : null}
      </ul>
    </fieldset>
    <p className={invalid ? "q-help q-help--alert" : "q-help"} role={invalid ? "alert" : undefined}>{invalid ? "The end time needs to be after the start time." : "An end time of midnight includes the rest of that day."}</p>
  </QuietSheet>;
}

/** UX-E-23: leaving with unsaved hours asks first. A reload or closing the tab gets the browser's own question; a link in
 * the app opens "Discard changes?" with Discard and Keep editing. */
function UnsavedGuard({ dirty }: { dirty: boolean }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState<string | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.closest("dialog") || link.getAttribute("href")?.startsWith("#")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaving(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true); };
  }, [dirty]);
  return <QuietSheet open={leaving !== null} label="Discard changes?" onClose={() => setLeaving(null)}>
    <div className="q-nav"><span /><span className="q-nav__t">Unsaved changes</span><span /></div>
    <div className="q-confirm">
      <p>Discard changes? Your availability wasn’t saved.</p>
      <button type="button" className="q-btn q-btn--sec q-btn--danger" onClick={() => { const to = leaving; setLeaving(null); if (to) router.push(to); }}>Discard</button>
      <button type="button" className="q-btn q-btn--quiet" onClick={() => setLeaving(null)}>Keep editing</button>
    </div>
  </QuietSheet>;
}

function Fields({ initialAvailability, weekStart, locked, status, after, header, notices, back, unset = false }: { initialAvailability: AvailabilityState; weekStart?: string; locked: boolean; status: AvailabilityStatus; after: string; header: { title: string; sub: string }; notices?: ReactNode; back: { href: string; label: string };
  /** UX-E-22: nothing saved yet. Days read "Not set", not "Unavailable", until the person saves. */
  unset?: boolean }) {
  const { pending } = useFormStatus();
  const [availability, setAvailability] = useState(initialAvailability);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const initialSignature = useMemo(() => JSON.stringify(initialAvailability), [initialAvailability]);
  const dirty = JSON.stringify(availability) !== initialSignature;
  const disabled = locked || pending;
  const changedDays = DAYS.filter(day => JSON.stringify(availability[day.dayOfWeek]) !== JSON.stringify(initialAvailability[day.dayOfWeek])).map(day => day.dayOfWeek);
  const availableDays = DAYS.filter(day => availability[day.dayOfWeek].available).length;
  const total = DAYS.reduce((sum, day) => { const span = availability[day.dayOfWeek].available ? spanOf(availability[day.dayOfWeek]) : null; return sum + (span ? span.end - span.start : 0); }, 0);
  const state = dirty ? "Unsaved changes" : status?.label ?? null;
  const offLabel = unset ? "Not set" : "Unavailable";
  const monday = availability[1];
  // UX-E-24: one tap gives Tuesday to Friday Monday's hours.
  function copyMonday() {
    setAvailability(current => ({ ...current, ...Object.fromEntries([2, 3, 4, 5].map(day => [day, { ...current[1] }])) }));
  }
  function updateDay(dayOfWeek: number, patch: Partial<AvailabilityState[number]>) {
    setAvailability(current => ({ ...current, [dayOfWeek]: { ...current[dayOfWeek], ...patch } }));
  }

  return <>
    <div className="q-nav">
      <Link className="q-nav__l" href={back.href}><CaretLeftIcon className="q-ic q-ic--s" aria-hidden="true" />{back.label}</Link><span />
      {/* UX-E-24: one verb, Save, for the usual week and a schedule week. */}
      <EmployeeSubmitButton className="q-nav__r q-nav__r--b" pendingText="Saving…" disabled={locked || (!weekStart && !dirty)}>Save</EmployeeSubmitButton>
    </div>
    <UnsavedGuard dirty={dirty && !pending} />
    <div className="q-hd"><h1>{header.title}</h1><p>{header.sub} · {unset && !dirty ? "Not set" : hoursLabel(total)}{state ? ` · ${state}` : ""}</p></div>
    {notices}
    {weekStart ? <><input type="hidden" name="weekStart" value={weekStart} /><input type="hidden" name="changedDays" value={changedDays.join(",")} /></> : null}
    {/* Every day's fields are always in the form; the day sheets only edit them. */}
    {DAYS.map(day => { const value = availability[day.dayOfWeek]; return value.available ? <span key={day.dayOfWeek} hidden>
      <input type="hidden" name={`available-${day.dayOfWeek}`} value="on" />
      <input type="hidden" name={`start-${day.dayOfWeek}`} value={value.startTime} />
      <input type="hidden" name={`end-${day.dayOfWeek}`} value={value.endTime} />
    </span> : null; })}
    <ul className="q-list" style={{ marginTop: 16 }} aria-label="Availability by day">
      {DAYS.map(day => {
        const value = availability[day.dayOfWeek];
        return <li key={day.dayOfWeek}>
          <button type="button" className="q-row q-row--one q-row--btn" aria-haspopup="dialog" disabled={disabled} onClick={() => setOpenDay(day.dayOfWeek)}
            aria-label={`${day.label}, ${value.available ? (spanOf(value) ? hoursText(value) : "check the hours") : offLabel.toLowerCase()}`}>
            <span className="q-rt"><b>{day.label}</b></span>
            <span className={`q-rv ${value.available ? "q-rv--l" : unset ? "q-rv--ph q-rv--unset" : "q-rv--ph"}`}>{value.available ? (spanOf(value) ? hoursText(value) : "Check the hours") : offLabel}</span>
            <CaretRightIcon className="q-chev" aria-hidden="true" />
          </button>
          <DaySheet day={day} value={value} open={openDay === day.dayOfWeek} disabled={disabled} onClose={() => setOpenDay(null)} onChange={patch => updateDay(day.dayOfWeek, patch)} />
        </li>;
      })}
    </ul>
    {unset && !dirty ? <p className="q-help">Tell your manager when you can work.</p> : null}
    {monday.available && spanOf(monday) && !disabled ? <button type="button" className="q-btn q-btn--quiet" onClick={copyMonday}>Copy Monday to weekdays</button> : null}
    {weekStart && availableDays === 0 && !unset ? <p className="q-help q-help--alert">Saving with every day unavailable tells your manager you cannot work this week.</p> : null}
    {/* The midnight note lives in each day's sheet, once (UX-E-24). */}
    <p className="q-help" role="status" aria-live="polite">{pending ? "Saving your availability…" : locked ? after : dirty ? "You have unsaved changes." : after}</p>
    {dirty && !disabled ? <button type="button" className="q-btn q-btn--quiet" onClick={() => setAvailability(initialAvailability)}>Reset changes</button> : null}
  </>;
}

export function AvailabilitySignatureEditor({ initialAvailability, weekStart, locked = false, status = null, after, header, notices, back = { href: "/app/requests/hub", label: "Requests" }, unset = false }: { initialAvailability: AvailabilityState; weekStart?: string; locked?: boolean; status?: AvailabilityStatus; after: string; header: { title: string; sub: string }; notices?: ReactNode; back?: { href: string; label: string }; unset?: boolean }) {
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
  return <form action={save} onReset={event => event.preventDefault()} className="q-availform" aria-label={weekStart ? "Weekly availability submission" : "Normal availability preferences"}>
    <Fields initialAvailability={initialAvailability} weekStart={weekStart} locked={locked} status={status} after={after} header={header} notices={notices} back={back} unset={unset} />
    {failed ? <p ref={feedback} tabIndex={-1} className="q-help q-help--alert" role="alert">Your availability wasn’t saved. Check your connection and save again. If this keeps happening, <Link href="/login">sign in again</Link>.</p> : null}
  </form>;
}
