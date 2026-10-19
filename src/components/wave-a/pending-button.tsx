"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* Wave A form pattern: the submit button says what it is doing while its form is busy.
 * The shared forms (ConfigurationForm, ShiftChangeForm) mark themselves aria-busy and disable their
 * fieldset while a request is out; this button watches that, so those forms stay untouched.
 * Only the button that sent the form changes its words; the others just disable. */
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
    const onSubmit = (event: SubmitEvent) => {
      const submitter = event.submitter;
      sent.current = submitter === button.current || (!submitter && form.querySelectorAll("[type=submit]").length === 1);
    };
    const sync = () => {
      const formBusy = form.getAttribute("aria-busy") === "true";
      setBusy(formBusy && sent.current);
      if (!formBusy) sent.current = false;
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
