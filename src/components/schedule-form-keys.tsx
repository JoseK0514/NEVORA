"use client";

import { useEffect, useRef, type ReactNode } from "react";

/* Owner premium (phone-native P9, F2/F3/F5): the keyboard fits the field on the Scheduling rules forms. Client-only; no field,
 * name, value or action changes.
 * - Number fields bring up the number pad: hours (targets, maximums) take a decimal point, counts don't.
 * - Every one-line field gets a Return key label: "next" while another field follows in the same form, "done" on the last,
 *   "search" on search fields. Multi-line fields keep Return for a new line.
 * - Return moves to the next field and never submits; on the last field it closes the keyboard. Saving is the form's
 *   own button. */

const TEXTUAL = 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="file"]):not([type="range"])';
const FIELDS = `${TEXTUAL}, select, textarea`;

function fieldsOf(form: HTMLFormElement | null) {
  return form ? [...form.querySelectorAll<HTMLElement>(FIELDS)].filter(field => !field.hasAttribute("disabled") && !(field as HTMLInputElement).readOnly && field.getClientRects().length > 0) : [];
}

function label(root: HTMLElement) {
  for (const input of root.querySelectorAll<HTMLInputElement>(TEXTUAL)) {
    if (input.type === "number" && !input.hasAttribute("inputmode")) {
      const step = input.getAttribute("step");
      const hours = /target|maximum|hours/i.test(input.name) || (step !== null && step !== "1" && step !== "any" ? Number(step) % 1 !== 0 : false);
      input.setAttribute("inputmode", hours ? "decimal" : "numeric");
    }
    // An authored hint stays; ours is worked out again whenever the form changes (a section opening adds fields).
    if (input.hasAttribute("enterkeyhint") && !input.hasAttribute("data-keys")) continue;
    input.setAttribute("data-keys", "");
    if (input.type === "search") { input.setAttribute("enterkeyhint", "search"); continue; }
    const fields = fieldsOf(input.form);
    input.setAttribute("enterkeyhint", fields.length && fields.at(-1) !== input ? "next" : "done");
  }
}

export function ScheduleFormKeys({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    label(node);
    const observer = new MutationObserver(() => label(node));
    observer.observe(node, { childList: true, subtree: true });
    // A field's hint is checked again as it takes focus (a <details> section may have opened since).
    const focusin = () => label(node);
    node.addEventListener("focusin", focusin);
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.isComposing || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
      const field = event.target as HTMLInputElement;
      if (!(field instanceof HTMLInputElement) || !field.matches(TEXTUAL) || field.type === "search") return;
      event.preventDefault();
      const fields = fieldsOf(field.form);
      const next = fields[fields.indexOf(field) + 1];
      if (next) next.focus();
      else field.blur();
    };
    node.addEventListener("keydown", keydown);
    return () => { observer.disconnect(); node.removeEventListener("keydown", keydown); node.removeEventListener("focusin", focusin); };
  }, []);
  return <div ref={root} className="c-form-keys" style={{ display: "contents" }}>{children}</div>;
}
