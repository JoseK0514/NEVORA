"use client";

import { useEffect } from "react";

/** Inline validation for every portal form, built on native constraints
 * (required, pattern, min/max, type). Errors appear under the field once the
 * person leaves it or submits, clear as soon as the value becomes valid, and
 * replace the browser's floating bubble so focus lands on the first problem.
 * Server validation remains authoritative; this only reports what the form
 * already declares. */
type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const SKIP = new Set(["hidden", "submit", "button", "reset", "image"]);

function isField(target: EventTarget | null): target is Field {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return false;
  if (target instanceof HTMLInputElement && SKIP.has(target.type)) return false;
  const form = target.form;
  return !!form && !form.noValidate && !!target.closest(".page-frame");
}

/** The label's own words, without nested hints, fields or earlier errors. */
function labelText(field: Field) {
  if (field.dataset.labelText !== undefined) return field.dataset.labelText;
  const label = field.labels?.[0];
  let text = field.getAttribute("aria-label") ?? "";
  if (label) {
    const copy = label.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("input, select, textarea, small, p, .field-error, [aria-hidden='true'], [id$='hint'], [class*='hint']").forEach(node => node.remove());
    text = copy.textContent ?? "";
  }
  // Sentence case for the message, keeping acronyms such as ID and PIN.
  const clean = text.replace(/\s+/g, " ").replace(/\s*\*?\s*\(?(required|optional)\)?\s*$/i, "").trim()
    .split(" ").map(word => /^[A-Z]{2,}$/.test(word) ? word : word.toLowerCase()).join(" ");
  field.dataset.labelText = clean;
  return clean;
}

function message(field: Field) {
  const v = field.validity, label = labelText(field);
  // UX-E-20: a field can say what is wrong in its own words ("Choose your first day off").
  if (v.valueMissing && field.dataset.errorMissing) return field.dataset.errorMissing;
  if (v.rangeUnderflow && field.dataset.errorMin) return field.dataset.errorMin;
  if (v.valueMissing) {
    if (field instanceof HTMLSelectElement) return label ? `Choose ${label}` : "Choose an option";
    if (field instanceof HTMLInputElement && field.type === "radio") return "Choose one to continue";
    if (field instanceof HTMLInputElement && field.type === "checkbox") return "Select this to continue";
    return label ? `Enter ${label}` : "Fill in this field";
  }
  if (v.typeMismatch && field instanceof HTMLInputElement && field.type === "email") return "Enter an email like name@example.com";
  if (v.tooShort && "minLength" in field) return `Use at least ${field.minLength} characters`;
  if (v.rangeUnderflow && field instanceof HTMLInputElement) return `Use ${field.min} or more`;
  if (v.rangeOverflow && field instanceof HTMLInputElement) return `Use ${field.max} or less`;
  if (v.patternMismatch && field.title) return field.title;
  return field.validationMessage;
}

function errorId(field: Field) {
  if (!field.dataset.errorId) field.dataset.errorId = `${field.id || field.name || "field"}-error-${Math.random().toString(36).slice(2, 7)}`;
  return field.dataset.errorId;
}

/** A radio group reports once: its first radio carries the message, and every radio in it is marked invalid and
 * described by that one message (the form used to repeat it under each option). */
function radioGroup(field: Field): HTMLInputElement[] | null {
  if (!(field instanceof HTMLInputElement) || field.type !== "radio" || !field.name || !field.form) return null;
  return Array.from(field.form.elements).filter((item): item is HTMLInputElement => item instanceof HTMLInputElement && item.type === "radio" && item.name === field.name);
}

function show(field: Field) {
  const group = radioGroup(field);
  if (group && group.length > 1) {
    const lead = group[0];
    showOne(lead);
    for (const other of group.slice(1)) {
      other.dataset.errorId = lead.dataset.errorId;
      if (!(other.getAttribute("aria-describedby") ?? "").split(" ").includes(lead.dataset.errorId!)) other.setAttribute("aria-describedby", [other.getAttribute("aria-describedby"), lead.dataset.errorId].filter(Boolean).join(" "));
      other.setAttribute("aria-invalid", "true");
    }
    return;
  }
  showOne(field);
}

function showOne(field: Field) {
  const id = errorId(field);
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement("p");
    node.id = id; node.className = "field-error";
    field.insertAdjacentElement("afterend", node);
    field.setAttribute("aria-describedby", [field.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));
  }
  node.textContent = message(field);
  field.setAttribute("aria-invalid", "true");
}

function clear(field: Field) {
  const group = radioGroup(field);
  if (group && group.length > 1) { for (const item of group) clearOne(item); return; }
  clearOne(field);
}

function clearOne(field: Field) {
  const id = field.dataset.errorId;
  if (!id) return;
  document.getElementById(id)?.remove();
  const rest = (field.getAttribute("aria-describedby") ?? "").split(" ").filter(token => token && token !== id).join(" ");
  if (rest) field.setAttribute("aria-describedby", rest); else field.removeAttribute("aria-describedby");
  field.removeAttribute("aria-invalid");
  delete field.dataset.errorId;
}

export function FormValidation() {
  useEffect(() => {
    let firstInvalid: Field | null = null;
    const onBlur = (event: FocusEvent) => {
      const field = event.target;
      if (!isField(field)) return;
      // A checkbox or radio always has a value, so "untouched" can't be read from it: it's checked on change and submit only.
      if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio") && !field.dataset.errorId) return;
      if (!field.value && !field.dataset.errorId && field.validity.valueMissing) return; // don't nag an untouched empty field
      // validity.valid, not checkValidity(): checkValidity() fires "invalid", which moved focus back into the field (Wave C focus trap).
      if (field.validity.valid) clear(field); else show(field);
    };
    const onInput = (event: Event) => {
      const field = event.target;
      if (isField(field) && field.dataset.errorId && field.validity.valid) clear(field);
      else if (isField(field) && field.dataset.errorId) show(field);
    };
    const onInvalid = (event: Event) => {
      const field = event.target;
      if (!isField(field)) return;
      event.preventDefault(); // replace the floating bubble with the inline message
      show(field);
      if (!firstInvalid) {
        firstInvalid = field;
        // After every invalid event of this submission has fired (microtasks
        // would run between them), focus the first problem in document order.
        setTimeout(() => { firstInvalid?.focus(); firstInvalid = null; }, 0);
      }
    };
    document.addEventListener("focusout", onBlur);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onInput);
    document.addEventListener("invalid", onInvalid, true);
    return () => {
      document.removeEventListener("focusout", onBlur);
      document.removeEventListener("input", onInput);
      document.removeEventListener("change", onInput);
      document.removeEventListener("invalid", onInvalid, true);
    };
  }, []);
  return null;
}
