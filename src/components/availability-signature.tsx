"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import type { AvailabilityState } from "@/lib/availability-presets";
import { saveAvailabilityAction, saveWeeklyAvailabilityAction } from "@/app/app/availability/actions";
import { formatTime } from "@/lib/date-utils";
import { revealFeedback } from "@/lib/reveal-feedback";
import { EmployeeSubmitButton } from "./employee-submit-button";
import { CorpCard } from "./corp/corp";
import { AvailabilityDayRows, AvailabilityDaySheet, AvailabilityTime } from "./availability-corp";

/* Availability on the corporate kit (Release 1, board E-Availability), the desktop page. One card of seven day rows; a
 * day opens as a sheet with its switch and hours; Save under the card. Same form, field names (available-N, start-N,
 * end-N), hidden week fields, Save/Submit, Reset and failure handling as before. */

const DAYS = [
  { dayOfWeek: 1, label: "Monday" }, { dayOfWeek: 2, label: "Tuesday" }, { dayOfWeek: 3, label: "Wednesday" }, { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" }, { dayOfWeek: 6, label: "Saturday" }, { dayOfWeek: 0, label: "Sunday" },
];

const toMinutes = (time: string) => { const [h, m] = time.split(":").map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : NaN; };
/** Start and end in minutes; an end of midnight runs to the end of the day. */
function spanOf(value: AvailabilityState[number]) {
  const start = toMinutes(value.startTime), raw = toMinutes(value.endTime), end = raw === 0 ? 1440 : raw;
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : null;
}
const hoursText = (value: AvailabilityState[number]) => `${formatTime(value.startTime)} – ${value.endTime === "00:00" ? "midnight" : formatTime(value.endTime)}`;

export type AvailabilityCard = { label: string; aside?: ReactNode };

function Fields({ initialAvailability, weekStart, locked, card, note }: { initialAvailability: AvailabilityState; weekStart?: string; locked: boolean; card: AvailabilityCard; note: ReactNode }) {
  const { pending } = useFormStatus();
  const [availability, setAvailability] = useState(initialAvailability);
  const [sheet, setSheet] = useState<{ day: number; open: boolean } | null>(null);
  const initialSignature = useMemo(() => JSON.stringify(initialAvailability), [initialAvailability]);
  const dirty = JSON.stringify(availability) !== initialSignature;
  const disabled = locked || pending;
  const changedDays = DAYS.filter(day => JSON.stringify(availability[day.dayOfWeek]) !== JSON.stringify(initialAvailability[day.dayOfWeek])).map(day => day.dayOfWeek);
  const availableDays = DAYS.filter(day => availability[day.dayOfWeek].available).length;
  function updateDay(dayOfWeek: number, patch: Partial<AvailabilityState[number]>) {
    setAvailability(current => ({ ...current, [dayOfWeek]: { ...current[dayOfWeek], ...patch } }));
  }
  const open = sheet ? DAYS.find(day => day.dayOfWeek === sheet.day) ?? null : null;
  const value = open ? availability[open.dayOfWeek] : null;
  const invalid = !!value && value.available && !spanOf(value);

  return <>
    {weekStart ? <><input type="hidden" name="weekStart" value={weekStart} /><input type="hidden" name="changedDays" value={changedDays.join(",")} /></> : null}
    {/* Every day's fields are always in the form; the day sheet only edits them. */}
    {DAYS.map(day => { const value = availability[day.dayOfWeek]; return value.available ? <span key={day.dayOfWeek} hidden>
      <input type="hidden" name={`available-${day.dayOfWeek}`} value="on" />
      <input type="hidden" name={`start-${day.dayOfWeek}`} value={value.startTime} />
      <input type="hidden" name={`end-${day.dayOfWeek}`} value={value.endTime} />
    </span> : null; })}
    <CorpCard as="div" ariaLabel={card.label} label={card.label} aside={card.aside}>
      <AvailabilityDayRows days={DAYS.map(day => {
        const value = availability[day.dayOfWeek];
        const hours = value.available ? (spanOf(value) ? hoursText(value) : "Check the hours") : null;
        return { key: day.dayOfWeek, name: day.label, hours, label: `${day.label}, ${hours ?? "not available"}`, onOpen: () => setSheet({ day: day.dayOfWeek, open: true }) };
      })} />
    </CorpCard>
    {weekStart && availableDays === 0 ? <p className="c-note c-note--warn">Submitting with every day unavailable tells your manager you cannot work this week.</p> : null}
    <p className="c-note c-avail__note" role="status" aria-live="polite">{pending ? "Saving your availability…" : dirty && !locked ? "You have unsaved changes." : note}</p>
    {/* Review F3 (NV-102): the usual week's Save appears once something changed (no disabled bar at rest); a week that is
      due always shows Submit. */}
    {locked || (!weekStart && !dirty) ? null : <EmployeeSubmitButton className="c-btn c-btn--full" pendingText="Saving…">{weekStart ? "Submit this week" : "Save"}</EmployeeSubmitButton>}
    {dirty && !disabled ? <button type="button" className="c-avail__link" onClick={() => setAvailability(initialAvailability)}>Reset changes</button> : null}
    {open && value ? <AvailabilityDaySheet open={!!sheet?.open} onClose={() => setSheet(previous => previous ? { ...previous, open: false } : previous)} day={open.label} closeHref="/app/availability"
      available={value.available} onAvailable={available => updateDay(open.dayOfWeek, { available })} switchLabel={`${open.label} availability`} disabled={disabled}
      footer={<p className={invalid ? "c-error" : "c-note"} role={invalid ? "alert" : undefined}>{invalid ? "The end time needs to be after the start time." : value.available ? "An end time of midnight includes the rest of that day." : "Your manager will see you as unavailable on this day."}</p>}>
      <div className="c-avail-period"><div className="c-avail-period__pair">
        <AvailabilityTime label="From" required aria-label={`${open.label} start time`} value={value.startTime} onChange={event => updateDay(open.dayOfWeek, { startTime: event.target.value })} />
        <AvailabilityTime label="Until" required aria-label={`${open.label} end time`} aria-invalid={invalid || undefined} value={value.endTime} onChange={event => updateDay(open.dayOfWeek, { endTime: event.target.value })} />
      </div></div>
    </AvailabilityDaySheet> : null}
  </>;
}

export function AvailabilitySignatureEditor({ initialAvailability, weekStart, locked = false, card, note }: { initialAvailability: AvailabilityState; weekStart?: string; locked?: boolean; card: AvailabilityCard; note: ReactNode }) {
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
  return <form action={save} onReset={event => event.preventDefault()} className="c-avail__form" aria-label={weekStart ? "Weekly availability submission" : "Normal availability preferences"}>
    <Fields initialAvailability={initialAvailability} weekStart={weekStart} locked={locked} card={card} note={note} />
    {failed ? <p ref={feedback} tabIndex={-1} className="c-error" role="alert">Your availability wasn’t saved. Check your connection and save again. If this keeps happening, <Link href="/login">sign in again</Link>.</p> : null}
  </form>;
}
