"use client";

/* Payroll import and paid-time export (U01): the parts both step-by-step pages share. The frame is the Add employee
 * sheet (the form head is the band, the form is the one white card), as the staff-list import uses it; the parts inside
 * are the Direction B kit (BState, BChip, BButton). Presentation only. */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { CorpFormFooter } from "@/components/corp/corp";
import { BState } from "@/components/owner-b/b-kit";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { FormHead, FormHeadBack, FormHeadLink } from "@/components/team/team-forms";
import { formatPayrollMoney, formatSignedPayrollMoney } from "@/components/payroll/money";
import { dateRange, durationSentence } from "@/lib/duration-format";
import type { PayrollImportCopy, PayrollImportLang } from "./copy";

export type Lang = PayrollImportLang;
export type StepAction = { label: string; onClick?: () => void; href?: string; busy?: boolean;
  /** Why the step can't go on yet. The button stays reachable and says this when pressed. */
  why?: string | null;
  /** Called when it is pressed while it can't go on (to mark the fields that still need an answer). */
  onBlocked?: () => void };

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
/** "Oct 12–18", "Sep 28–Oct 4" (the app's one date-range form), in the page's language ("12–18 oct"). */
export function periodText(startDate: string, endDate: string, locale: string) {
  return dateRange(startDate, endDate, { locale });
}
/** One day: "Tue, Oct 20". */
export const dayText = (date: string, locale: string) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(utcDay(date));
/** A recorded break in the workplace's time zone: when ("Tue, Oct 6 · 12:02 PM – 12:34 PM") and how long ("32 min"). */
export function breakWhen(startAt: string, endAt: string | null, timeZone: string, locale: string) {
  const day = new Intl.DateTimeFormat(locale, { timeZone, weekday: "short", month: "short", day: "numeric" }).format(new Date(startAt));
  const time = (at: string) => new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(at));
  const start = `${day} · ${time(startAt)}`;
  if (!endAt) return { day, when: start, length: null };
  const minutes = Math.round((Date.parse(endAt) - Date.parse(startAt)) / 60_000);
  return { day, when: `${start} – ${time(endAt)}`, length: durationSentence(minutes) };
}
export const money = (minor: string, lang: Lang) => formatPayrollMoney(minor, lang);
export const signedMoney = (minor: string, lang: Lang) => formatSignedPayrollMoney(minor, lang);
/** The size of a signed amount, for "off by $2.50". */
export const absMoney = (minor: string, lang: Lang) => formatPayrollMoney(minor.replace(/^-/, ""), lang);
/** A receipt reference, shortened for reading (the whole value is in its title and is what the server holds). */
export const shortKey = (key: string) => key.slice(0, 8);

/** A row's tinted action: the kit's secondary button dressed as the Direction B row pill. */
export const ROW_GO = "c-btn c-btn--secondary c-btn--md b-rowact b-rowact--go";

export const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
function watchConnection(changed: () => void) {
  window.addEventListener("online", changed); window.addEventListener("offline", changed);
  return () => { window.removeEventListener("online", changed); window.removeEventListener("offline", changed); };
}
export const useOffline = () => useSyncExternalStore(watchConnection, isOffline, () => false);

/** Leaving while a write is unresolved would lose the one safe way to learn its result. */
export function useLeaveGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const hold = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", hold);
    return () => window.removeEventListener("beforeunload", hold);
  }, [active]);
}

/* Cross-mount memory contains only the caller's minimal unresolved-command
 * custody. Private drafts, plans, names and CSV replies are never cached. */
