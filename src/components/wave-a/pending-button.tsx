"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { guardSingleSubmit } from "./single-submit";

/* Wave A form pattern: the submit button says what it is doing while its form is busy.
 * The shared forms (ConfigurationForm, ShiftChangeForm) mark themselves aria-busy and disable their
 * fieldset while a request is out; this button watches that, so those forms stay untouched.
 * Only the button that sent the form changes its words; the others just disable. When the request ends, the form's
 * result line is scrolled into view and focused. */
export function PendingButton({ children, pending, kind = "primary", block = false, name, value, disabled = false, label, icon }: {
  children: ReactNode;
  /** What the button says while its form is sending, e.g. "Saving…". */
  pending: ReactNode;
  kind?: "primary" | "secondary" | "danger";
  block?: boolean;
  name?: string;
  value?: string;
  disabled?: boolean;
  /** Accessible name when the visible words need context. */
  label?: string;
  icon?: ReactNode;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const sent = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const form = button.current?.form;
    if (!form) return;
    guardSingleSubmit(form);
    const onSubmit = (event: SubmitEvent) => {
      const submitter = event.submitter;
      sent.current = submitter === button.current || (!submitter && form.querySelectorAll("[type=submit]").length === 1);
      // ST-WA-7, 9, 10: "Sending…" can be a line shorter (large text) or narrower (desktop) than the label; keep the
      // button's size while it shows. offsetWidth/Height are layout sizes, so the press scale (.98) isn't counted.
      // ST-WA-11: the width hold never exceeds the space it has, so a rotation or resize mid-send can't push it out of its card.
      if (sent.current && button.current) { button.current.style.minHeight = `${button.current.offsetHeight}px`; button.current.style.minWidth = `min(${button.current.offsetWidth}px, 100%)`; }
    };
    const sync = () => {
      const formBusy = form.getAttribute("aria-busy") === "true";
      setBusy(formBusy && sent.current);
      if (!formBusy && sent.current) {
        sent.current = false;
        if (button.current) { button.current.style.minHeight = ""; button.current.style.minWidth = ""; }
        // IS-WA-2: the result line sits under the form, often under the tab bar or below the fold. Bring it into view and
        // move focus to it, so the outcome is seen and read (the form's own retry control follows it).
        requestAnimationFrame(() => {
          const result = form.querySelector<HTMLElement>(":scope > [role=alert], :scope > .form-error, :scope > .form-success");
          if (!result) return;
          if (!result.hasAttribute("tabindex")) result.tabIndex = -1;
          result.scrollIntoView({ block: "center" });
          result.focus({ preventScroll: true });
        });
      }
    };
    form.addEventListener("submit", onSubmit, true);
    const observer = new MutationObserver(sync);
    observer.observe(form, { attributes: true, attributeFilter: ["aria-busy"] });
    return () => { form.removeEventListener("submit", onSubmit, true); observer.disconnect(); };
  }, []);

  return (
    <button ref={button} className="nv-btn" data-kind={kind} data-block={block ? "true" : undefined} data-busy={busy ? "true" : undefined}
      type="submit" name={name} value={value} disabled={disabled} aria-label={busy ? undefined : label}>
      {busy ? null : icon}
      <span className="wa-btn__words">{busy ? pending : children}</span>
    </button>
  );
}
