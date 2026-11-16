"use client";

import { useEffect, useRef } from "react";

/* Review B4 (Nov 10, 2026, NV-190): the sign-in, recovery, reset and activation forms say what is missing under the field,
 * in the page's language and in Direction B red, instead of the browser's own bubble. Progressive: until this hydrates
 * the browser's validation still stops an empty submit; then the form turns it off and checks the same constraints
 * (required, type, length) itself. Nothing about the request changes and the server still checks everything.
 *
 * A field opts in with data-msg-required (and data-msg-invalid for a wrong format or length), and renders
 * <FieldInvalid id={field id} /> after itself, which aria-describedby lists. */

type Field = HTMLInputElement;

function messageFor(input: Field): string {
  const validity = input.validity;
  if (validity.valid) return "";
  if (validity.valueMissing) return input.dataset.msgRequired ?? "";
  return input.dataset.msgInvalid ?? input.dataset.msgRequired ?? "";
}

function show(input: Field, message: string) {
  const out = document.getElementById(`${input.id}-invalid`);
  if (out) out.textContent = message;
  if (message) { input.setAttribute("aria-invalid", "true"); input.dataset.clientInvalid = "true"; }
  else if (input.dataset.clientInvalid) { delete input.dataset.clientInvalid; input.removeAttribute("aria-invalid"); }
}

/** Mount anywhere inside the form. Renders nothing visible. */
export function AuthValidation() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = marker.current?.closest("form");
    if (!form) return;
    form.noValidate = true;
    const fields = () => [...form.elements].filter((element): element is Field => element instanceof HTMLInputElement && Boolean(element.dataset.msgRequired));
    const onSubmit = (event: Event) => {
      let first: Field | null = null;
      for (const input of fields()) {
        const message = messageFor(input);
        show(input, message);
        if (message && !first) first = input;
      }
      if (!first) return;
      // Stop here: neither the browser nor React's handler sends an incomplete form.
      event.preventDefault();
      event.stopImmediatePropagation();
      first.focus();
    };
    const onInput = (event: Event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement && input.dataset.clientInvalid && !messageFor(input)) show(input, "");
    };
    form.addEventListener("submit", onSubmit, true);
    form.addEventListener("input", onInput);
    return () => { form.removeEventListener("submit", onSubmit, true); form.removeEventListener("input", onInput); form.noValidate = false; };
  }, []);
  return <span ref={marker} hidden />;
}

/** The message line under a field; empty (and hidden by CSS) until the field fails a check. */
export function FieldInvalid({ id }: { id: string }) {
  return <span className="q-auth__invalid" id={`${id}-invalid`} />;
}
