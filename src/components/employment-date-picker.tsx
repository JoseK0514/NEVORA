"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { createPortal } from "react-dom";
import { QuietSheet } from "./quiet/quiet-sheet";
import { EARLIEST_EMPLOYMENT_DATE } from "@/lib/employment-dates";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { EMPLOYMENT_DATES_COPY } from "./employment-date-fields-phase3-copy";
import "./employment-date-picker.css";

const firstYear = Number(EARLIEST_EMPLOYMENT_DATE.slice(0, 4));
const iso = (date: Date) => date.toISOString().slice(0, 10);
const utc = (year: number, month: number, day = 1) => new Date(Date.UTC(year, month, day));

/** Keep the form's named, validatable date input. The visible button opens the same calendar for pointer and keyboard. */
export function EmploymentDatePicker({ id, label, name, initial, inputRef, checkOrder }: {
  id: string; label: string; name: string; initial: string; inputRef: RefObject<HTMLInputElement | null>; checkOrder: () => void;
}) {
  const lang = usePortalLang(), t = EMPLOYMENT_DATES_COPY[lang], locale = lang === "es" ? "es-PR" : "en-US";
  const trigger = useRef<HTMLButtonElement>(null);
  const focusDay = useRef(false);
  const [value, setValue] = useState(initial);
  const [view, setView] = useState<Date | null>(null);
  const [yearText, setYearText] = useState("");
  const [errorId, setErrorId] = useState("");
  const fullDate = (date: Date) => date.toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const changeView = (date: Date) => { setView(date); setYearText(String(date.getUTCFullYear())); };
  useLayoutEffect(() => {
    if (focusDay.current && view) {
      focusDay.current = false;
      document.getElementById(id + "-day-" + iso(view))?.focus();
    }
  }, [view, id]);
  function open() {
    trigger.current?.focus({ preventScroll: true });
    const now = new Date();
    changeView(value ? new Date(value + "T00:00:00Z") : utc(now.getFullYear(), now.getMonth(), now.getDate()));
  }
  function close() {
    setView(null);
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  }
  function changed(field: HTMLInputElement) {
    field.setCustomValidity("");
    if (name !== "birthDate") checkOrder();
    setValue(field.value);
  }
  function pick(next: string) {
    const field = inputRef.current;
    if (!field) return;
    field.value = next;
    changed(field);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    close();
  }
  // The shared validator can also mark a server refusal after submit. Keep its message on the visible control.
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    const sync = () => setErrorId(field.getAttribute("aria-invalid") === "true" ? field.dataset.errorId ?? "" : "");
    const observer = new MutationObserver(sync);
    observer.observe(field, { attributes: true, attributeFilter: ["aria-invalid", "aria-describedby"] });
    return () => observer.disconnect();
  }, [inputRef]);

  const year = view?.getUTCFullYear() ?? firstYear, month = view?.getUTCMonth() ?? 0;
  const now = new Date();
  const today = iso(utc(now.getFullYear(), now.getMonth(), now.getDate()));
  const validYear = /^\d{4}$/.test(yearText) && Number(yearText) >= firstYear;
  const visibleText = value ? fullDate(new Date(value + "T00:00:00Z")) : t.choose;
  const monthName = (m: number) => utc(2020, m).toLocaleDateString(locale, { month: "long", timeZone: "UTC" });
  return <>
    <span className="employment-date">
      <button type="button" ref={trigger} id={id + "-button"} className="employment-date__trigger" aria-haspopup="dialog"
        aria-expanded={!!view} aria-labelledby={id + "-label " + id + "-value"} data-invalid={errorId ? true : undefined}
        aria-describedby={[id + "-help", errorId].filter(Boolean).join(" ")} onClick={open} data-empty={!value || undefined}>
        <span id={id + "-value"}>{visibleText}</span><CalendarBlankIcon size={20} aria-hidden="true" />
      </button>
      <input ref={inputRef} id={id} aria-label={label} type="date" name={name} defaultValue={initial} min={EARLIEST_EMPLOYMENT_DATE}
        data-underflow={t.floor} autoComplete="off" tabIndex={-1} aria-hidden="true" aria-describedby={id + "-help"}
        onFocus={() => trigger.current?.focus()} onChange={event => changed(event.currentTarget)} />
    </span>
    {view && createPortal(<QuietSheet open onClose={close} label={label}>
      <div className="employment-calendar" lang={lang}>
        <header><h2>{label.replace(/ \((optional|opcional)\)$/, "")}</h2><button type="button" onClick={close}>{t.cancel}</button></header>
        <div className="employment-calendar__nav">
          <button type="button" aria-label={t.previous} disabled={year === firstYear && month === 0}
            onClick={() => changeView(utc(year, month - 1))}><CaretLeftIcon size={18} /></button>
          <select aria-label={t.month} value={month} onChange={e => changeView(utc(year, Number(e.target.value)))}>
            {Array.from({length: 12}, (_, i) => <option key={i} value={i}>{monthName(i)}</option>)}
          </select>
          <input aria-label={t.year} inputMode="numeric" maxLength={4} value={yearText} onFocus={e => e.target.select()}
            onChange={e => { const next = e.target.value; setYearText(next);
              if (/^\d{4}$/.test(next) && Number(next) >= firstYear) setView(utc(Number(next), month)); }}
            aria-invalid={!validYear || undefined} aria-describedby={!validYear ? id + "-year-floor" : undefined} />
          <button type="button" aria-label={t.next} disabled={year === 9999 && month === 11}
            onClick={() => changeView(utc(year, month + 1))}><CaretRightIcon size={18} /></button>
        </div>
        {!validYear && <p role="status" id={id + "-year-floor"}>{t.floor}</p>}
        <div className="employment-calendar__days">
          {Array.from({length: 7}, (_, i) => <span key={i} aria-hidden="true">{utc(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" })}</span>)}
          {Array.from({length: utc(year, month + 1, 0).getUTCDate()}, (_, i) => {
            const date = utc(year, month, i + 1), next = iso(date);
            return <button key={next} type="button" disabled={!validYear} aria-label={fullDate(date)} aria-pressed={next === value} aria-current={next === today ? "date" : undefined}
              id={id + "-day-" + next} tabIndex={i + 1 === view.getUTCDate() ? 0 : -1}
              onKeyDown={event => {
                const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
                  Home: -date.getUTCDay(), End: 6 - date.getUTCDay() };
                if (!Object.hasOwn(offsets, event.key)) return;
                event.preventDefault();
                const target = utc(year, month, i + 1 + offsets[event.key]);
                if (target.getUTCFullYear() < firstYear || target.getUTCFullYear() > 9999) return;
                focusDay.current = true;
                changeView(target);
              }}
              style={i === 0 ? { gridColumnStart: date.getUTCDay() + 1 } : undefined} onClick={() => pick(next)}>{i + 1}</button>;
          })}
        </div>
        {value && <footer><button type="button" onClick={() => pick("")}>{t.clear}</button></footer>}
      </div>
    </QuietSheet>, document.body)}
  </>;
}
