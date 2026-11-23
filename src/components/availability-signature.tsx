"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DiscardGuard } from "./kit/discard-dialog";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import type { AvailabilityState } from "@/lib/availability-presets";
import { saveAvailabilityAction, saveWeeklyAvailabilityAction } from "@/app/app/availability/actions";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { availabilityCopy } from "./availability-copy";
import { revealFeedback } from "@/lib/reveal-feedback";
import { EmployeeSubmitButton } from "./employee-submit-button";
import { CorpCard } from "./corp/corp";
import { AvailabilityDayRows, AvailabilityDaySheet, AvailabilityTime } from "./availability-corp";

/* Availability on the corporate kit (Release 1, board E-Availability), the desktop page. One card of seven day rows; a
 * day opens as a sheet with its switch and hours; Save under the card. Same form, field names (available-N, start-N,
 * end-N), hidden week fields, Save/Submit, Reset and failure handling as before. */

/** The seven days, Monday first, in the person's language. */
const daysOf = (words: ReturnType<typeof availabilityCopy>) => words.days.map(([dayOfWeek, label]) => ({ dayOfWeek, label }));

const toMinutes = (time: string) => { const [h, m] = time.split(":").map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : NaN; };
/** Start and end in minutes; an end of midnight runs to the end of the day. */
function spanOf(value: AvailabilityState[number]) {
  const start = toMinutes(value.startTime), raw = toMinutes(value.endTime), end = raw === 0 ? 1440 : raw;
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : null;
}
/** "9:00 AM – 5:00 PM"; an end at midnight is "12:00 AM" (the one time format, Nov 23, 2026). */
const hoursText = (value: AvailabilityState[number], words = availabilityCopy()) => words.range(value.startTime, value.endTime);

export type AvailabilityCard = { label: string; aside?: ReactNode };

function Fields({ initialAvailability, weekStart, locked, card, note }: { initialAvailability: AvailabilityState; weekStart?: string; locked: boolean; card: AvailabilityCard; note: ReactNode }) {
  const { pending } = useFormStatus();
  const words = availabilityCopy(usePortalLang()), t = words.editor, DAYS = daysOf(words);
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
        const hours = value.available ? (spanOf(value) ? hoursText(value, words) : t.checkHours) : null;
        return { key: day.dayOfWeek, name: day.label, hours, label: t.dayLabel(day.label, hours), onOpen: () => setSheet({ day: day.dayOfWeek, open: true }) };
      })} />
    </CorpCard>
    {weekStart && availableDays === 0 ? <p className="c-note c-note--warn">{t.allUnavailable}</p> : null}
    <p className="c-note c-avail__note" role="status" aria-live="polite">{pending ? t.savingAvailability : dirty && !locked ? t.unsaved : note}</p>
    {/* Review F3 (NV-102): the usual week's Save appears once something changed (no disabled bar at rest); a week that is
      due always shows Submit. */}
    {locked || (!weekStart && !dirty) ? null : <EmployeeSubmitButton className="c-btn c-btn--full" pendingText={t.saving}>{weekStart ? t.submitWeek : t.save}</EmployeeSubmitButton>}
    {/* Leaving with hours that are not saved asks first (Jose, Nov 21, 2026); a save in flight and a closed week do not. */}
    <DiscardGuard dirty={dirty && !disabled} />
    {dirty && !disabled ? <button type="button" className="c-avail__link" onClick={() => setAvailability(initialAvailability)}>{t.reset}</button> : null}
    {open && value ? <AvailabilityDaySheet open={!!sheet?.open} onClose={() => setSheet(previous => previous ? { ...previous, open: false } : previous)} day={open.label} closeHref="/app/availability"
      available={value.available} onAvailable={available => updateDay(open.dayOfWeek, { available })} switchLabel={t.switchLabel(open.label)} disabled={disabled}
      footer={<p className={invalid ? "c-error" : "c-note"} role={invalid ? "alert" : undefined}>{invalid ? t.endAfterStart : value.available ? t.midnight : t.unavailableDay}</p>}>
      <div className="c-avail-period"><div className="c-avail-period__pair">
        <AvailabilityTime label={t.from} required aria-label={t.startLabel(open.label)} value={value.startTime} onChange={event => updateDay(open.dayOfWeek, { startTime: event.target.value })} />
        <AvailabilityTime label={t.until} required aria-label={t.endLabel(open.label)} aria-invalid={invalid || undefined} value={value.endTime} onChange={event => updateDay(open.dayOfWeek, { endTime: event.target.value })} />
      </div></div>
    </AvailabilityDaySheet> : null}
  </>;
}

export function AvailabilitySignatureEditor({ initialAvailability, weekStart, locked = false, card, note }: { initialAvailability: AvailabilityState; weekStart?: string; locked?: boolean; card: AvailabilityCard; note: ReactNode }) {
  const t = availabilityCopy(usePortalLang()).editor;
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
  return <form action={save} onReset={event => event.preventDefault()} className="c-avail__form" aria-label={weekStart ? t.weeklyForm : t.usualForm}>
    <Fields initialAvailability={initialAvailability} weekStart={weekStart} locked={locked} card={card} note={note} />
    {failed ? <p ref={feedback} tabIndex={-1} className="c-error" role="alert">{t.failedBefore}<Link href="/login">{t.failedLink}</Link>{t.failedAfter}</p> : null}
  </form>;
}