const held = new Map<string, { value: unknown; owner:symbol }>();
export function useHeld<T>(key: string, initial: () => T, keep:(value:T)=>T): [T, (next: T | ((value: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => (held.get(key)?.value as T | undefined) ?? initial());
  const latest = useRef(value),mounted=useRef(false),owner=useRef(Symbol('payroll-flow'));
  useEffect(() => {
    const mine=owner.current;mounted.current=true;held.set(key,{value:keep(latest.current),owner:mine});
    return () => {mounted.current=false;latest.current=keep(latest.current);if(held.get(key)?.owner===mine)held.set(key,{value:latest.current,owner:mine});};
  }, [key,keep]);
  const set = useCallback((next: T | ((value: T) => T)) => {
    if(!mounted.current&&held.get(key)?.owner!==owner.current)return;
    const resolved = typeof next === "function" ? (next as (value: T) => T)(latest.current) : next;
    latest.current = mounted.current?resolved:keep(resolved);held.set(key,{value:keep(latest.current),owner:owner.current});if(mounted.current)setValue(latest.current);
  }, [key,keep]);
  const drop = useCallback(() => { if(held.get(key)?.owner===owner.current)held.delete(key); }, [key]);
  return [value, set, drop];
}

/** The band: the title, the way back, and "Step 2 of 5 · Match people" with its dots. */
export function FlowHead({ copy, title, titleId, back, step, steps, onBack }: { copy: PayrollImportCopy; title: string; titleId: string; back: { href: string; label: string }; step: number; steps: readonly string[]; onBack?: (() => void) | null }) {
  return <FormHead titleId={titleId} title={title} back={back}
    step={step ? <><span className="c-formhead__dots" aria-hidden="true">{steps.map((name, index) => <i key={name} data-on={index < step ? "" : undefined} />)}</span>{copy.common.stepOf(step, steps.length, steps[step - 1])}</> : undefined}
    // Phase 8 (a.md #9): before a step starts (loading, a state, nothing to cancel) the way out is a back link, not Cancel.
    // Premium pass FA (final verification A #12): it names where it goes ("‹ Time exports"), as every other back link does.
    left={onBack ? <FormHeadBack onClick={onBack}>{copy.common.back}</FormHeadBack> : step ? <FormHeadLink href={back.href}>{copy.common.cancel}</FormHeadLink>
      : <Link className="c-formhead__link c-formhead__back" href={back.href}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true" />{back.label}</Link>} />;
}

/** The step's buttons: full-width pills at the end of the card on phones, the card's footer on tablets and desktop (CSS
 * shows one set). The filled button is the step's next action. When the step can't go on, pressing it says why and
 * moves focus to that sentence instead of doing nothing. */
export function StepActions({ id, primary, secondary }: { id: string; primary?: StepAction; secondary?: StepAction }) {
  // "Told" belongs to one sentence on one step: a new step, or a new reason, starts quiet again.
  const why = primary?.why ?? null, sentence = `${id}:${why}`, [toldFor, setToldFor] = useState<string | null>(null), told = toldFor === sentence, whyRef = useRef<HTMLParagraphElement>(null);
  if (!primary && !secondary) return null;
  const press = () => {
    if (!primary || primary.busy) return;
    if (why) { primary.onBlocked?.(); setToldFor(sentence); requestAnimationFrame(() => whyRef.current?.focus()); return; }
    primary.onClick?.();
  };
  const main = (className: string) => !primary ? null : primary.href && !why ? <Link className={className} href={primary.href}>{primary.label}</Link>
    : <button type="button" className={className} onClick={press} aria-disabled={why || primary.busy ? true : undefined} aria-describedby={why ? `${id}-why` : undefined}>{primary.label}</button>;
  const other = (className: string) => !secondary ? null : secondary.href ? <Link className={className} href={secondary.href}>{secondary.label}</Link>
    : <button type="button" className={className} onClick={secondary.onClick} disabled={secondary.busy}>{secondary.label}</button>;
  return <>
    {why ? <p className="pim-why" id={`${id}-why`} ref={whyRef} tabIndex={-1} role={told ? "alert" : undefined} data-told={told || undefined}>{why}</p> : null}
    <div className="pim-actions">{main("b-btn b-btn--teal b-btn--full")}{other("b-btn b-btn--quiet b-btn--full")}</div>
    <CorpFormFooter>{other("c-btn c-btn--secondary")}{main("c-btn")}</CorpFormFooter>
  </>;
}

/** Loading: the card's shape in still bars. */
export function Skeleton({ label }: { label: string }) {
  return <div className="pim-skel" role="status" aria-busy="true" aria-label={label}>
    <span className="pim-skel__bar pim-skel__bar--head" />
    {[72, 54, 64].map(width => <span key={width} className="pim-skel__bar" style={{ width: `${width}%` }} />)}
    <span className="pim-skel__box" />
  </div>;
}

/** A sentence above the step when the device is offline. The work stays; nothing can be sent. */
export function OfflineNote({ copy }: { copy: PayrollImportCopy }) {
  return <BState kind="offline" title={copy.common.offlineTitle} line={copy.common.offlineLine} />;
}

/** A card that says the page can't go on and gives the one way forward. */
export function StopCard({ kind = "locked", title, line, action, alert, children }: { kind?: "locked" | "failed" | "paused" | "empty" | "offline"; title: string; line?: ReactNode; action?: { label: string; href?: string; onClick?: () => void; busy?: boolean; retry?: boolean }; alert?: boolean; children?: ReactNode }) {
  return <BState kind={kind} title={title} line={line} action={action} alert={alert}>{children}</BState>;
}

/** Done, confirmed by the server: the shared page finish (Phase 7, `BState kind="done"`), with the same mark and layout
 * as every other finish and nothing more. The sentences are the flow's own. */
export function DoneCard({ title, line, children }: { title: string; line?: ReactNode; children?: ReactNode }) {
  return <BState kind="done" size="finish" title={title} line={line}>{children}</BState>;
}

/** Puts focus on the step's heading when the step changes (not on first paint). */
export function useStepFocus(step: string | number, headingId: string) {
  const shown = useRef(step);
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    requestAnimationFrame(() => { const heading = document.getElementById(headingId); heading?.focus(); heading?.scrollIntoView?.({ block: "nearest" }); });
  }, [step, headingId]);
}

/** The step's heading: focusable, so a step change can land on it. */
export function StepHeading({ id, children }: { id: string; children: ReactNode }) {
  return <h2 className="pim-h" id={id} tabIndex={-1}>{children}</h2>;
}

/** The one error style: the bold warning glyph, then the sentence (the class on the caller's element colours it). */
export function ErrorText({ children }: { children: ReactNode }) {
  return <><WarningCircleIcon weight="bold" className="pim-error__ic" aria-hidden="true" />{children}</>;
}

/** Save a text file from the page. */
export function download(text: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type })), link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
