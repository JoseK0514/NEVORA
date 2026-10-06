"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent } from "react";

type ShiftOption = {
  id: string;
  label: string;
  dateLabel: string;
  timeLabel: string;
  employeeName: string;
  locationName: string;
  positionLabel?:string;
  leadLabel?:string;
};

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function EmployeeShiftPicker({ options, onSelect }: { options: ShiftOption[]; onSelect?:(id:string)=>void }) {
  const enhanced = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const typeahead = useRef({ text: "", time: 0 });
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [placement, setPlacement] = useState({ above: false, maxHeight: 320 });
  const selected = options.find((option) => option.id === value);

  function positionPopup() {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const nav = document.querySelector(".mobile-nav")?.getBoundingClientRect();
    const header = document.querySelector(".mobile-header")?.getBoundingClientRect();
    const bottom = nav?.height ? nav.top : window.innerHeight;
    const below = bottom - rect.bottom - 12;
    const above = rect.top - Math.max(0, header?.height ? header.bottom : 0) - 12;
    const useAbove = below < 160 && above > below;
    setPlacement({ above: useAbove, maxHeight: Math.max(80, Math.min(320, useAbove ? above : below)) });
  }

  function showPicker(index = Math.max(0, options.findIndex((option) => option.id === value))) {
    trigger.current?.focus();
    positionPopup();
    setActive(index);
    setOpen(true);
  }

  function choose(index: number) {
    setValue(options[index].id);
    onSelect?.(options[index].id);
    setInvalid(false);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", positionPopup);
    window.addEventListener("scroll", positionPopup, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", positionPopup);
      window.removeEventListener("scroll", positionPopup, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id, open]);

  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) {
        if (event.key === "Home") showPicker(0);
        else if (event.key === "End" || (event.key === "ArrowUp" && !value)) showPicker(options.length - 1);
        else showPicker();
      } else {
        setActive((index) => event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else showPicker();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab" && open) {
      choose(active);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const previous = now - typeahead.current.time < 700 ? typeahead.current.text : "";
      const text = previous === event.key.toLowerCase() ? previous : previous + event.key.toLowerCase();
      typeahead.current = { text, time: now };
      const index = options.findIndex((option, index) => {
        const candidate = options[(active + index + 1) % options.length];
        return candidate.label.toLowerCase().startsWith(text) || candidate.employeeName.toLowerCase().startsWith(text);
      });
      if (index !== -1) showPicker((active + index + 1) % options.length);
    }
  }

  return (
    <div className="employee-shift-picker" ref={container}>
      <label id={`${id}-label`} htmlFor={enhanced ? `${id}-trigger` : `${id}-native`}>Requested shift</label>
      <div className="employee-shift-picker-control">
        <select
          id={`${id}-native`}
          name="targetShiftId"
          required
          value={value}
          onChange={(event) => {setValue(event.target.value);onSelect?.(event.target.value);}}
          className={enhanced ? "sr-only" : undefined}
          aria-hidden={enhanced ? true : undefined}
          tabIndex={enhanced ? -1 : undefined}
          onInvalid={enhanced ? (event) => {
            event.preventDefault();
            setInvalid(true);
            showPicker();
            trigger.current?.focus();
          } : undefined}
        >
          <option value="" disabled>Select a shift</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>

        {enhanced ? (
          <>
            <button
              ref={trigger}
              id={`${id}-trigger`}
              type="button"
              role="combobox"
              className="employee-shift-picker-trigger"
              aria-labelledby={`${id}-label`}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={`${id}-listbox`}
              aria-activedescendant={open ? `${id}-option-${active}` : undefined}
              aria-required="true"
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? `${id}-error` : undefined}
              onClick={() => open ? setOpen(false) : showPicker()}
              onKeyDown={handleKey}
              onBlur={(event) => {
                if (!container.current?.contains(event.relatedTarget)) setOpen(false);
              }}
            >
              <span className="employee-shift-picker-value">
                {selected ? (
                  <><strong>{selected.timeLabel}</strong><small>{selected.dateLabel} · {selected.employeeName} · {selected.locationName} · {selected.positionLabel} · {selected.leadLabel}</small></>
                ) : <span>Select a shift</span>}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
            </button>

            {open ? (
              <div
                id={`${id}-listbox`}
                role="listbox"
                aria-labelledby={`${id}-label`}
                className={`employee-shift-picker-menu${placement.above ? " above" : ""}`}
                style={{ maxHeight: placement.maxHeight }}
              >
                {options.map((option, index) => (
                  <div
                    id={`${id}-option-${index}`}
                    key={option.id}
                    role="option"
                    aria-selected={active === index}
                    className={`employee-shift-picker-option${active === index ? " active" : ""}`}
                    onPointerDown={(event) => event.preventDefault()}
                    onMouseMove={() => setActive(index)}
                    onClick={() => choose(index)}
                  >
                    <span className="employee-shift-picker-option-copy">
                      <small>{option.dateLabel}</small>
                      <strong>{option.timeLabel}</strong>
                      <span>{option.employeeName} · {option.locationName}</span>{option.positionLabel?<span>{option.positionLabel} · {option.leadLabel}</span>:null}
                    </span>
                    {option.id === value ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      {enhanced && invalid ? <p className="employee-shift-picker-error" id={`${id}-error`} role="alert">Choose a shift to continue.</p> : null}
    </div>
  );
}
